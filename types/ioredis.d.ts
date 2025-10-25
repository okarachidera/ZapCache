declare module "ioredis" {
  export default class Redis {
    constructor(url?: string);
    set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
    get(key: string): Promise<string | null>;
    del(...keys: string[]): Promise<number>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(...channels: string[]): Promise<number>;
    on(event: "error", listener: (err: Error) => void): this;
    flushall(): Promise<string>;
    disconnect(): void;
  }
}
