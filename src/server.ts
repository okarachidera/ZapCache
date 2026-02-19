#!/usr/bin/env node
import net from "net";
import { pathToFileURL } from "node:url";
import ZapCache from "./ZapCache.js";
import { parseCommand } from "./utils/serverProtocol.js";

const PORT = 11211;

export async function handleServerCommand(
  cache: ZapCache<string>,
  line: string
): Promise<string> {
  const parsed = parseCommand(line);
  let response = "ERROR";

  switch (parsed?.command) {
    case "SET": {
      if (!parsed.key || parsed.value === undefined) {
        response = "CLIENT_ERROR missing key or value";
        break;
      }

      let ttlMs: number | undefined;
      if (parsed.ttl !== undefined) {
        const ttlSeconds = Number.parseInt(parsed.ttl, 10);
        if (Number.isNaN(ttlSeconds)) {
          response = "CLIENT_ERROR invalid TTL";
          break;
        }
        ttlMs = ttlSeconds * 1000;
      }

      await cache.set(parsed.key, parsed.value, ttlMs);
      response = "STORED";
      break;
    }
    case "GET":
      if (!parsed.key) {
        response = "CLIENT_ERROR missing key";
        break;
      }
      const result = await cache.get(parsed.key);
      response = result !== null ? `VALUE ${result}` : "NOT_FOUND";
      break;
    case "DELETE":
      if (!parsed.key) {
        response = "CLIENT_ERROR missing key";
        break;
      }
      await cache.delete(parsed.key);
      response = "DELETED";
      break;
  }

  return response;
}

export function createZapCacheServer(cache = new ZapCache<string>(1000)): net.Server {
  return net.createServer((socket) => {
    socket.on("data", async (data) => {
      const lines = data
        .toString()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (const line of lines) {
        const response = await handleServerCommand(cache, line);
        socket.write(response + "\n");
      }
    });
  });
}

export function startZapCacheServer(port = PORT): net.Server {
  const server = createZapCacheServer();
  server.listen(port, () => console.log(`ZapCache TCP Server Running on port ${port}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startZapCacheServer();
}
