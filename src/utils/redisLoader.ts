export type RedisClient = {
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(...channels: string[]): Promise<number>;
  on(event: "error", listener: (err: Error) => void): void;
  on(event: "message", listener: (channel: string, message: string) => void): void;
  disconnect(): void;
};

type RedisModule = {
  default: new (url?: string) => RedisClient;
};

export async function createRedisClient(redisUrl: string): Promise<RedisClient | null> {
  try {
    const mod = (await import("ioredis")) as unknown as RedisModule;
    return new mod.default(redisUrl);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "MODULE_NOT_FOUND") {
      console.error("⚠️ Redis module not found. Running in-memory only.");
    } else {
      console.error("⚠️ Could not connect to Redis. Running in-memory only.");
    }
    return null;
  }
}
