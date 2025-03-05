import net from "net";
import ZapCache from "./ZapCache.js";

const cache = new ZapCache(1000);
const PORT = 11211;

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    const message = data.toString().trim();
    const [command, key, value, ttl] = message.split(" ");

    let response = "ERROR";
    switch (command.toUpperCase()) {
      case "SET":
        await cache.set(key, value, ttl ? parseInt(ttl) : undefined);
        response = "STORED";
        break;
      case "GET":
        const result = await cache.get(key);
        response = result ? `VALUE ${result}` : "NOT_FOUND";
        break;
      case "DELETE":
        await cache.delete(key);
        response = "DELETED";
        break;
    }
    socket.write(response + "\n");
  });
});

server.listen(PORT, () => console.log(`ZapCache TCP Server Running on port ${PORT}`));
