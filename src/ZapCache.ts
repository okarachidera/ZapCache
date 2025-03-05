import { Redis } from "ioredis";

class ZapCache<T = any> {
  private cache: Map<string, { value: T; expiry: number | null }> = new Map();
  private redis: Redis | null = null;
  private maxSize: number;
  private useRedis: boolean;

  constructor(maxSize = 1000, redisUrl?: string) {
    this.maxSize = maxSize;
    this.useRedis = !!redisUrl; // Enable Redis only if a URL is provided

    if (this.useRedis) {
      try {
        this.redis = new Redis(redisUrl!);
        this.redis.on("error", (err) => {
          console.error("⚠️ Redis Connection Error:", err.message);
          this.redis?.disconnect();
          this.redis = null; // Fallback to in-memory cache
        });
      } catch (error) {
        console.error("⚠️ Could not connect to Redis. Running in-memory only.");
      }
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }
    const expiry = ttl ? Date.now() + ttl : null;
    this.cache.set(key, { value, expiry });

    if (this.useRedis && this.redis) {
      await this.redis.set(key, JSON.stringify(value), "EX", ttl ? ttl / 1000 : -1);
    }
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (entry) {
      if (entry.expiry && entry.expiry < Date.now()) {
        this.cache.delete(key); // Remove expired items
        return null;
      }
      return entry.value;
    }

    if (this.useRedis && this.redis) {
      const redisData = await this.redis.get(key);
      return redisData ? JSON.parse(redisData) : null;
    }
    return null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    if (this.useRedis && this.redis) {
      await this.redis.del(key);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    if (this.useRedis && this.redis) {
      await this.redis.flushall();
    }
  }

  private evict(): void {
    const firstKey = this.cache.keys().next()?.value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export default ZapCache;
