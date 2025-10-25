import net from "net";
import ZapCache from "./ZapCache.js";

const cache = new ZapCache(1000);
const PORT = 11211;

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    const message = data.toString().trim();
    const [commandRaw, key, value, ttl] = message.split(" ");
    const command = commandRaw?.toUpperCase();

    let response = "ERROR";
    switch (command) {
      case "SET": {
        if (!key || value === undefined) {
          response = "CLIENT_ERROR missing key or value";
          break;
        }

        let ttlMs: number | undefined;
        if (ttl !== undefined) {
          const ttlSeconds = Number.parseInt(ttl, 10);
          if (Number.isNaN(ttlSeconds)) {
            response = "CLIENT_ERROR invalid TTL";
            break;
          }
          ttlMs = ttlSeconds * 1000;
        }

        await cache.set(key, value, ttlMs);
        response = "STORED";
        break;
      }
      case "GET":
        if (!key) {
          response = "CLIENT_ERROR missing key";
          break;
        }
        const result = await cache.get(key);
        response = result ? `VALUE ${result}` : "NOT_FOUND";
        break;
      case "DELETE":
        if (!key) {
          response = "CLIENT_ERROR missing key";
          break;
        }
        await cache.delete(key);
        response = "DELETED";
        break;
    }
    socket.write(response + "\n");
  });
});

server.listen(PORT, () => console.log(`ZapCache TCP Server Running on port ${PORT}`));
