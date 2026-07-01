import Redis from 'ioredis';

class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private isRedisConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true,
        });

        this.redis.on('connect', () => {
          console.log('✅ Cache: Redis connection established.');
          this.isRedisConnected = true;
        });

        this.redis.on('error', (err) => {
          console.warn('⚠️ Cache: Redis error. Falling back to memory cache.', err.message);
          this.isRedisConnected = false;
        });

        this.redis.connect().catch((err) => {
          console.warn(
            '⚠️ Cache: Failed to connect to Redis. Using memory cache fallback.',
            err.message,
          );
        });
      } catch (err) {
        console.warn(
          '⚠️ Cache: Error initializing Redis client. Using memory cache fallback.',
          err,
        );
      }
    } else {
      console.log('ℹ️ Cache: REDIS_URL not set. Running with In-Memory Cache.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    if (this.redis && this.isRedisConnected) {
      try {
        const val = await this.redis.get(key);
        return val ? (JSON.parse(val) as T) : null;
      } catch (err) {
        console.error('Error fetching from Redis cache, reading memory fallback', err);
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(item.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    const stringified = JSON.stringify(value);

    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.set(key, stringified, 'EX', ttlSeconds);
        return;
      } catch (err) {
        console.error('Error setting in Redis cache, writing to memory fallback', err);
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value: stringified, expiresAt });
  }

  async delete(key: string): Promise<void> {
    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        console.error('Error deleting from Redis cache, writing to memory fallback', err);
      }
    }

    this.memoryCache.delete(key);
  }

  clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}

export const cache = new CacheService();
export default cache;
