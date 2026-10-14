// src/app/api/games/rare-answer/validate/route.ts
import { NextResponse } from 'next/server';
import { getPromptById } from '@/lib/games/rare-answer/prompts';
import {
  checkLocalAnswer,
  createUnlistedValidResult,
  createUnlistedInvalidResult,
  createUnrecognizedResult,
} from '@/lib/games/rare-answer/validator';

const APINEX_MODEL = process.env.APINEX_MODEL || 'free/gemini-3.8-flash';
const FALLBACK_MODEL = process.env.APINEX_FALLBACK_MODEL || 'free/deepseek-v4.1-flash';

const SYSTEM_JUDGE_PROMPT = `You are a strict factual trivia judge.
Given a prompt and a user's submitted answer, decide whether the answer is factually valid and satisfies all constraints of the prompt.
Answer strictly with JSON:
{
  "isValid": true | false,
  "reason": "1 concise sentence explaining your verdict"
}`;

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { promptId, answer } = body || {};
    if (!promptId || typeof promptId !== 'string' || !answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Missing promptId or answer' },
        { status: 400 }
      );
    }

    const prompt = getPromptById(promptId);
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // 1. Instant local dictionary check (zero-latency, completely deterministic)
    const localResult = checkLocalAnswer(prompt, answer);
    if (localResult !== null) {
      return NextResponse.json({ result: localResult });
    }

    // 2. Unlisted answer: attempt AI validity verification
    const apiKey = process.env.APINEX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        result: createUnrecognizedResult(
          promptId,
          answer,
          'Answer not found in our verified dictionary.'
        ),
      });
    }

    const userPrompt = `Prompt: "${prompt.prompt}"\nConstraints: "${
      prompt.clarification || 'None'
    }"\nSubmitted Answer: "${answer.slice(0, 100)}"`;

    let aiDecision: { isValid: boolean; reason: string } | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch('https://api.apinex.bond/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: APINEX_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_JUDGE_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 120,
          temperature: 0.1,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
        // Strip markdown backticks if any
        const cleaned = rawContent.replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.isValid === 'boolean') {
          aiDecision = {
            isValid: parsed.isValid,
            reason: typeof parsed.reason === 'string' ? parsed.reason : '',
          };
        }
      }
    } catch {
      // AI query timed out or failed - will use graceful fallback below
    }

    // 3. Score determination is strictly code-driven:
    if (aiDecision && aiDecision.isValid) {
      return NextResponse.json({
        result: createUnlistedValidResult(promptId, answer, aiDecision.reason),
      });
    } else if (aiDecision && !aiDecision.isValid) {
      return NextResponse.json({
        result: createUnlistedInvalidResult(promptId, answer, aiDecision.reason),
      });
    }

    // 4. Graceful unverified fallback if AI was unavailable
    return NextResponse.json({
      result: createUnrecognizedResult(
        promptId,
        answer,
        'Answer not found in our verified dictionary.'
      ),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        result: createUnrecognizedResult(
          '',
          '',
          'An error occurred while evaluating this answer.'
        ),
      },
      { status: 200 }
    );
  }
}
