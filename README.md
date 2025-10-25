# ⚡ ZapCache - High-Speed In-Memory & Distributed Cache for Node.js

[![npm version](https://img.shields.io/npm/v/zapcache?color=blue&label=npm)](https://www.npmjs.com/package/zapcache)  
[![Build Status](https://github.com/okarachidera/zapcache/actions/workflows/publish.yml/badge.svg)](https://github.com/okarachidera/zapcache/actions)  
[![License](https://img.shields.io/github/license/okarachidera/zapcache.svg)](https://github.com/okarachidera/zapcache/blob/main/LICENSE)  
[![Downloads](https://img.shields.io/npm/dt/zapcache.svg)](https://www.npmjs.com/package/zapcache)  

**ZapCache** is a **blazing-fast, LRU-based caching library** for Node.js that supports:  

✅ **In-Memory Caching** for low-latency operations  
✅ **TTL Expiry** – Automatically removes stale data  
✅ **Persistent Storage with Redis** – Cache data beyond restarts  
✅ **Memcached-style TCP Server** – Access cache via a network  
✅ **Cluster Support** – Sync cache across multiple servers  

---

## 🚀 Features
- **Super-Fast:** Low-latency, LRU-based in-memory caching  
- **TTL Support:** Set expiration time for cached items  
- **Persistent Storage:** Supports Redis for long-term caching  
- **Memcached-Style Server:** Run ZapCache as a TCP cache server  
- **Cluster Support:** Sync cache across multiple servers  
- **Eviction Mechanism:** Auto-removes least recently used (LRU) items
- **Scalable & Lightweight** Ideal for high-performance applications

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

2️⃣ Persistent Storage with Redis

```ts
import ZapCache from "zapcache";

const cache = new ZapCache(1000, "redis://localhost:6379");

(async () => {
  await cache.set("session_123", { token: "xyz123" }, 10000);
  console.log(await cache.get("session_123")); // ✅ { token: "xyz123" }
})();
```
✔ Data remains even after app restarts!

If the optional `ioredis` dependency is missing or Redis becomes unavailable, ZapCache automatically falls back to in-memory mode so your application keeps running.


3️⃣ Running ZapCache as a Remote Cache
ZapCache can act as a cache server:

```sh
npx zapcache-server
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
✔ All ZapCache instances share the same data!

Cluster mode requires a reachable Redis instance for pub/sub coordination; without it, nodes continue operating independently using their local caches.

## 🛠 API Reference
🔹 set(key: string, value: any, ttl?: number): void
Stores a value in the cache with an optional TTL (in milliseconds). Pass `0` to remove the key immediately; omit the TTL for non-expiring entries.

```ts
await cache.set("session", { user: "Alice" }, 5000);
```

🔹 get<T>(key: string): T | null
Retrieves a value from the cache. Returns null if expired or not found.

```ts
const session = await cache.get<{ user: string }>("session");
console.log(session?.user); // "Alice"
```

🔹 delete(key: string): void
Deletes a key from the cache.

```ts
await cache.delete("session");
```

🔹 clear(): void
Clears the entire cache.

```ts
await cache.clear();
```

🔹 size(): number
Returns the number of stored items.
```ts
console.log(cache.size()); // 5
```

## 🚀 Performance Benchmarks
ZapCache is optimized for speed and efficiency:
- 100,000 cache set operations → ~8ms
- 100,000 cache get operations → ~6ms 
⚡ Ideal for real-time apps & high-performance APIs.

## 🎯 Use Cases
- ✅ API Response Caching – Store frequently used API responses to reduce latency
- ✅ Session Management – Keep user sessions in memory for quick access
- ✅ Rate Limiting – Track API usage per user
- ✅ Job Queues – Maintain in-memory queue state
- ✅ Temporary Storage – Store data for short-lived processes

## 🏗 Advanced Features
Pre-Filling Cache on Startup

```ts
const users = await fetchUsersFromDB();
users.forEach(user => cache.set(`user_${user.id}`, user, 60000));
```

Cache Expiry Handling

```ts
cache.set("tempData", "This is temporary", 3000);
setTimeout(() => {
    if (!cache.has("tempData")) {
        console.log("Temp data has expired!");
    }
}, 4000);
```

## 🔐 Security Considerations
⚠️ Do not store sensitive user data (passwords, private keys) in cache

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
npm install
npm test
```

## 📄 [License](https://github.com/okarachidera/zapcache/blob/main/LICENSE)
ZapCache is released under the MIT License. See the LICENSE file for details.

💬 Support & Community
💡 Found a bug? Open an issue.
⭐ If you like ZapCache, give it a star on GitHub! 😊

🚀 Happy Caching! ⚡
