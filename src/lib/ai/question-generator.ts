import type { CategoryId, Difficulty } from "@/lib/types/game";

let cachedAdmin: any = null;
async function getAdminClient() {
  if (cachedAdmin) return cachedAdmin;
  try {
    const mod = await import("@/lib/supabase/admin");
    cachedAdmin = mod.getSupabaseAdmin();
    return cachedAdmin;
  } catch {
    const mod = await import(String("../supabase/admin.ts"));
    cachedAdmin = mod.getSupabaseAdmin();
    return cachedAdmin;
  }
}

export const VALID_CATEGORIES: CategoryId[] = [
  "technology",
  "science",
  "geography",
  "cities",
  "business",
  "sports",
  "gaming",
  "history",
  "nature",
  "space",
  "everyday",
  "food",
  "animals",
  "infrastructure",
  "absurd",
];

export const VALID_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "unhinged"];

export interface ValidatedFermiQuestion {
  text: string;
  referenceAnswer: number;
  unit: string;
  unitPlural?: string;
  category: CategoryId;
  difficulty: Difficulty;
  explanation: string;
  estimationApproach: string;
  hint: string;
  sourceName?: string;
  tags?: string[];
}

export interface GenerationOptions {
  count?: number;
  category?: CategoryId | string | null;
  difficulty?: Difficulty | string | null;
  timeoutMs?: number;
  apiKey?: string;
}

// In-flight promise map for deduplicating simultaneous generation requests
let inFlightBatchPromise: Promise<{ questions: any[]; savedCount: number }> | null = null;

/**
 * Normalizes question text for duplicate detection (lowercase, stripped punctuation, collapsed whitespace).
 */
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Robust JSON array extractor from LLM responses (handles raw JSON, code blocks, extra whitespace).
 */
export function extractJsonArray(rawContent: string): any[] {
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Empty response content from AI provider");
  }

  let cleaned = rawContent.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Find array bounds [ ... ]
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("AI provider response did not contain a JSON array");
  }

  return parsed;
}

/**
 * Strict server-side validation for an AI-generated Fermi question candidate.
 */
export function validateFermiQuestion(
  candidate: any,
  existingNormalizedTexts?: Set<string>
): { valid: true; question: ValidatedFermiQuestion } | { valid: false; reason: string } {
  if (!candidate || typeof candidate !== "object") {
    return { valid: false, reason: "Candidate is not an object" };
  }

  // 1. Text validation
  if (typeof candidate.text !== "string") {
    return { valid: false, reason: "Question text must be a string" };
  }
  const text = candidate.text.trim();
  if (text.length < 15 || text.length > 300) {
    return { valid: false, reason: `Question text length (${text.length}) out of bounds (15-300)` };
  }
  if (!text.endsWith("?")) {
    return { valid: false, reason: "Question text must end with a question mark" };
  }

  // Reject common AI chatter / meta-prompt leakage
  const lowerText = text.toLowerCase();
  if (
    lowerText.startsWith("sure") ||
    lowerText.startsWith("here is") ||
    lowerText.includes("as an ai") ||
    lowerText.includes("fermi question:")
  ) {
    return { valid: false, reason: "Question text contains meta-prompt artifacts" };
  }

  // 2. Duplicate detection
  const normalized = normalizeQuestionText(text);
  if (existingNormalizedTexts && existingNormalizedTexts.has(normalized)) {
    return { valid: false, reason: "Duplicate question text detected" };
  }

  // 3. Numeric Reference Answer validation
  const rawAnswer = candidate.referenceAnswer ?? candidate.reference_answer;
  if (typeof rawAnswer !== "number" || !Number.isFinite(rawAnswer)) {
    return { valid: false, reason: "referenceAnswer must be a finite number" };
  }
  if (rawAnswer <= 0) {
    return { valid: false, reason: "referenceAnswer must be strictly positive" };
  }
  if (rawAnswer > 1e16) {
    return { valid: false, reason: "referenceAnswer is impossibly large (> 1e16)" };
  }

  // Fermi estimates must avoid false precision:
  // Numbers >= 100 should not have gratuitous decimal places (e.g. 43,219.872)
  let referenceAnswer = rawAnswer;
  if (referenceAnswer >= 100) {
    referenceAnswer = Math.round(referenceAnswer);
  } else if (referenceAnswer >= 1) {
    referenceAnswer = Math.round(referenceAnswer * 100) / 100;
  }

  // 4. Unit validation
  if (typeof candidate.unit !== "string" || candidate.unit.trim().length === 0) {
    return { valid: false, reason: "unit must be a non-empty string" };
  }
  const unit = candidate.unit.trim().slice(0, 40);

  // 5. Category validation
  let category: CategoryId = "everyday";
  if (typeof candidate.category === "string") {
    const catLower = candidate.category.trim().toLowerCase() as CategoryId;
    if (VALID_CATEGORIES.includes(catLower)) {
      category = catLower;
    } else {
      // Map common synonyms
      if (catLower.includes("tech")) category = "technology";
      else if (catLower.includes("geo")) category = "geography";
      else if (catLower.includes("sci")) category = "science";
      else if (catLower.includes("bus") || catLower.includes("econ")) category = "business";
    }
  }

  // 6. Difficulty validation
  let difficulty: Difficulty = "medium";
  if (typeof candidate.difficulty === "string") {
    const diffLower = candidate.difficulty.trim().toLowerCase() as Difficulty;
    if (VALID_DIFFICULTIES.includes(diffLower)) {
      difficulty = diffLower;
    }
  }

  // 7. Explanation & Estimation Approach validation
  const explanation =
    typeof candidate.explanation === "string" ? candidate.explanation.trim() : "";
  if (explanation.length < 15 || explanation.length > 800) {
    return { valid: false, reason: `explanation length (${explanation.length}) out of bounds (15-800)` };
  }

  const estimationApproach =
    typeof candidate.estimationApproach === "string"
      ? candidate.estimationApproach.trim()
      : typeof candidate.estimation_approach === "string"
      ? candidate.estimation_approach.trim()
      : "";
  if (estimationApproach.length < 15 || estimationApproach.length > 800) {
    return {
      valid: false,
      reason: `estimationApproach length (${estimationApproach.length}) out of bounds (15-800)`,
    };
  }

  // 8. Hint validation
  const hint = typeof candidate.hint === "string" ? candidate.hint.trim() : "";
  if (hint.length < 10 || hint.length > 300) {
    return { valid: false, reason: `hint length (${hint.length}) out of bounds (10-300)` };
  }

  // Hint must not explicitly give away the exact numeric answer
  if (referenceAnswer > 10 && hint.includes(String(referenceAnswer))) {
    return { valid: false, reason: "hint reveals the exact numeric answer" };
  }

  return {
    valid: true,
    question: {
      text,
      referenceAnswer,
      unit,
      unitPlural: candidate.unitPlural || candidate.unit_plural || undefined,
      category,
      difficulty,
      explanation,
      estimationApproach,
      hint,
      sourceName: candidate.sourceName || candidate.source_name || "AI Estimation Analysis",
      tags: Array.isArray(candidate.tags) ? candidate.tags : [category, "fermi", "ai-generated"],
    },
  };
}

/**
 * Generates a batch of validated Fermi estimation questions and persists them in the database.
 */
export async function generateQuestionBatch(
  options: GenerationOptions = {}
): Promise<{ questions: any[]; savedCount: number }> {
  // Reuse existing in-flight promise if a request is already running
  if (inFlightBatchPromise) {
    return inFlightBatchPromise;
  }

  const batchSize = Math.max(1, Math.min(options.count || 2, 4));
  const apiKey = options.apiKey || process.env.APINEX_API_KEY;
  const timeoutMs = options.timeoutMs || 15000;
  const model = process.env.APINEX_MODEL || "free/gemini-3.8-flash";

  if (!apiKey) {
    throw new Error("AI provider configuration missing: APINEX_API_KEY is not defined");
  }

  const currentPromise = (async () => {
    const admin = await getAdminClient();

    // 1. Fetch recent questions from DB to build duplicate avoidance list
    const { data: recentQuestions } = await admin
      .from("questions")
      .select("text")
      .order("created_at", { ascending: false })
      .limit(200);

    const existingTexts = new Set<string>();
    if (recentQuestions) {
      for (const q of recentQuestions) {
        if (q.text) existingTexts.add(normalizeQuestionText(q.text));
      }
    }

    const categoryConstraint = options.category
      ? `Focused primarily on the category: "${options.category}".`
      : `Draw from varied categories: ${VALID_CATEGORIES.slice(0, 8).join(", ")}.`;

    const systemPrompt = [
      "You are an expert Fermi problem designer for the estimation game Roughio.",
      `Generate EXACTLY a JSON array of ${batchSize} original, engaging Fermi estimation questions.`,
      "Rules for every question:",
      "1. 'text': A clear, quantitative real-world estimation question ending with '?' (e.g. 'How many commercial airplanes are airborne simultaneously worldwide?').",
      "2. 'referenceAnswer': Realistic numeric estimate (positive number). Do NOT use false precision; use realistic order-of-magnitude estimates.",
      "3. 'unit': Sensible unit of measure (e.g. 'planes', 'gallons', 'kg', 'people').",
      "4. 'category': One of: " + VALID_CATEGORIES.join(", ") + ".",
      "5. 'difficulty': One of: easy, medium, hard, unhinged.",
      "6. 'explanation': 2-3 sentences providing real-world facts and backing up the reference estimate.",
      "7. 'estimationApproach': 1-2 sentences outlining the classic Fermi breakdown (e.g. population × rate ÷ efficiency).",
      "8. 'hint': A 1-2 sentence hint suggesting a practical breakdown anchor without revealing the answer.",
      "Output MUST be a valid JSON array only. Do not include markdown or conversational commentary outside the JSON.",
    ].join("\n");

    const userPrompt = [
      `Generate ${batchSize} fresh, original Fermi estimation questions.`,
      categoryConstraint,
      options.difficulty ? `Target difficulty: ${options.difficulty}.` : "",
      "Ensure diverse topics and realistic Fermi calculations.",
    ]
      .filter(Boolean)
      .join("\n");

    // 2. Execute HTTP provider call with AbortController
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    let rawReply = "";
    try {
      const res = await fetch("https://api.apinex.bond/v1/chat/completions", {
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
          max_tokens: 1200,
          temperature: 0.75,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          `AI provider returned status ${res.status}: ${errorData?.error?.message || res.statusText}`
        );
      }

      const data = await res.json();
      rawReply = data?.choices?.[0]?.message?.content?.trim();
    } finally {
      clearTimeout(timerId);
    }

    if (!rawReply) {
      throw new Error("AI provider returned an empty response body");
    }

    // 3. Extract and validate candidate questions
    const rawArray = extractJsonArray(rawReply);
    const validatedQuestions: ValidatedFermiQuestion[] = [];

    for (const item of rawArray) {
      const result = validateFermiQuestion(item, existingTexts);
      if (result.valid) {
        validatedQuestions.push(result.question);
        existingTexts.add(normalizeQuestionText(result.question.text));
      } else {
        console.warn("Rejected malformed AI question candidate:", result.reason, item);
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error("None of the AI-generated candidates passed strict validation");
    }

    // 4. Persist validated questions directly into the questions table
    const rowsToInsert = validatedQuestions.map((q) => ({
      text: q.text,
      reference_answer: q.referenceAnswer,
      unit: q.unit,
      unit_plural: q.unitPlural || null,
      category: q.category,
      difficulty: q.difficulty,
      explanation: q.explanation,
      estimation_approach: q.estimationApproach,
      hint: q.hint,
      source_name: q.sourceName || "AI Fermi Generator",
      tags: q.tags || [q.category, "ai-generated"],
      status: "active",
      is_ai_generated: true,
      is_community: false,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("questions")
      .insert(rowsToInsert)
      .select("*");

    if (insertError) {
      console.error("Failed to persist AI-generated questions into database:", insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    return {
      questions: inserted || [],
      savedCount: inserted?.length || 0,
    };
  })();

  inFlightBatchPromise = currentPromise.finally(() => {
    if (inFlightBatchPromise === currentPromise) {
      inFlightBatchPromise = null;
    }
  });

  return currentPromise;
}

/**
 * Retrieves a random AI-generated question from the database pool.
 * If the pool has no matching active AI questions, automatically triggers a batch generation
 * and returns a freshly generated question. If generation fails, returns null so the caller
 * can fall back to the static question bank.
 */
export async function getRandomAiQuestion(options: {
  category?: string | null;
  difficulty?: string | null;
  exclude?: string[];
}): Promise<any | null> {
  const admin = await getAdminClient();
  const excludeList = options.exclude || [];

  let query = admin
    .from("questions")
    .select("*")
    .eq("status", "active")
    .eq("is_ai_generated", true);

  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }
  if (options.difficulty && options.difficulty !== "all") {
    query = query.eq("difficulty", options.difficulty);
  }

  const { data: existingAiQuestions, error: fetchError } = await query.limit(50);

  if (!fetchError && existingAiQuestions && existingAiQuestions.length > 0) {
    const unexcluded = existingAiQuestions.filter((q: any) => !excludeList.includes(q.id));
    if (unexcluded.length > 0) {
      const randomIndex = Math.floor(Math.random() * unexcluded.length);
      return unexcluded[randomIndex];
    }
  }

  // Pool is empty or all AI questions are in exclude list: generate a new batch
  try {
    const batchResult = await generateQuestionBatch({
      category: options.category || undefined,
      difficulty: options.difficulty || undefined,
      count: 2,
    });

    if (batchResult.questions.length > 0) {
      const unexcludedFresh = batchResult.questions.filter((q: any) => !excludeList.includes(q.id));
      if (unexcludedFresh.length > 0) {
        return unexcludedFresh[0];
      }
      return batchResult.questions[0];
    }
  } catch (genError) {
    console.warn("On-demand AI question generation failed:", genError);
  }

  return null;
}
