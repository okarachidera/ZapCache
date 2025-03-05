import { test, beforeEach } from "node:test";
import assert from "node:assert";
import ZapCache from "../src/ZapCache.js";

let cache: ZapCache<string>;

beforeEach(() => {
  cache = new ZapCache<string>(); // Use in-memory caching for tests
});

test("should set and get a value", async () => {
  await cache.set("key1", "value1");
  assert.strictEqual(await cache.get("key1"), "value1");
});

test("should return null for expired items", async () => {
  await cache.set("key2", "value2", 100);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(await cache.get("key2"), null);
});

test("should delete a key", async () => {
  await cache.set("key3", "value3");
  await cache.delete("key3");
  assert.strictEqual(await cache.get("key3"), null);
});

test("should clear all values", async () => {
  await cache.set("key4", "value4");
  await cache.clear();
  assert.strictEqual(cache.size(), 0);
});
