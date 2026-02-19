import { test } from "node:test";
import assert from "node:assert";
import { parseCommand } from "../src/utils/serverProtocol.js";

test("parses quoted SET values with spaces", () => {
  const parsed = parseCommand('SET user1 "John Doe" 5');
  assert.deepStrictEqual(parsed, {
    command: "SET",
    key: "user1",
    value: "John Doe",
    ttl: "5",
  });
});

test("parses unquoted commands", () => {
  const parsed = parseCommand("GET user1");
  assert.deepStrictEqual(parsed, {
    command: "GET",
    key: "user1",
    value: undefined,
    ttl: undefined,
  });
});

test("returns null for empty command lines", () => {
  assert.strictEqual(parseCommand("   "), null);
});
