import type { Question } from "@/lib/types/game";

export const AI_GENERATED_QUESTIONS: Omit<Question, "id" | "createdAt">[] = [
  {
    text: "How many parameters does the GPT-4 model have (according to industry estimates)?",
    referenceAnswer: 1_760_000_000_000,
    unit: "parameter",
    unitPlural: "parameters",
    category: "technology",
    difficulty: "medium",
    explanation:
      "While OpenAI hasn't officially confirmed it, widely accepted leaks and industry consensus estimate GPT-4 uses a Mixture of Experts (MoE) architecture with roughly 1.76 trillion parameters across 8 expert models.",
    estimationApproach:
      "GPT-3 had 175 billion. Models scaled up roughly 10x for the next generation. 175B × 10 = ~1.75 Trillion.",
    hint: "GPT-3 had 175 billion parameters. GPT-4 is estimated to be roughly 10 times larger.",
    sourceName: "Industry Estimates / SemiAnalysis",
    referencePeriod: "2023",
    uncertaintyLow: 1_500_000_000_000,
    uncertaintyHigh: 2_000_000_000_000,
    tags: ["AI", "LLM", "OpenAI", "technology"],
    status: "active",
  },
  {
    text: "How much did it cost to train GPT-4 in computing power alone (USD)?",
    referenceAnswer: 63_000_000,
    unit: "USD",
    unitPlural: "USD",
    category: "technology",
    difficulty: "hard",
    explanation:
      "It is estimated that training GPT-4 cost roughly $63 million in compute time alone, requiring thousands of A100 GPUs running continuously for months.",
    estimationApproach:
      "Assume 10,000 A100 GPUs at ~$2/hour for 90 days. 10,000 × 2 × 24 × 90 = $43.2M. Add overhead and failed runs to reach ~$60M+.",
    hint: "Think about thousands of highly expensive GPUs running 24/7 for a few months.",
    sourceName: "AI Research Estimates",
    referencePeriod: "2023",
    uncertaintyLow: 40_000_000,
    uncertaintyHigh: 100_000_000,
    tags: ["AI", "training", "compute", "cost"],
    status: "active",
  },
  {
    text: "How many active users did ChatGPT reach just two months after its launch?",
    referenceAnswer: 100_000_000,
    unit: "user",
    unitPlural: "users",
    category: "technology",
    difficulty: "easy",
    explanation:
      "ChatGPT reached 100 million monthly active users in January 2023, just two months after launch, making it the fastest-growing consumer application in history at the time.",
    estimationApproach:
      "It famously broke TikTok's record (9 months) and Instagram's record (2.5 years) to reach the 100 million milestone in a fraction of the time.",
    hint: "It broke the record for the fastest-growing app in history, hitting a massive 9-figure milestone.",
    sourceName: "UBS / Similarweb",
    referencePeriod: "2023",
    uncertaintyLow: 90_000_000,
    uncertaintyHigh: 110_000_000,
    tags: ["ChatGPT", "growth", "users", "AI"],
    status: "active",
  },
  {
    text: "How many Nvidia H100 GPUs did Meta announce they would stockpile by the end of 2024?",
    referenceAnswer: 350_000,
    unit: "GPU",
    unitPlural: "GPUs",
    category: "technology",
    difficulty: "medium",
    explanation:
      "Mark Zuckerberg announced that Meta is building massive compute infrastructure that will include 350,000 Nvidia H100 GPUs by the end of 2024.",
    estimationApproach:
      "Large tech companies usually buy GPUs in clusters of 10,000 to 30,000. Meta is going all-in on AGI, so multiply that by 10 or 20.",
    hint: "A massive number, enough to cost billions of dollars just in silicon.",
    sourceName: "Meta Announcements",
    referencePeriod: "2024",
    uncertaintyLow: 300_000,
    uncertaintyHigh: 400_000,
    tags: ["Meta", "GPU", "hardware", "AI"],
    status: "active",
  },
  {
    text: "How many tokens (words/subwords) was Llama 3 (8B & 70B) trained on?",
    referenceAnswer: 15_000_000_000_000,
    unit: "token",
    unitPlural: "tokens",
    category: "technology",
    difficulty: "hard",
    explanation:
      "Meta trained its Llama 3 models on a massive dataset of 15 trillion tokens, which is significantly larger than the training sets used for Llama 2 (2 trillion).",
    estimationApproach:
      "Previous generation models used 1-2 trillion tokens. The 'Chinchilla scaling laws' showed that models benefit from much more data, so Meta massively increased the training set size by ~7x.",
    hint: "Previous models used about 2 trillion tokens. Llama 3 used a significantly larger dataset, well into the double-digit trillions.",
    sourceName: "Meta AI",
    referencePeriod: "2024",
    uncertaintyLow: 14_000_000_000_000,
    uncertaintyHigh: 16_000_000_000_000,
    tags: ["LLM", "tokens", "Meta", "Llama"],
    status: "active",
  }
];
