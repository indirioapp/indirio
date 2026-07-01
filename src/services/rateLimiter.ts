import cache from './cache';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class RateLimiter {
  private store = new Map<string, number[]>();

  constructor() {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  check(ip: string, route: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const key = `${ip}:${route}`;
    const windowStart = now - windowMs;

    let timestamps = this.store.get(key) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      const oldestRemaining = timestamps[0];
      const resetMs = oldestRemaining + windowMs - now;
      const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

      this.store.set(key, timestamps);

      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetSeconds,
      };
    }

    timestamps.push(now);
    this.store.set(key, timestamps);

    const resetMs = (timestamps[0] || now) + windowMs - now;
    const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

    return {
      success: true,
      limit,
      remaining: limit - timestamps.length,
      reset: resetSeconds,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.store.entries()) {
      const youngest = Math.max(...timestamps, 0);
      if (now - youngest > 3600000) {
        this.store.delete(key);
      }
    }
  }
}

export class RateLimiterService {
  static async checkRateLimit(
    ip: string,
    action: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `ratelimit:${ip}:${action}`;
    const timestamps = (await cache.get<number[]>(key)) || [];
    const windowStart = now - windowSeconds * 1000;
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= limit) {
      const oldest = validTimestamps[0];
      const reset = Math.ceil((oldest + windowSeconds * 1000 - now) / 1000);
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.max(1, reset),
      };
    }

    validTimestamps.push(now);
    await cache.set(key, validTimestamps, windowSeconds);

    return {
      success: true,
      limit,
      remaining: limit - validTimestamps.length,
      reset: windowSeconds,
    };
  }

  static async checkCooldown(
    key: string,
    cooldownSeconds: number,
  ): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const cacheKey = `cooldown:${key}`;
    const record = await cache.get<{ expiresAt: number }>(cacheKey);

    if (record) {
      const remaining = Math.ceil((record.expiresAt - now) / 1000);
      if (remaining > 0) {
        return { success: false, remaining };
      }
    }

    const expiresAt = now + cooldownSeconds * 1000;
    await cache.set(cacheKey, { expiresAt }, cooldownSeconds);

    return { success: true, remaining: 0 };
  }

  static async acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
    const cacheKey = `lock:${key}`;
    const existing = await cache.get<boolean>(cacheKey);
    if (existing) {
      return false;
    }
    await cache.set(cacheKey, true, ttlSeconds);
    return true;
  }

  static async releaseLock(key: string): Promise<void> {
    const cacheKey = `lock:${key}`;
    await cache.delete(cacheKey);
  }
}

export const rateLimiter = new RateLimiter();
export default rateLimiter;
