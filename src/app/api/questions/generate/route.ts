import { NextResponse } from "next/server";
import { generateQuestionBatch, VALID_CATEGORIES, VALID_DIFFICULTIES } from "@/lib/ai/question-generator";
import { checkRateLimit, getClientIp } from "@/lib/ai/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`gen:${clientIp}`, 10, 60 * 1000); // 10 batch gens per minute max
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many question generation requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": Math.ceil(rateCheck.resetInMs / 1000).toString() } }
      );
    }

    let body: any = {};
    try {
      const text = await req.text();
      if (text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    const count = typeof body.count === "number" ? Math.max(1, Math.min(body.count, 4)) : 2;
    const category = typeof body.category === "string" ? body.category : null;
    const difficulty = typeof body.difficulty === "string" ? body.difficulty : null;

    if (category && !VALID_CATEGORIES.includes(category.toLowerCase() as any)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty.toLowerCase() as any)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await generateQuestionBatch({
      count,
      category,
      difficulty,
    });

    return NextResponse.json({
      success: true,
      savedCount: result.savedCount,
      questions: result.questions.map((q) => ({
        id: q.id,
        text: q.text,
        unit: q.unit,
        category: q.category,
        difficulty: q.difficulty,
        hint: q.hint,
        sourceName: q.source_name,
        isAiGenerated: q.is_ai_generated,
        createdAt: q.created_at,
      })),
    });
  } catch (err: any) {
    console.error("AI question generation API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate AI questions" },
      { status: 502 }
    );
  }
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { count, error } = await admin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_ai_generated", true);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch question pool metrics" }, { status: 500 });
    }

    return NextResponse.json({
      activeAiQuestionsCount: count || 0,
      supportedCategories: VALID_CATEGORIES,
      supportedDifficulties: VALID_DIFFICULTIES,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
