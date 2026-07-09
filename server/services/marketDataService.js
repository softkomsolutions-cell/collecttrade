const { normalizeSetNumber, isSetMarketData } = require("../models/setMarketData");
const { MARKET_DATA_SOURCES } = require("../constants/marketDataSources");
const { MemoryMarketDataCache } = require("./marketDataCache");
const demoProvider = require("../providers/demoProvider");
const brickEconomyProvider = require("../providers/brickEconomyProvider");
const brickLinkProvider = require("../providers/brickLinkProvider");
const rebrickableProvider = require("../providers/rebrickableProvider");

const LIVE_API_ENABLED =
  String(process.env.LIVE_API_ENABLED || "").toLowerCase() === "true";
const MARKET_PROVIDER = String(process.env.MARKET_PROVIDER || "demo").toLowerCase();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL || 5 * 60 * 1000);

const PROVIDER_REGISTRY = {
  demo: demoProvider,
  brickeconomy: brickEconomyProvider,
  bricklink: brickLinkProvider,
  rebrickable: rebrickableProvider,
};

const PROVIDER_CHAIN_ORDER = ["brickEconomy", "brickLink", "rebrickable"];

function logMarketData(event, details = {}) {
  console.log(
    JSON.stringify({
      component: "marketDataService",
      event,
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
}

function resolveProviderChain() {
  const preferred = PROVIDER_REGISTRY[MARKET_PROVIDER];
  if (!preferred || preferred.id === "demo") {
    return LIVE_API_ENABLED ? PROVIDER_CHAIN_ORDER.map((id) => PROVIDER_REGISTRY[id]) : [];
  }

  const chain = [preferred];
  PROVIDER_CHAIN_ORDER.forEach((id) => {
    const provider = PROVIDER_REGISTRY[id];
    if (provider && provider !== preferred) {
      chain.push(provider);
    }
  });
  return chain;
}

class MarketDataService {
  constructor() {
    this.cache = new MemoryMarketDataCache({ ttlMs: CACHE_TTL_MS });
    this.providerChain = resolveProviderChain();
    this.lastProviderUsed = "demo";
    this.fallbackCount = 0;
    this.requestCount = 0;
  }

  getDemoFallback(setNumber) {
    return demoProvider.getSet(setNumber);
  }

  async tryProviderChain(setNumber) {
    if (!LIVE_API_ENABLED || this.providerChain.length === 0) {
      return null;
    }

    for (const provider of this.providerChain) {
      try {
        const result = await provider.getSet(setNumber);
        if (result && isSetMarketData(result)) {
          this.lastProviderUsed = provider.id;
          logMarketData("provider_used", { setNumber, provider: provider.id });
          return result;
        }
      } catch (error) {
        logMarketData("provider_error", {
          setNumber,
          provider: provider.id,
          message: error.message,
        });
      }
    }

    return null;
  }

  /**
   * Fetch normalized SetMarketData for a LEGO set number.
   * Never throws — always returns data or null.
   * @param {string} setNumber
   * @returns {Promise<object|null>}
   */
  async getSet(setNumber) {
    const normalized = normalizeSetNumber(setNumber);
    if (!normalized) {
      return null;
    }

    this.requestCount += 1;

    const cached = this.cache.get(normalized);
    if (cached) {
      logMarketData("cache_hit", { setNumber: normalized });
      return cached;
    }

    logMarketData("cache_miss", { setNumber: normalized });

    let record = null;

    try {
      record = await this.tryProviderChain(normalized);
    } catch (error) {
      logMarketData("provider_chain_error", {
        setNumber: normalized,
        message: error.message,
      });
    }

    if (!record) {
      const triedLive = LIVE_API_ENABLED && this.providerChain.length > 0;
      record = this.getDemoFallback(normalized);

      if (record) {
        this.lastProviderUsed = "demo";

        if (triedLive) {
          this.fallbackCount += 1;
          logMarketData("fallback_used", { setNumber: normalized, provider: "demo" });
        } else {
          logMarketData("provider_used", { setNumber: normalized, provider: "demo" });
        }
      }
    }

    if (record) {
      this.cache.set(normalized, record);
    }

    return record;
  }

  getHealthSnapshot() {
    const cacheStats = this.cache.getStats();
    const liveProvidersConfigured = LIVE_API_ENABLED && this.providerChain.length > 0;

    return {
      status: "online",
      provider: this.lastProviderUsed,
      configuredProvider: MARKET_PROVIDER,
      liveApiEnabled: LIVE_API_ENABLED,
      cache: {
        status: "online",
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        entries: cacheStats.entries,
        ttlMs: cacheStats.ttlMs,
      },
      mode: liveProvidersConfigured ? "hybrid" : "demo",
      requestCount: this.requestCount,
      fallbackCount: this.fallbackCount,
    };
  }
}

const marketDataService = new MarketDataService();

module.exports = {
  marketDataService,
  MarketDataService,
  LIVE_API_ENABLED,
  MARKET_PROVIDER,
  CACHE_TTL_MS,
  MARKET_DATA_SOURCES,
};
