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

export interface BattleAnalysisResult {
  reply: string;
  usage?: any;
}

// Ongoing in-flight request deduplication map to prevent race conditions within the same process
export const pendingBattlePromises = new Map<string, Promise<BattleAnalysisResult>>();

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

/**
 * In-memory process-local rate limit store.
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * This rate limiter maintains state within a single Node.js process / serverless instance.
 * In horizontally scaled or serverless deployments (such as Vercel Functions or AWS Lambda),
 * memory is NOT shared across concurrently running instances.
 * If global cross-instance coordination is required in production, an external distributed store
 * (e.g., Upstash Redis with @upstash/ratelimit or a database counter) should be introduced.
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Process-local rate limit validator.
 * - Enforces request thresholds per client identifier within the current process instance.
 * - Rejects empty/untrusted client keys safely with a fallback bucket.
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
 * Extracts client IP address using reverse-proxy headers in order of platform specificity.
 * 
 * REVERSE-PROXY TRUST NOTICE:
 * This function inspects headers in order:
 * 1. 'cf-connecting-ip' (trusted when deployed behind Cloudflare)
 * 2. 'x-real-ip' (trusted when provided by an upstream proxy like Nginx or Vercel edge)
 * 3. Leftmost IP of 'x-forwarded-for'
 * 
 * In production deployments, ensure the ingress proxy or edge CDN strips or overwrites untrusted
 * incoming headers from public clients, or configure your host platform to sanitize them.
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
