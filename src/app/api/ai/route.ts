import { NextResponse } from "next/server";
import { aiHintCache, checkRateLimit, logAiMetrics } from "@/lib/ai/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

const APINEX_MODEL = "free/gpt-6-luna";
const HINT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_OUTPUT_TOKENS = {
  hint: 120,
  feedback: 150,
  battle_analysis: 150,
  legacy: 150,
};

// Compact system prompts strictly controlled by the server
const SYSTEM_PROMPTS = {
  hint: "You provide 1-2 sentence estimation hints for an estimation game. Never reveal the answer or numerical value. Highlight what real-world factors or scale to consider.",
  feedback: "You provide 2-sentence post-answer feedback for an estimation game. State how the estimate compares to the reference answer factually and constructively. Never change or recalculate the score.",
  battle_analysis: "You provide 1-2 sentence comparative analysis for an estimation battle. Compare players' estimates to the reference answer factually. Do not pick winners or recalculate scores.",
  legacy: "You are a concise estimation game assistant. Keep responses under 2 sentences, factual, and constructive.",
};

interface AiRequestBody {
  task?: 'hint' | 'feedback' | 'battle_analysis';
  // Hint parameters
  questionId?: string;
  questionText?: string;
  unit?: string;
  category?: string;
  difficulty?: string;
  // Feedback parameters
  guess?: number;
  referenceAnswer?: number;
  factor?: number;
  classification?: string;
  hintUsed?: boolean;
  // Battle parameters
  battleId?: string;
  playerEstimates?: Array<{ name: string; guess: number; factor?: number; points?: number }>;
  // Backward compatibility
  message?: string;
  prompt?: string;
}

export async function POST(req: Request) {
  const startTime = Date.now();
  let taskType: 'hint' | 'feedback' | 'battle_analysis' | 'legacy' = 'legacy';

  try {
    // 1. Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || 
               "127.0.0.1";
    
    const rateCheck = checkRateLimit(ip, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      logAiMetrics({
        task: 'legacy',
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
          }
        }
      );
    }

    // 2. Validate request body
    let body: AiRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const apiKey = process.env.APINEX_API_KEY;
    if (!apiKey) {
      console.error("APINEX_API_KEY is missing");
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 }
      );
    }

    let systemPrompt = SYSTEM_PROMPTS.legacy;
    let userPrompt = "";
    let maxTokens = MAX_OUTPUT_TOKENS.legacy;
    let cacheKey: string | null = null;

    // 3. Dispatch task type
    if (body.task === 'hint') {
      taskType = 'hint';
      maxTokens = MAX_OUTPUT_TOKENS.hint;
      systemPrompt = SYSTEM_PROMPTS.hint;

      // Validate inputs
      const qText = typeof body.questionText === 'string' ? body.questionText.slice(0, 300) : '';
      const unit = typeof body.unit === 'string' ? body.unit.slice(0, 50) : '';
      const qId = typeof body.questionId === 'string' ? body.questionId : '';

      if (!qText && !qId) {
        return NextResponse.json({ error: "questionText or questionId is required for hint" }, { status: 400 });
      }

      // Check cache by questionId or questionText hash
      cacheKey = `hint:${APINEX_MODEL}:v1:${qId || qText}`;
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

      userPrompt = `Hint for estimating: "${qText}" (Unit: ${unit || 'units'}). What 1-2 practical factors should be considered?`;

    } else if (body.task === 'feedback') {
      taskType = 'feedback';
      maxTokens = MAX_OUTPUT_TOKENS.feedback;
      systemPrompt = SYSTEM_PROMPTS.feedback;

      const qText = typeof body.questionText === 'string' ? body.questionText.slice(0, 300) : '';
      const unit = typeof body.unit === 'string' ? body.unit.slice(0, 50) : '';
      const guess = typeof body.guess === 'number' ? body.guess : null;
      let referenceAnswer = typeof body.referenceAnswer === 'number' ? body.referenceAnswer : null;

      // If questionId is supplied, verify or fetch reference answer server-side
      if (body.questionId) {
        try {
          const { data: q } = await supabaseAdmin
            .from('questions')
            .select('reference_answer, text, unit')
            .eq('id', body.questionId)
            .single();
          if (q) {
            referenceAnswer = q.reference_answer;
          }
        } catch {
          // Fall back to body referenceAnswer if server query fails
        }
      }

      if (guess === null || referenceAnswer === null) {
        return NextResponse.json({ error: "guess and referenceAnswer are required for feedback" }, { status: 400 });
      }

      const factorStr = body.factor !== undefined ? `${body.factor.toFixed(2)}x` : '';
      const scoreStr = body.classification ? `Classification: ${body.classification}. ` : '';

      userPrompt = `Question: "${qText}" (${unit})\nPlayer guess: ${guess}. Reference answer: ${referenceAnswer}. ${scoreStr}${factorStr ? `Factor: ${factorStr}. ` : ''}Give 2 sentences explaining the estimate magnitude vs reference:`;

    } else if (body.task === 'battle_analysis') {
      taskType = 'battle_analysis';
      maxTokens = MAX_OUTPUT_TOKENS.battle_analysis;
      systemPrompt = SYSTEM_PROMPTS.battle_analysis;

      const qText = typeof body.questionText === 'string' ? body.questionText.slice(0, 300) : '';
      const unit = typeof body.unit === 'string' ? body.unit.slice(0, 50) : '';
      const ref = typeof body.referenceAnswer === 'number' ? body.referenceAnswer : null;
      const estimates = Array.isArray(body.playerEstimates) ? body.playerEstimates.slice(0, 4) : [];

      const summaries = estimates.map(e => `${e.name || 'Player'}: ${e.guess} (factor: ${e.factor ? e.factor.toFixed(2) + 'x' : 'n/a'})`).join(', ');

      userPrompt = `Question: "${qText}" (${unit})\nReference: ${ref ?? 'unspecified'}\nEstimates: ${summaries || 'none'}\nProvide 1-2 concise comparative sentences:`;

    } else {
      // Legacy backward compatibility fallback
      taskType = 'legacy';
      maxTokens = MAX_OUTPUT_TOKENS.legacy;
      const raw = body.message || body.prompt;

      if (!raw || typeof raw !== "string") {
        return NextResponse.json(
          { error: "Invalid request payload. Provide task and required fields, or message." },
          { status: 400 }
        );
      }

      // Cap arbitrary client prompt length to 1000 characters to prevent prompt bloat abuse
      userPrompt = raw.slice(0, 1000);
      systemPrompt = SYSTEM_PROMPTS.legacy;
    }

    // 4. Call APInex with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 25000);

    let apiResponse: Response;
    try {
      apiResponse = await fetch("https://api.apinex.bond/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: APINEX_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      logAiMetrics({
        task: taskType,
        cached: false,
        model: APINEX_MODEL,
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: apiResponse.status,
      });

      return NextResponse.json(
        { error: "AI service request failed", details: data?.error || data },
        { status: apiResponse.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      logAiMetrics({
        task: taskType,
        cached: false,
        model: APINEX_MODEL,
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: 502,
      });

      return NextResponse.json(
        { error: "AI returned an empty response" },
        { status: 502 }
      );
    }

    // 5. Cache hints if successful
    if (taskType === 'hint' && cacheKey) {
      aiHintCache.set(cacheKey, reply, HINT_CACHE_TTL_MS);
    }

    // 6. Record observability metrics
    const usage = data?.usage;
    logAiMetrics({
      task: taskType,
      cached: false,
      model: APINEX_MODEL,
      durationMs: Date.now() - startTime,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
      totalTokens: usage?.total_tokens,
      success: true,
    });

    return NextResponse.json({
      reply,
      response: reply, // backward compatibility with battle client
      cached: false,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
    });

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error("AI route error:", error instanceof Error ? error.message : error);

    logAiMetrics({
      task: taskType,
      cached: false,
      model: APINEX_MODEL,
      durationMs: duration,
      success: false,
      errorCode: error instanceof Error && error.name === "AbortError" ? 504 : 500,
    });

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "AI request timed out after 25 seconds" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal AI service error" },
      { status: 500 }
    );
  }
}