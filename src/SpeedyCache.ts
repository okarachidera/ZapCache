class SpeedyCache<T = any> {
  private cache: Map<string, { value: T; expiry: number | null }> = new Map();

  set(key: string, value: T, ttl?: number): void {
    const expiry = ttl ? Date.now() + ttl : null;
    this.cache.set(key, { value, expiry });

    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export default SpeedyCache;
