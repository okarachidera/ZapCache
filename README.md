# ⚡ ZapCache — Node.js caching with TTL, LRU eviction, and Redis

[![npm version](https://img.shields.io/npm/v/zapcache?color=blue&label=npm)](https://www.npmjs.com/package/zapcache)  
[![Build Status](https://github.com/okarachidera/zapcache/actions/workflows/publish.yml/badge.svg)](https://github.com/okarachidera/zapcache/actions)  
[![License](https://img.shields.io/github/license/okarachidera/zapcache.svg)](https://github.com/okarachidera/zapcache/blob/main/LICENSE)  
[![Downloads](https://img.shields.io/npm/dt/zapcache.svg)](https://www.npmjs.com/package/zapcache)  

**ZapCache** is a TypeScript caching library for Node.js. Start with an in-memory cache, add expiration times, and optionally connect Redis for shared storage. It supports:

- ✅ **In-Memory Caching** for low-latency operations
- ✅ **TTL Expiry** – Automatically removes stale data
- ✅ **Redis Storage** – Retrieve cached entries after an application restart while Redis retains them
- ✅ **TCP Server** – Access cache using simple text commands
- ✅ **Cluster Support** – Sync cache across multiple servers

---

## 🚀 Features
- **In-Memory Cache:** Local caching with LRU eviction
- **TTL Support:** Set expiration time for cached items  
- **Redis Storage:** Optional Redis integration; durability depends on Redis configuration
- **TCP Server:** Run ZapCache as a cache server with its own text protocol
- **Cluster Support:** Sync cache across multiple servers  
- **Eviction Mechanism:** Auto-removes least recently used (LRU) items
- **TypeScript:** Define the cached value type when constructing a cache

---

## 📦 Installation
To install ZapCache, run:
```sh
npm install zapcache
```
or

```sh
yarn add zapcache
```

## 🔥 Quick Start
1️⃣ Basic In-Memory Cache

This example uses ES modules. Save it as `demo.mjs` and run `node demo.mjs` after installing the package.

```ts
import ZapCache from "zapcache";

const cache = new ZapCache();

// Store a value with a TTL of 5 seconds
await cache.set("user_1", { name: "John Doe" }, 5000);

console.log(await cache.get("user_1")); // ✅ { name: 'John Doe' }

// Wait 6 seconds...
setTimeout(async () => {
    console.log(await cache.get("user_1")); // ❌ null (expired)
}, 6000);
```

2️⃣ Storage with Redis

```ts
import ZapCache from "zapcache";

const cache = new ZapCache(1000, "redis://localhost:6379");

(async () => {
  await cache.set("session_123", { token: "xyz123" }, 10000);
  console.log(await cache.get("session_123")); // ✅ { token: "xyz123" }
})();
```
Entries can survive an application restart while Redis retains them. Surviving a Redis restart depends on your Redis persistence configuration.

Redis is optional for in-memory usage. If the Redis client cannot be loaded or constructed, the cache operates locally. Connection and command failures can still reject operations, so handle errors in your application.


3️⃣ Running ZapCache as a Remote Cache
ZapCache can act as a cache server. Its simple text protocol is not a drop-in replacement for the Memcached protocol:

```sh
npx --package=zapcache zapcache-server
```
Then, connect via Telnet:

```sh
telnet localhost 11211
```

And use:

```ts
SET user1 "John Doe" 5
GET user1
DELETE user1
```

> **Note:** The TCP server expects TTL values in seconds. Omit the TTL for no expiry or pass `0` to delete immediately.

4️⃣ Enable Multi-Node Caching (Cluster Mode)
For distributed cache synchronization across servers:

```ts
import { ClusteredCache } from "zapcache";

const cache = new ClusteredCache(1000, "redis://localhost:6379");

(async () => {
  await cache.set("order_456", { total: 100 }, 5000);
})();
```
`ClusteredCache` uses Redis storage and pub/sub to propagate updates, deletions, and clears between connected instances. Propagation is asynchronous.

Cluster mode requires a reachable Redis instance for pub/sub coordination; without it, nodes continue operating independently using their local caches.

## 🛠 API Reference
🔹 set(key: string, value: any, ttl?: number): Promise<void>
Stores a value in the cache with an optional TTL (in milliseconds). Pass `0` to remove the key immediately; omit the TTL for non-expiring entries.

```ts
await cache.set("session", { user: "Alice" }, 5000);
```

🔹 `get(key: string): Promise<T | null>`
Retrieves a value from the cache. Returns null if expired or not found.

```ts
const sessions = new ZapCache<{ user: string }>();
await sessions.set("session", { user: "Alice" }, 5000);
const session = await sessions.get("session");
console.log(session?.user); // "Alice"
```

🔹 delete(key: string): Promise<void>
Deletes a key from the cache.

```ts
await cache.delete("session");
```

🔹 clear(): Promise<void>
Clears the local cache and, when connected, Redis keys in the shared `zapcache:` namespace. Other instances using that namespace are affected.

```ts
await cache.clear();
```

🔹 size(): number
Returns the number of unexpired entries in the local cache, not the total number of entries in Redis.
```ts
console.log(cache.size()); // 5
```

## 🎯 When to Use ZapCache
- Cache repeat API or database reads for a short period.
- Store temporary, recomputable values in a Node.js process.
- Experiment with Redis-backed caching or a simple TCP cache service.

Choose a dedicated queue, session store, or atomic rate limiter when those guarantees are required. Cache latency depends on entry count, value size, TTLs, and Redis/network conditions; benchmark your own workload before choosing a configuration.

## 🏗 Advanced Features
Pre-Filling Cache on Startup

```ts
const users = await fetchUsersFromDB();
for (const user of users) {
  await cache.set(`user_${user.id}`, user, 60000);
}
```

Cache Expiry Handling

```ts
await cache.set("tempData", "This is temporary", 3000);
setTimeout(async () => {
  const value = await cache.get("tempData");
  if (value === null) {
    console.log("Temp data has expired!");
  }
}, 4000);
```

## 🔐 Security Considerations
⚠️ Do not store sensitive user data (passwords, private keys) in cache. The TCP server has no built-in authentication or TLS and listens on port 11211; restrict access to a trusted network.

## 📜 [Changelog](https://github.com/okarachidera/zapcache/blob/main/CHANGELOG.md)
See the [CHANGELOG](https://github.com/okarachidera/zapcache/blob/main/CHANGELOG.md) for details on new releases.


## 🎉 Contributing
We welcome contributions! Feel free to:

- Fork the repo and create PRs
- Report issues and suggest features
- Optimize performance

```sh
git clone https://github.com/okarachidera/zapcache.git
cd zapcache
npm ci
npm test
npm run build
```

## 📄 [License](https://github.com/okarachidera/zapcache/blob/main/LICENSE)
ZapCache is released under the MIT License. See the LICENSE file for details.

💬 Support & Community
💡 Found a bug? Open an issue.
⭐ If you like ZapCache, give it a star on GitHub! 😊

🚀 Happy Caching! ⚡
