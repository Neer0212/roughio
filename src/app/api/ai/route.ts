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

const APINEX_MODEL = "free/gpt-6-luna";
const PROMPT_VERSION = "v2";
const HINT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATTLE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const MAX_OUTPUT_TOKENS = {
  hint: 120,
  feedback: 150,
  battle_analysis: 150,
};

const SYSTEM_PROMPTS = {
  hint: "You provide 1-2 sentence estimation hints for an estimation game. Never reveal the answer or numerical value. Highlight what real-world factors or scale to consider.",
  feedback: "You provide 2-sentence post-answer feedback for an estimation game. State how the estimate compares to the reference answer factually and constructively. Never change or recalculate the score.",
  battle_analysis: "You provide 1-2 sentence comparative analysis for an estimation battle. Compare players' estimates to the reference answer factually. Do not pick winners or recalculate scores.",
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

async function executeProviderCall(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string
): Promise<{ reply: string; usage: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 25000);

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
        .select('id, text, unit')
        .eq('id', qId)
        .single();

      if (qError || !question) {
        return NextResponse.json(
          { error: "Question not found in database" },
          { status: 404 }
        );
      }

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

      userPrompt = `Hint for estimating: "${question.text.slice(0, 300)}" (Unit: ${question.unit || 'units'}). What 1-2 practical factors should be considered?`;

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
        .select('id, text, unit, reference_answer')
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

      const factorStr = `${factor.toFixed(2)}x`;
      userPrompt = `Question: "${question.text.slice(0, 300)}" (${question.unit || 'units'})\nPlayer guess: ${guess}. Reference answer: ${refAnswer}. Factor: ${factorStr}.\nGive 2 sentences explaining the estimate magnitude vs reference:`;

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
    const result = await executeProviderCall(
      APINEX_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens,
      apiKey
    );

    // Cache successful hints
    if (taskType === 'hint' && cacheKey) {
      aiHintCache.set(cacheKey, result.reply, HINT_CACHE_TTL_MS);
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