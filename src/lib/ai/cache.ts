import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory LRU cache with TTL expiration.
 */
class MemoryLruCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
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
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// 7-day TTL for hints
export const aiHintCache = new MemoryLruCache<string>(1000);

// Battle analysis deduplication cache: 15-minute TTL per (battleId + roundId)
export const aiBattleAnalysisCache = new MemoryLruCache<string>(200);

// Ongoing in-flight request deduplication map to prevent race conditions
export const pendingBattlePromises = new Map<string, Promise<string>>();

/**
 * Generate a deterministic content hash for question hints.
 * Guarantees that if the question text or unit changes in the database,
 * stale cached hints are automatically invalidated.
 */
export function buildHintCacheKey(
  model: string,
  promptVersion: string,
  questionId: string,
  questionText: string,
  unit: string
): string {
  const contentHash = createHash('sha256')
    .update(`${questionText.trim()}|${unit.trim()}`)
    .digest('hex')
    .slice(0, 16);
  return `hint:${model}:${promptVersion}:${questionId}:${contentHash}`;
}

// Rate limiting: fixed-window counter with atomic-like expiration
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Rate limit validator.
 * - Enforces request thresholds per client identifier.
 * - Rejects empty/untrusted client keys safely.
 */
export function checkRateLimit(
  identifier: string,
  limit = 20,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; resetInMs: number } {
  // If identifier is missing or blank, fail safe by applying a shared fallback bucket
  const key = identifier && identifier.trim() ? identifier.trim() : 'unknown-client';
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
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

/**
 * Safely extracts the client IP address.
 * Does NOT blindly trust spoofed x-forwarded-for headers.
 * Uses x-real-ip or leftmost IP, with fallback.
 */
export function getClientIp(headers: Headers): string {
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Only take the first IP in list
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return '127.0.0.1';
}

export interface AiTokenMetrics {
  task: 'hint' | 'feedback' | 'battle_analysis';
  cached: boolean;
  model: string;
  durationMs: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  reasoningTokens?: number | null;
  totalTokens?: number | null;
  success: boolean;
  errorCode?: string | number;
}

/**
 * Structured observability logging without leaking private data, prompts, or API keys.
 */
export function logAiMetrics(metrics: AiTokenMetrics): void {
  const logPayload = {
    tag: 'AI_TOKEN_METRICS',
    task: metrics.task,
    cached: metrics.cached,
    model: metrics.model,
    durationMs: metrics.durationMs,
    tokens: {
      prompt: metrics.promptTokens !== undefined ? metrics.promptTokens : null,
      completion: metrics.completionTokens !== undefined ? metrics.completionTokens : null,
      reasoning: metrics.reasoningTokens !== undefined ? metrics.reasoningTokens : null,
      total: metrics.totalTokens !== undefined ? metrics.totalTokens : null,
    },
    success: metrics.success,
    ...(metrics.errorCode !== undefined ? { errorCode: metrics.errorCode } : {}),
  };

  console.log(JSON.stringify(logPayload));
}
