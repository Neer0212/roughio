import { NextResponse } from "next/server";
import {
  aiHintCache,
  aiBattleAnalysisCache,
  pendingBattlePromises,
  buildHintCacheKey,
  checkRateLimit,
  getClientIp,
  logAiMetrics,
} from "@/lib/ai/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatIndianNumber } from "@/lib/utils/number-parser";

const APINEX_MODEL = process.env.APINEX_MODEL || "free/gemini-3.8-flash";
const FALLBACK_MODEL = process.env.APINEX_FALLBACK_MODEL || "free/deepseek-v4.1-flash";
const PROMPT_VERSION = "v3";
const HINT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATTLE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const MAX_OUTPUT_TOKENS = {
  hint: 120,
  feedback: 180,
  battle_analysis: 150,
};

const SYSTEM_PROMPTS = {
  hint: "You provide a concise (1-2 sentences), question-specific estimation hint for an estimation game. Never reveal the numerical answer or exact target. Suggest a practical estimation strategy or breakdown tailored specifically to the entities in the question (e.g. population x per-capita rate, dimensions x volume, or anchoring to a common benchmark).",
  feedback: "You provide concise (2-3 sentences), constructive post-answer feedback for an estimation game. Explain how the player's estimate compares to the reference answer (direction: overestimate or underestimate, and by what factor/order of magnitude), highlight a sensible estimation breakdown, and provide a helpful tip for next time. Format all multi-digit numbers using Indian digit grouping (e.g. 10,000, 25,00,000, 1,00,00,000) and preserve units. Never recalculate or alter the score.",
  battle_analysis: "You provide 1-2 sentence comparative analysis for an estimation battle. Compare players' estimates to the reference answer factually using Indian number formatting for values. Do not pick winners or recalculate scores.",
};

const MAX_BODY_BYTES = 10 * 1024; // 10 KB request size limit

interface AiRequestBody {
  task: 'hint' | 'feedback' | 'battle_analysis';
  questionId?: string;
  guess?: number;
  hintUsed?: boolean;
  battleId?: string;
  roundId?: string;
}

class ProviderError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'ProviderError';
    this.statusCode = statusCode;
  }
}

function generateFallbackHint(question: {
  text: string;
  unit?: string | null;
  category?: string | null;
  hint?: string | null;
  estimation_approach?: string | null;
}): string {
  if (question.hint && question.hint.trim().length > 0) {
    return question.hint.trim();
  }
  if (question.estimation_approach && question.estimation_approach.trim().length > 0) {
    const firstSentence = question.estimation_approach.split(/(?<=[.!?])\s+/)[0]?.trim();
    if (firstSentence && !/\b\d{4,}\b/.test(firstSentence)) {
      return `Consider this breakdown: ${firstSentence}`;
    }
  }
  const unitStr = question.unit ? ` (${question.unit})` : '';
  const categoryStr = question.category ? ` for this ${question.category} estimate` : '';
  return `To calculate this${categoryStr}, try breaking it down into a known baseline and scaling by the relevant frequency or population${unitStr ? ` to reach ${question.unit}` : ''}.`;
}

function generateFallbackFeedback(
  question: { text: string; unit?: string | null; estimation_approach?: string | null },
  guess: number,
  refAnswer: number,
  factor: number
): string {
  const isOver = guess > refAnswer;
  const dir = isOver ? 'overestimated' : 'underestimated';
  const factorStr = `${factor.toFixed(1)}x`;
  const formattedGuess = formatIndianNumber(guess);
  const formattedRef = formatIndianNumber(refAnswer);
  const unit = question.unit ? ` ${question.unit}` : '';

  let breakdownTip = 'A reliable approach is to break the calculation down into a known per-unit baseline and scale by orders of magnitude.';
  if (question.estimation_approach) {
    const firstSentence = question.estimation_approach.split(/(?<=[.!?])\s+/)[0]?.trim();
    if (firstSentence && !/\b\d{4,}\b/.test(firstSentence)) {
      breakdownTip = `Consider: ${firstSentence}`;
    }
  }

  return `You ${dir} by about ${factorStr} (${formattedGuess}${unit} vs. actual ${formattedRef}${unit}). ${breakdownTip} Next time, verify your baseline assumptions and magnitude before submitting.`;
}

async function executeProviderCall(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  timeoutMs = 12000
): Promise<{ reply: string; usage: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const apiResponse = await fetch("https://api.apinex.bond/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    const data = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok) {
      // Sanitized server-side diagnostic logging (never leaked to client)
      console.error(
        `AI provider request failed with status ${apiResponse.status}:`,
        data?.error?.message || data?.error || apiResponse.statusText
      );

      if (apiResponse.status === 429) {
        throw new ProviderError("AI service rate limit exceeded", 429);
      }
      if (apiResponse.status >= 500) {
        throw new ProviderError("AI service temporarily unavailable", 502);
      }
      throw new ProviderError("AI service request failed", 502);
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error("AI provider returned empty response or invalid structure:", data);
      throw new ProviderError("AI service returned an empty response", 502);
    }

    return { reply, usage: data?.usage };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAiWithFallback(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string
): Promise<{ reply: string; usage: any }> {
  try {
    return await executeProviderCall(APINEX_MODEL, systemPrompt, userPrompt, maxTokens, apiKey, 10000);
  } catch (primaryError) {
    if (primaryError instanceof ProviderError && primaryError.statusCode === 429) {
      throw primaryError;
    }
    console.warn(`Primary AI model (${APINEX_MODEL}) failed, trying fallback (${FALLBACK_MODEL}):`, primaryError instanceof Error ? primaryError.message : primaryError);
    try {
      return await executeProviderCall(FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, apiKey, 8000);
    } catch {
      throw primaryError;
    }
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  let taskType: 'hint' | 'feedback' | 'battle_analysis' = 'hint';

  try {
    // 1. Enforce payload size limit before full parsing
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum allowed size is 10 KB." },
        { status: 413 }
      );
    }

    // 2. Process-local Rate Limiting (Single-instance protection)
    const clientIp = getClientIp(req.headers);
    const rateCheck = checkRateLimit(clientIp, 25, 60 * 1000);
    if (!rateCheck.allowed) {
      logAiMetrics({
        task: 'hint',
        cached: false,
        model: APINEX_MODEL,
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: 429,
      });

      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateCheck.resetInMs / 1000).toString(),
          },
        }
      );
    }

    // 3. Read and validate raw request body size
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum allowed size is 10 KB." },
        { status: 413 }
      );
    }

    let body: AiRequestBody;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
    }

    // Task validation - reject arbitrary client messages or missing tasks
    if (!body.task || !['hint', 'feedback', 'battle_analysis'].includes(body.task)) {
      return NextResponse.json(
        { error: "Invalid or missing 'task'. Must be one of: 'hint', 'feedback', 'battle_analysis'." },
        { status: 400 }
      );
    }

    taskType = body.task;

    const apiKey = process.env.APINEX_API_KEY;
    if (!apiKey) {
      console.error("APINEX_API_KEY is missing");
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();
    let userPrompt = "";
    let systemPrompt = SYSTEM_PROMPTS[taskType];
    const maxTokens = MAX_OUTPUT_TOKENS[taskType];
    let cacheKey: string | null = null;
    let loadedQuestion: any = null;
    let guessVal: number | null = null;
    let refAnswerVal: number | null = null;
    let factorVal: number | null = null;

    // ==========================================
    // 4. TASK 1: HINT
    // ==========================================
    if (taskType === 'hint') {
      const qId = body.questionId;
      if (!qId || typeof qId !== "string" || qId.length > 100) {
        return NextResponse.json(
          { error: "Valid 'questionId' is required for hint requests" },
          { status: 400 }
        );
      }

      // Load authoritative question from Supabase
      const { data: question, error: qError } = await admin
        .from('questions')
        .select('id, text, unit, category, difficulty, hint, estimation_approach')
        .eq('id', qId)
        .single();

      if (qError || !question) {
        return NextResponse.json(
          { error: "Question not found in database" },
          { status: 404 }
        );
      }

      loadedQuestion = question;

      // Cache lookup with content-hashed key to prevent stale hints
      cacheKey = buildHintCacheKey(
        APINEX_MODEL,
        PROMPT_VERSION,
        question.id,
        question.text,
        question.unit || 'units'
      );

      const cachedHint = aiHintCache.get(cacheKey);
      if (cachedHint) {
        logAiMetrics({
          task: 'hint',
          cached: true,
          model: APINEX_MODEL,
          durationMs: Date.now() - startTime,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          success: true,
        });

        return NextResponse.json({
          reply: cachedHint,
          response: cachedHint,
          cached: true,
        });
      }

      userPrompt = [
        `Question: "${question.text.slice(0, 300)}"`,
        `Category: ${question.category || 'General'}, Difficulty: ${question.difficulty || 'Medium'}, Unit: ${question.unit || 'units'}`,
        question.estimation_approach ? `Key estimation factor context: ${question.estimation_approach.slice(0, 200)}` : '',
        `Task: Provide a 1-2 sentence hint suggesting a practical breakdown or anchor strategy to estimate this quantity. Do NOT reveal the numerical answer or exact target.`,
      ].filter(Boolean).join('\n');

    // ==========================================
    // 5. TASK 2: FEEDBACK
    // ==========================================
    } else if (taskType === 'feedback') {
      const qId = body.questionId;
      if (!qId || typeof qId !== "string" || qId.length > 100) {
        return NextResponse.json(
          { error: "Valid 'questionId' is required for feedback requests" },
          { status: 400 }
        );
      }

      const guess = body.guess;
      if (typeof guess !== 'number' || !Number.isFinite(guess) || guess <= 0 || guess > 1e18) {
        return NextResponse.json(
          { error: "Invalid 'guess'. Must be a finite positive number within valid bounds." },
          { status: 400 }
        );
      }

      // Authoritative lookup: NEVER trust client-provided reference answers
      const { data: question, error: qError } = await admin
        .from('questions')
        .select('id, text, unit, reference_answer, category, difficulty, hint, estimation_approach')
        .eq('id', qId)
        .single();

      if (qError || !question) {
        return NextResponse.json(
          { error: "Question not found in database. Cannot generate feedback." },
          { status: 404 }
        );
      }

      const refAnswer = question.reference_answer;
      if (typeof refAnswer !== 'number' || !Number.isFinite(refAnswer) || refAnswer <= 0) {
        return NextResponse.json(
          { error: "Invalid or non-positive reference answer in database" },
          { status: 400 }
        );
      }

      const factor = Math.max(guess / refAnswer, refAnswer / guess);
      if (!Number.isFinite(factor) || factor <= 0) {
        return NextResponse.json(
          { error: "Invalid calculation: computed factor must be a finite positive number" },
          { status: 400 }
        );
      }

      loadedQuestion = question;
      guessVal = guess;
      refAnswerVal = refAnswer;
      factorVal = factor;

      const factorStr = `${factor.toFixed(2)}x`;
      const isOver = guess > refAnswer;
      const formattedGuess = formatIndianNumber(guess);
      const formattedRef = formatIndianNumber(refAnswer);

      userPrompt = [
        `Question: "${question.text.slice(0, 300)}"`,
        `Category: ${question.category || 'General'}, Difficulty: ${question.difficulty || 'Medium'}`,
        `Player guess: ${formattedGuess} ${question.unit || 'units'}`,
        `Reference answer: ${formattedRef} ${question.unit || 'units'}`,
        `Direction: ${isOver ? 'Overestimate' : 'Underestimate'} by a factor of ${factorStr}.`,
        question.estimation_approach ? `Authoritative estimation approach context: ${question.estimation_approach.slice(0, 250)}` : '',
        `Task: Write 2-3 concise sentences explaining:`,
        `1) How the estimate compares to the reference answer (${isOver ? 'over' : 'under'} by ${factorStr}),`,
        `2) A sensible estimation breakdown they could have used,`,
        `3) A brief tip for next time.`,
        `Format all multi-digit numbers using Indian digit grouping (e.g. 10,000, 25,00,000, 1,00,00,000) and preserve units. Do not recalculate score.`,
      ].filter(Boolean).join('\n');

    // ==========================================
    // 6. TASK 3: BATTLE ANALYSIS
    // ==========================================
    } else if (taskType === 'battle_analysis') {
      const battleId = body.battleId;
      const roundId = body.roundId;

      if (!battleId || typeof battleId !== 'string' || !roundId || typeof roundId !== 'string' || battleId.length > 100 || roundId.length > 100) {
        return NextResponse.json(
          { error: "Valid 'battleId' and 'roundId' are required for battle analysis." },
          { status: 400 }
        );
      }

      // 1. Authoritative round lookup & validation in database FIRST
      // Never serve cache or deduplicate before DB validation confirms round is valid and revealed
      const { data: roundData, error: roundError } = await admin
        .from('battle_rounds')
        .select('id, status, question_id, questions(id, text, unit, reference_answer)')
        .eq('id', roundId)
        .eq('battle_id', battleId)
        .single();

      if (roundError || !roundData) {
        return NextResponse.json(
          { error: "Battle round not found" },
          { status: 404 }
        );
      }

      if (roundData.status !== 'revealed') {
        return NextResponse.json(
          { error: "Round is not yet revealed" },
          { status: 400 }
        );
      }

      // Applicable authorization/battle-membership checks:
      // If client has an authenticated session, verify the user is a participant of this battle
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: membership, error: mError } = await admin
            .from('battle_players')
            .select('user_id')
            .eq('battle_id', battleId)
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (mError || !membership) {
            return NextResponse.json(
              { error: "Forbidden: not a participant of this battle" },
              { status: 403 }
            );
          }
        }
      } catch {
        // Safe fallback in environments without cookie support (e.g. testing)
      }

      const battleCacheKey = `battle:${battleId}:${roundId}`;

      // 2. Cache check AFTER authoritative database validation
      const cachedAnalysis = aiBattleAnalysisCache.get(battleCacheKey);
      if (cachedAnalysis) {
        logAiMetrics({
          task: 'battle_analysis',
          cached: true,
          model: APINEX_MODEL,
          durationMs: Date.now() - startTime,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          success: true,
        });

        return NextResponse.json({
          reply: cachedAnalysis,
          response: cachedAnalysis,
          cached: true,
        });
      }

      // 3. In-flight single-promise deduplication per battle round
      let battlePromise = pendingBattlePromises.get(battleCacheKey);
      let isLeader = false;

      if (!battlePromise) {
        isLeader = true;

        const generateAnalysisPromise = (async (): Promise<{ reply: string; usage: any }> => {
          const q: any = Array.isArray(roundData.questions) ? roundData.questions[0] : roundData.questions;
          if (!q || !q.text) {
            throw new Error("Question not found for round");
          }

          const { data: dbGuesses } = await admin
            .from('battle_guesses')
            .select('user_id, guess, factor, points_awarded')
            .eq('round_id', roundId);

          const summaries = (dbGuesses || []).map((g, idx) => {
            const factorStr = typeof g.factor === 'number' && Number.isFinite(g.factor)
              ? `${g.factor.toFixed(2)}x`
              : 'n/a';
            return `Player ${idx + 1}: ${g.guess} (factor: ${factorStr})`;
          }).join(', ');

          const battlePrompt = `Question: "${q.text.slice(0, 300)}" (${q.unit || 'units'})\nReference: ${q.reference_answer}\nEstimates: ${summaries || 'none'}\nProvide 1-2 concise comparative sentences:`;

          return executeProviderCall(
            APINEX_MODEL,
            systemPrompt,
            battlePrompt,
            maxTokens,
            apiKey
          );
        })();

        const newPromise = generateAnalysisPromise.finally(() => {
          if (pendingBattlePromises.get(battleCacheKey) === newPromise) {
            pendingBattlePromises.delete(battleCacheKey);
          }
        });

        // Prevent unhandled rejections on this in-flight promise chain
        newPromise.catch(() => {});

        pendingBattlePromises.set(battleCacheKey, newPromise);
        battlePromise = newPromise;
      }

      const result = await battlePromise;

      // Only cache successful battle analysis once leader finishes
      if (isLeader) {
        aiBattleAnalysisCache.set(battleCacheKey, result.reply, BATTLE_CACHE_TTL_MS);
      }

      const promptTokens = typeof result.usage?.prompt_tokens === 'number' ? result.usage.prompt_tokens : null;
      const completionTokens = typeof result.usage?.completion_tokens === 'number' ? result.usage.completion_tokens : null;
      const reasoningTokens = typeof result.usage?.completion_tokens_details?.reasoning_tokens === 'number'
        ? result.usage.completion_tokens_details.reasoning_tokens
        : null;
      const totalTokens = typeof result.usage?.total_tokens === 'number' ? result.usage.total_tokens : null;

      logAiMetrics({
        task: 'battle_analysis',
        cached: !isLeader,
        model: APINEX_MODEL,
        durationMs: Date.now() - startTime,
        promptTokens,
        completionTokens,
        reasoningTokens,
        totalTokens,
        success: true,
      });

      return NextResponse.json({
        reply: result.reply,
        response: result.reply,
        cached: !isLeader,
        usage: result.usage ? {
          promptTokens,
          completionTokens,
          reasoningTokens,
          totalTokens,
        } : undefined,
      });
    }

    // ==========================================
    // 7. DISPATCH TO APINEX (FOR HINT AND FEEDBACK)
    // ==========================================
    let result: { reply: string; usage: any };
    try {
      result = await callAiWithFallback(
        systemPrompt,
        userPrompt,
        maxTokens,
        apiKey
      );

      // Cache successful hints
      if (taskType === 'hint' && cacheKey) {
        aiHintCache.set(cacheKey, result.reply, HINT_CACHE_TTL_MS);
      }
    } catch (dispatchErr) {
      console.warn(`AI provider call failed for ${taskType}, using question-specific fallback:`, dispatchErr instanceof Error ? dispatchErr.message : dispatchErr);
      if (taskType === 'hint' && loadedQuestion) {
        result = { reply: generateFallbackHint(loadedQuestion), usage: undefined };
      } else if (taskType === 'feedback' && loadedQuestion && guessVal !== null && refAnswerVal !== null && factorVal !== null) {
        result = { reply: generateFallbackFeedback(loadedQuestion, guessVal, refAnswerVal, factorVal), usage: undefined };
      } else {
        throw dispatchErr;
      }
    }

    const { reply, usage } = result;
    const promptTokens = typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null;
    const completionTokens = typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null;
    const reasoningTokens = typeof usage?.completion_tokens_details?.reasoning_tokens === 'number' 
      ? usage.completion_tokens_details.reasoning_tokens 
      : null;
    const totalTokens = typeof usage?.total_tokens === 'number' ? usage.total_tokens : null;

    logAiMetrics({
      task: taskType,
      cached: false,
      model: APINEX_MODEL,
      durationMs: Date.now() - startTime,
      promptTokens,
      completionTokens,
      reasoningTokens,
      totalTokens,
      success: true,
    });

    return NextResponse.json({
      reply,
      response: reply,
      cached: false,
      usage: usage ? {
        promptTokens,
        completionTokens,
        reasoningTokens,
        totalTokens,
      } : undefined,
    });

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error("AI route error:", error instanceof Error ? error.message : error);

    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("timed out"))) {
      logAiMetrics({
        task: taskType,
        cached: false,
        model: APINEX_MODEL,
        durationMs: duration,
        success: false,
        errorCode: 504,
      });

      return NextResponse.json(
        { error: "AI request timed out" },
        { status: 504 }
      );
    }

    if (error instanceof ProviderError) {
      logAiMetrics({
        task: taskType,
        cached: false,
        model: APINEX_MODEL,
        durationMs: duration,
        success: false,
        errorCode: error.statusCode,
      });

      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logAiMetrics({
      task: taskType,
      cached: false,
      model: APINEX_MODEL,
      durationMs: duration,
      success: false,
      errorCode: 500,
    });

    return NextResponse.json(
      { error: "Internal AI service error" },
      { status: 500 }
    );
  }
}