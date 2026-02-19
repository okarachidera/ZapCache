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

test("should preserve falsey-like string values", async () => {
  await cache.set("empty", "");
  await cache.set("zero", "0");
  assert.strictEqual(await cache.get("empty"), "");
  assert.strictEqual(await cache.get("zero"), "0");
});

test("should return null for expired items", async () => {
  await cache.set("key2", "value2", 100);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(await cache.get("key2"), null);
});

test("should ignore expired entries when reporting size", async () => {
  await cache.set("key-expired", "value", 50);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.strictEqual(cache.size(), 0);
});

test("should treat non-positive TTL as delete", async () => {
  await cache.set("key5", "value5");
  await cache.set("key5", "updated", 0);
  assert.strictEqual(await cache.get("key5"), null);
});

test("should reject non-finite TTL values", async () => {
  await assert.rejects(
    () => cache.set("key6", "value6", Number.POSITIVE_INFINITY),
    (error: Error) => error instanceof TypeError
  );
});

test("should evict the least recently used entry", async () => {
  const lruCache = new ZapCache<string>(2);
  await lruCache.set("a", "1");
  await lruCache.set("b", "2");

  // Access "a" so "b" becomes the least recently used.
  await lruCache.get("a");

  await lruCache.set("c", "3"); // Should evict "b".

  assert.strictEqual(await lruCache.get("b"), null);
  assert.strictEqual(await lruCache.get("a"), "1");
  assert.strictEqual(await lruCache.get("c"), "3");
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
