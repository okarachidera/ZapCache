import {Redis} from "ioredis";

class ClusteredCache<T = any> {
  private cache: Map<string, { value: T; expiry: number | null }> = new Map();
  private redis: Redis;
  private pubSub: Redis;
  private maxSize: number;

  constructor(maxSize = 1000, redisUrl = "redis://localhost:6379") {
    this.maxSize = maxSize;
    this.redis = new Redis(redisUrl);
    this.pubSub = new Redis(redisUrl);

    this.pubSub.subscribe("cache_update", (err) => {
      if (err) console.error("⚠️ Redis Pub/Sub Subscription Error:", err);
    });

    this.pubSub.on("message", (channel, message) => {
      if (channel === "cache_update") {
        const { key, value, ttl } = JSON.parse(message);
        this.cache.set(key, { value, expiry: ttl ? Date.now() + ttl : null });
      }
    });

    this.redis.on("error", (err) => {
      console.error("⚠️ Redis Connection Error:", err.message);
    });
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }
    const expiry = ttl ? Date.now() + ttl : null;
    this.cache.set(key, { value, expiry });

    await this.redis.set(key, JSON.stringify(value), "EX", ttl ? ttl / 1000 : -1);
    await this.redis.publish("cache_update", JSON.stringify({ key, value, ttl }));
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (entry) return entry.value;

    const redisData = await this.redis.get(key);
    return redisData ? JSON.parse(redisData) : null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    await this.redis.flushall();
  }

  private evict(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export default ClusteredCache;
