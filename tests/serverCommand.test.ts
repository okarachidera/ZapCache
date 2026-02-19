import { beforeEach, test } from "node:test";
import assert from "node:assert";
import ZapCache from "../src/ZapCache.js";
import { handleServerCommand } from "../src/server.js";

let cache: ZapCache<string>;

beforeEach(() => {
  cache = new ZapCache<string>();
});

test("handles quoted values with spaces", async () => {
  assert.strictEqual(await handleServerCommand(cache, 'SET user1 "John Doe" 10'), "STORED");
  assert.strictEqual(await handleServerCommand(cache, "GET user1"), "VALUE John Doe");
});

test("returns VALUE for falsey string values", async () => {
  assert.strictEqual(await handleServerCommand(cache, 'SET empty ""'), "STORED");
  assert.strictEqual(await handleServerCommand(cache, "GET empty"), "VALUE ");
});

test("supports command lifecycle", async () => {
  assert.strictEqual(await handleServerCommand(cache, "SET k v"), "STORED");
  assert.strictEqual(await handleServerCommand(cache, "GET k"), "VALUE v");
  assert.strictEqual(await handleServerCommand(cache, "DELETE k"), "DELETED");
  assert.strictEqual(await handleServerCommand(cache, "GET k"), "NOT_FOUND");
});
