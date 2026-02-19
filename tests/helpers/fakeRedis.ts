import type { RedisClient } from "../../src/utils/redisLoader.js";

type StoredEntry = {
  value: string;
  expiry: number | null;
};

class FakeRedisBroker {
  private readonly store = new Map<string, StoredEntry>();
  private readonly clients = new Set<FakeRedisClient>();

  createClient(): FakeRedisClient {
    const client = new FakeRedisClient(this);
    this.clients.add(client);
    return client;
  }

  removeClient(client: FakeRedisClient): void {
    this.clients.delete(client);
  }

  set(key: string, value: string, ttlMs?: number): void {
    const expiry = ttlMs !== undefined ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiry });
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiry !== null && entry.expiry <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  del(keys: string[]): number {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        removed += 1;
      }
    }
    return removed;
  }

  keys(pattern: string): string[] {
    if (!pattern.includes("*")) {
      return this.store.has(pattern) ? [pattern] : [];
    }

    const prefix = pattern.slice(0, pattern.indexOf("*"));
    return Array.from(this.store.keys()).filter((key) => key.startsWith(prefix));
  }

  publish(channel: string, message: string): number {
    let delivered = 0;
    for (const client of this.clients) {
      if (client.isSubscribed(channel)) {
        client.emitMessage(channel, message);
        delivered += 1;
      }
    }
    return delivered;
  }
}

class FakeRedisClient implements RedisClient {
  private errorListeners: Array<(err: Error) => void> = [];
  private messageListeners: Array<(channel: string, message: string) => void> = [];
  private subscribedChannels = new Set<string>();
  private disconnected = false;

  constructor(private readonly broker: FakeRedisBroker) {}

  async set(key: string, value: string, ...args: Array<string | number>): Promise<unknown> {
    this.ensureConnected();
    let ttlMs: number | undefined;

    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === "PX" && i + 1 < args.length) {
        ttlMs = Number(args[i + 1]);
      }
    }

    this.broker.set(key, value, ttlMs);
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    this.ensureConnected();
    return this.broker.get(key);
  }

  async keys(pattern: string): Promise<string[]> {
    this.ensureConnected();
    return this.broker.keys(pattern);
  }

  async del(...keys: string[]): Promise<number> {
    this.ensureConnected();
    return this.broker.del(keys);
  }

  async publish(channel: string, message: string): Promise<number> {
    this.ensureConnected();
    return this.broker.publish(channel, message);
  }

  async subscribe(...channels: string[]): Promise<number> {
    this.ensureConnected();
    for (const channel of channels) {
      this.subscribedChannels.add(channel);
    }
    return this.subscribedChannels.size;
  }

  on(
    event: "error" | "message",
    listener: ((err: Error) => void) | ((channel: string, message: string) => void)
  ): void {
    if (event === "error") {
      this.errorListeners.push(listener as (err: Error) => void);
      return;
    }
    this.messageListeners.push(listener as (channel: string, message: string) => void);
  }

  disconnect(): void {
    this.disconnected = true;
    this.subscribedChannels.clear();
    this.broker.removeClient(this);
  }

  isSubscribed(channel: string): boolean {
    return !this.disconnected && this.subscribedChannels.has(channel);
  }

  emitMessage(channel: string, message: string): void {
    for (const listener of this.messageListeners) {
      listener(channel, message);
    }
  }

  emitError(message: string): void {
    const err = new Error(message);
    for (const listener of this.errorListeners) {
      listener(err);
    }
  }

  private ensureConnected(): void {
    if (this.disconnected) {
      throw new Error("Client is disconnected");
    }
  }
}

export function createFakeRedisFactory() {
  const broker = new FakeRedisBroker();

  return {
    createClient: () => broker.createClient(),
    factory: async (_redisUrl: string) => broker.createClient(),
  };
}
