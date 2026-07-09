/**
 * Lightweight in-memory cache for LEGO market data responses.
 */
export const CACHE_STATES = {
  LOADING: "loading",
  LOADED: "loaded",
  STALE: "stale",
  ERROR: "error",
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * @typedef {Object} CacheEntry
 * @property {string} state
 * @property {import('../models/setMarketData').SetMarketData|null} data
 * @property {string|null} error
 * @property {number|null} fetchedAt
 * @property {number|null} expiresAt
 */

export class MarketDataCache {
  constructor({ ttlMs = DEFAULT_TTL_MS } = {}) {
    this.ttlMs = ttlMs;
    /** @type {Map<string, CacheEntry>} */
    this.entries = new Map();
    /** @type {Set<(setNumber: string, entry: CacheEntry) => void>} */
    this.listeners = new Set();
  }

  normalizeKey(setNumber) {
    return String(setNumber || "")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
  }

  notify(setNumber, entry) {
    this.listeners.forEach((listener) => {
      listener(setNumber, entry);
    });
  }

  getEntry(setNumber) {
    const key = this.normalizeKey(setNumber);
    if (!key) {
      return {
        state: CACHE_STATES.ERROR,
        data: null,
        error: "Invalid set number",
        fetchedAt: null,
        expiresAt: null,
      };
    }

    const entry = this.entries.get(key);
    if (!entry) {
      return {
        state: CACHE_STATES.LOADING,
        data: null,
        error: null,
        fetchedAt: null,
        expiresAt: null,
      };
    }

    if (entry.state === CACHE_STATES.LOADING) {
      return entry;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      const staleEntry = { ...entry, state: CACHE_STATES.STALE };
      this.entries.set(key, staleEntry);
      return staleEntry;
    }

    return entry;
  }

  setLoading(setNumber) {
    const key = this.normalizeKey(setNumber);
    const entry = {
      state: CACHE_STATES.LOADING,
      data: null,
      error: null,
      fetchedAt: null,
      expiresAt: null,
    };
    this.entries.set(key, entry);
    this.notify(key, entry);
    return entry;
  }

  setLoaded(setNumber, data) {
    const key = this.normalizeKey(setNumber);
    const now = Date.now();
    const entry = {
      state: CACHE_STATES.LOADED,
      data,
      error: null,
      fetchedAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.entries.set(key, entry);
    this.notify(key, entry);
    return entry;
  }

  setError(setNumber, error, fallbackData = null) {
    const key = this.normalizeKey(setNumber);
    const entry = {
      state: fallbackData ? CACHE_STATES.LOADED : CACHE_STATES.ERROR,
      data: fallbackData,
      error: String(error || "Unknown market data error"),
      fetchedAt: fallbackData ? Date.now() : null,
      expiresAt: fallbackData ? Date.now() + this.ttlMs : null,
    };
    this.entries.set(key, entry);
    this.notify(key, entry);
    return entry;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.entries.clear();
  }
}
