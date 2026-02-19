import { beforeEach, test } from "node:test";
import assert from "node:assert";
import ClusteredCache from "../src/cluster.js";
import { createFakeRedisFactory } from "./helpers/fakeRedis.js";

let nodeA: ClusteredCache<string>;
let nodeB: ClusteredCache<string>;
let createClient: ReturnType<typeof createFakeRedisFactory>["createClient"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  const fake = createFakeRedisFactory();
  createClient = fake.createClient;
  nodeA = new ClusteredCache<string>(1000, "redis://fake", fake.factory);
  nodeB = new ClusteredCache<string>(1000, "redis://fake", fake.factory);
});

test("syncs update and delete events across cache nodes", async () => {
  await nodeA.set("shared", "value");
  await delay(0);
  assert.strictEqual(await nodeB.get("shared"), "value");

  await nodeA.delete("shared");
  await delay(0);
  assert.strictEqual(await nodeB.get("shared"), null);
});

test("clear removes orphaned Redis keys across the namespace", async () => {
  const redis = createClient();
  await redis.set("zapcache:orphan", JSON.stringify({ value: "x", expiry: null }));

  await nodeA.clear();

  assert.strictEqual(await nodeB.get("orphan"), null);
});

test("re-initializes pub/sub after a disconnect on operations", async () => {
  const nodeBInternal = nodeB as unknown as {
    pubSub: { emitError: (message: string) => void } | null;
  };

  if (!nodeBInternal.pubSub) {
    await delay(0);
  }

  nodeBInternal.pubSub?.emitError("forced disconnect");
  await nodeB.get("noop");

  await nodeA.set("recovered", "yes");
  await delay(0);

  assert.strictEqual(await nodeB.get("recovered"), "yes");
});
