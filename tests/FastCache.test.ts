import { test, beforeEach } from "node:test";
import assert from "node:assert";
import SpeedyCache from "../src/SpeedyCache.js"; // ✅ Explicit .js extension

let cache: SpeedyCache<string>;

beforeEach(() => {
  cache = new SpeedyCache<string>();
});

test("should set and get a value", () => {
  cache.set("key1", "value1");
  assert.strictEqual(cache.get("key1"), "value1");
});

test("should return null for expired items", (t, done) => {
  cache.set("key2", "value2", 100);
  setTimeout(() => {
    assert.strictEqual(cache.get("key2"), null);
    done();
  }, 200);
});

test("should delete a key", () => {
  cache.set("key3", "value3");
  cache.delete("key3");
  assert.strictEqual(cache.get("key3"), null);
});

test("should clear all values", () => {
  cache.set("key4", "value4");
  cache.clear();
  assert.strictEqual(cache.size(), 0);
});
