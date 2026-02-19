import { beforeEach, test } from "node:test";
import assert from "node:assert";
import ZapCache from "../src/ZapCache.js";
import { createFakeRedisFactory } from "./helpers/fakeRedis.js";

let cache: ZapCache<string>;
let createClient: ReturnType<typeof createFakeRedisFactory>["createClient"];

beforeEach(() => {
  const fake = createFakeRedisFactory();
  createClient = fake.createClient;
  cache = new ZapCache<string>(1000, "redis://fake", fake.factory);
});

test("reads legacy unprefixed Redis keys for backward compatibility", async () => {
  const redis = createClient();
  await redis.set("legacy-key", JSON.stringify({ value: "legacy", expiry: null }));
  assert.strictEqual(await cache.get("legacy-key"), "legacy");
});

test("clear removes namespaced Redis keys even when local memory is empty", async () => {
  const redis = createClient();
  await redis.set("zapcache:orphan", JSON.stringify({ value: "orphan", expiry: null }));

  await cache.clear();

  assert.strictEqual(await cache.get("orphan"), null);
});
