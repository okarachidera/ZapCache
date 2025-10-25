import { createRedisClient, RedisClient } from "./utils/redisLoader.js";

class ClusteredCache<T = any> {
  private cache: Map<string, { value: T; expiry: number | null }> = new Map();
  private redis: RedisClient | null = null;
  private pubSub: RedisClient | null = null;
  private redisInitPromise: Promise<RedisClient | null> | null = null;
  private pubSubInitPromise: Promise<RedisClient | null> | null = null;
  private readonly redisUrl: string;
  private redisAvailable = true;
  private pubSubAvailable = true;
  private maxSize: number;

  constructor(maxSize = 1000, redisUrl = "redis://localhost:6379") {
    this.maxSize = maxSize;
    this.redisUrl = redisUrl;

    void this.ensureRedis();
    void this.ensurePubSub();
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
    if (!redis) {
      return;
    }

    const args: (string | number)[] = [key, JSON.stringify(entry)];
    if (normalizedTtl !== undefined) {
      args.push("PX", normalizedTtl);
    }
    await redis.set(...(args as [string, string, ...string[]]));
    await redis.publish("cache_update", JSON.stringify({ key, value, expiry }));
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    const now = Date.now();
    if (entry) {
      if (entry.expiry && entry.expiry <= now) {
        this.cache.delete(key);
        return null;
      }
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.value;
    }

    const redis = await this.ensureRedis();
    if (!redis) {
      return null;
    }

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
      const value = redisData as unknown as T;
      this.cache.set(key, { value, expiry: null });
      return value;
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    const redis = await this.ensureRedis();
    if (redis) {
      await redis.del(key);
      await redis.publish("cache_delete", key);
    }
  }

  async clear(): Promise<void> {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();
    const redis = await this.ensureRedis();
    if (redis) {
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      await redis.publish("cache_clear", "all");
    }
  }

  private evict(): void {
    this.purgeExpired();
    if (this.cache.size < this.maxSize) {
      return;
    }
    const firstKey = this.cache.keys().next()?.value;
    if (firstKey !== undefined) {
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
    if (!this.redisAvailable) {
      return null;
    }

    if (this.redis) {
      return this.redis;
    }

    if (!this.redisInitPromise) {
      this.redisInitPromise = createRedisClient(this.redisUrl).then((client) => {
        if (!client) {
          this.redisAvailable = false;
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

  private async ensurePubSub(): Promise<RedisClient | null> {
    if (!this.pubSubAvailable) {
      return null;
    }

    if (this.pubSub) {
      return this.pubSub;
    }

    if (!this.pubSubInitPromise) {
      this.pubSubInitPromise = createRedisClient(this.redisUrl).then(async (client) => {
        if (!client) {
          this.pubSubAvailable = false;
          this.pubSubInitPromise = null;
          return null;
        }

        client.on("error", (err: Error) => {
          console.error("⚠️ Redis Pub/Sub Connection Error:", err.message);
          client.disconnect();
          this.pubSub = null;
          this.pubSubInitPromise = null;
        });

        client.on("message", (channel: string, message: string) => {
          this.handleMessage(channel, message);
        });

        try {
          await client.subscribe("cache_update", "cache_delete", "cache_clear");
        } catch (err) {
          console.error("⚠️ Redis Pub/Sub Subscription Error:", err);
          client.disconnect();
          this.pubSub = null;
          this.pubSubInitPromise = null;
          this.pubSubAvailable = false;
          return null;
        }

        this.pubSub = client;
        return client;
      });
    }

    return this.pubSubInitPromise;
  }

  private handleMessage(channel: string, message: string): void {
    if (channel === "cache_update") {
      try {
        const parsed = JSON.parse(message) as {
          key: string;
          value: T;
          expiry?: number | null;
        };
        const expiry = typeof parsed.expiry === "number" ? parsed.expiry : null;
        if (expiry !== null && expiry <= Date.now()) {
          this.cache.delete(parsed.key);
          return;
        }
        this.cache.delete(parsed.key);
        this.cache.set(parsed.key, { value: parsed.value, expiry });
      } catch (err) {
        console.error("⚠️ Failed to process cache update message:", err);
      }
    } else if (channel === "cache_delete") {
      this.cache.delete(message);
    } else if (channel === "cache_clear") {
      this.cache.clear();
    }
  }
}

export default ClusteredCache;
