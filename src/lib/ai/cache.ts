/**
 * In-memory LRU cache and rate limiter for AI requests.
 * Zero external dependencies.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryLruCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Delete oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  size(): number {
    return this.cache.size;
  }

  clear(): number {
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }
}

// 7-day TTL for static hints (they are deterministic per question text)
export const aiHintCache = new MemoryLruCache<string>(1000);

// Rate limiter: sliding window counter per client key (IP or user ID)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  limit = 20, // max 20 requests
  windowMs = 60 * 1000 // per 1 minute
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean expired
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInMs: Math.max(0, record.resetAt - now),
  };
}

// Observability logger: structured, safe logging without secrets
export interface AiTokenMetrics {
  task: 'hint' | 'feedback' | 'battle_analysis' | 'legacy';
  cached: boolean;
  model: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  success: boolean;
  errorCode?: string | number;
}

export function logAiMetrics(metrics: AiTokenMetrics): void {
  // Safe structured telemetry
  const logPayload = {
    tag: 'AI_TOKEN_METRICS',
    task: metrics.task,
    cached: metrics.cached,
    model: metrics.model,
    durationMs: metrics.durationMs,
    tokens: {
      prompt: metrics.promptTokens ?? 0,
      completion: metrics.completionTokens ?? 0,
      reasoning: metrics.reasoningTokens ?? 0,
      total: metrics.totalTokens ?? 0,
    },
    success: metrics.success,
    ...(metrics.errorCode ? { errorCode: metrics.errorCode } : {}),
  };

  console.log(JSON.stringify(logPayload));
}
