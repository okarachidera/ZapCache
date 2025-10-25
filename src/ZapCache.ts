import { createRedisClient, RedisClient } from "./utils/redisLoader.js";

class ZapCache<T = any> {
  private cache: Map<string, { value: T; expiry: number | null }> = new Map();
  private redis: RedisClient | null = null;
  private redisInitPromise: Promise<RedisClient | null> | null = null;
  private readonly redisUrl?: string;
  private maxSize: number;
  private useRedis: boolean;

  constructor(maxSize = 1000, redisUrl?: string) {
    this.maxSize = maxSize;
    this.redisUrl = redisUrl;
    this.useRedis = !!redisUrl; // Enable Redis only if a URL is provided

    if (this.useRedis) {
      void this.ensureRedis();
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    this.purgeExpired();

    if (ttl !== undefined && !Number.isFinite(ttl)) {
      throw new TypeError("TTL must be a finite number in milliseconds");
    }

    const normalizedTtl =
      ttl === undefined ? undefined : Math.max(0, Math.round(ttl as number));

    if (normalizedTtl !== undefined && normalizedTtl === 0) {
      await this.delete(key);
      return;
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    const expiry = normalizedTtl !== undefined ? Date.now() + normalizedTtl : null;
    const entry = { value, expiry };
    this.cache.set(key, entry);

    const redis = await this.ensureRedis();
    if (redis) {
      const args: (string | number)[] = [key, JSON.stringify(entry)];
      if (normalizedTtl !== undefined) {
        args.push("PX", normalizedTtl);
      }
      await redis.set(...(args as [string, string, ...string[]]));
    }
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry) {
      if (entry.expiry && entry.expiry <= now) {
        this.cache.delete(key); // Remove expired items
        return null;
      }
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.value;
    }

    const redis = await this.ensureRedis();
    if (redis) {
      const redisData = await redis.get(key);
      if (!redisData) {
        return null;
      }

      try {
        const parsed = JSON.parse(redisData) as { value?: T; expiry?: number } | T;
        const candidate =
          parsed && typeof parsed === "object" && "value" in parsed
            ? (parsed as { value: T; expiry?: number })
            : { value: parsed as T, expiry: undefined };

        if (candidate.expiry && candidate.expiry <= now) {
          await redis.del(key);
          return null;
        }

        this.cache.set(key, { value: candidate.value, expiry: candidate.expiry ?? null });
        return candidate.value;
      } catch {
        // Backwards compatibility: treat as raw value
        const value = redisData as unknown as T;
        this.cache.set(key, { value, expiry: null });
        return value;
      }
    }
    return null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    const redis = await this.ensureRedis();
    if (redis) {
      await redis.del(key);
    }
  }

  async clear(): Promise<void> {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();

    if (keys.length === 0) {
      return;
    }

    const redis = await this.ensureRedis();
    if (redis) {
      await redis.del(...keys);
    }
  }

  private evict(): void {
    this.purgeExpired();
    if (this.cache.size < this.maxSize) {
      return;
    }
    const firstKey = this.cache.keys().next()?.value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  size(): number {
    this.purgeExpired();
    return this.cache.size;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && entry.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  private async ensureRedis(): Promise<RedisClient | null> {
    if (!this.useRedis || !this.redisUrl) {
      return null;
    }

    if (this.redis) {
      return this.redis;
    }

    if (!this.redisInitPromise) {
      this.redisInitPromise = createRedisClient(this.redisUrl).then((client) => {
        if (!client) {
          this.useRedis = false;
          this.redisInitPromise = null;
          return null;
        }
        client.on("error", (err: Error) => {
          console.error("⚠️ Redis Connection Error:", err.message);
          client.disconnect();
          this.redis = null;
          this.redisInitPromise = null;
        });
        this.redis = client;
        return client;
      });
    }

    return this.redisInitPromise;
  }
}

export default ZapCache;
