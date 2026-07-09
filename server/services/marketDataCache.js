/**
 * In-memory TTL cache for LEGO market data.
 * Designed for easy replacement with Redis later — swap the store backend
 * while keeping the same get/set/getStats interface.
 */
class MemoryMarketDataCache {
  constructor({ ttlMs = 5 * 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;
    /** @type {Map<string, { value: object, expiresAt: number }>} */
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses += 1;
      return null;
    }

    this.stats.hits += 1;
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
    this.stats.sets += 1;
  }

  getStats() {
    this.pruneExpired();
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.store.size,
      ttlMs: this.ttlMs,
    };
  }

  pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

module.exports = { MemoryMarketDataCache };
