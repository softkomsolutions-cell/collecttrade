import { createSetMarketData, isSetMarketData } from "../models/setMarketData";
import { CACHE_STATES, MarketDataCache } from "./marketDataCache";
import { MARKET_DATA_SOURCES, getMarketDataSourceBadge, normalizeLegacyDataSource } from "./marketDataSources";
import { formatLastUpdatedLabel, formatMarketDataTimestamp } from "./marketDataTimestamps";
import { resolveMarketDataImages } from "./marketDataImages";
import { demoMarketProvider } from "../providers/demoMarketProvider";

const LIVE_API_ENABLED = false;
const LIVE_API_BASE = "/api/market-data";

function normalizeSetNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

/**
 * Unified Market Data Service for Brick Alpha.
 * All workspaces should consume LEGO market data through this service.
 */
class MarketDataService {
  constructor() {
    this.cache = new MarketDataCache({ ttlMs: 5 * 60 * 1000 });
    this.demoProvider = demoMarketProvider;
    /** @type {Promise<void>|null} */
    this.preloadPromise = null;
  }

  getCacheEntry(setNumber) {
    return this.cache.getEntry(setNumber);
  }

  subscribe(listener) {
    return this.cache.subscribe(listener);
  }

  /**
   * Synchronous read from cache or demo catalog. Never throws.
   * @param {string} setNumber
   * @returns {import('../models/setMarketData').SetMarketData|null}
   */
  getSetSync(setNumber) {
    const normalized = normalizeSetNumber(setNumber);
    if (!normalized) {
      return null;
    }

    const cached = this.cache.getEntry(normalized);
    if (cached.data && isSetMarketData(cached.data)) {
      return cached.data;
    }

    const demo = this.demoProvider.getSet(normalized);
    if (demo) {
      return demo;
    }

    return null;
  }

  /**
   * @param {string} setNumber
   * @param {{ forceRefresh?: boolean }} [options]
   * @returns {Promise<import('../models/setMarketData').SetMarketData|null>}
   */
  async getSet(setNumber, options = {}) {
    const normalized = normalizeSetNumber(setNumber);
    if (!normalized) {
      return null;
    }

    const existing = this.cache.getEntry(normalized);
    if (
      !options.forceRefresh &&
      existing.state === CACHE_STATES.LOADED &&
      existing.data
    ) {
      return existing.data;
    }

    this.cache.setLoading(normalized);

    try {
      const live = await this.fetchLiveSet(normalized);
      if (live) {
        const normalizedLive = this.finalizeRecord(live);
        this.cache.setLoaded(normalized, normalizedLive);
        return normalizedLive;
      }
    } catch (error) {
      const fallback = this.getDemoFallback(normalized);
      this.cache.setError(normalized, error, fallback);
      return fallback;
    }

    const fallback = this.getDemoFallback(normalized);
    if (fallback) {
      this.cache.setLoaded(normalized, fallback);
      return fallback;
    }

    this.cache.setError(normalized, "Set not found");
    return null;
  }

  /**
   * @param {string[]} [setNumbers]
   * @returns {Promise<void>}
   */
  async preload(setNumbers) {
    const targets =
      setNumbers && setNumbers.length
        ? setNumbers.map(normalizeSetNumber).filter(Boolean)
        : this.demoProvider.getAllSets().map((item) => item.setNumber);

    if (!this.preloadPromise) {
      this.preloadPromise = Promise.all(targets.map((setNumber) => this.getSet(setNumber))).then(() => {});
    }

    return this.preloadPromise;
  }

  /**
   * @param {string[]} setNumbers
   * @returns {Promise<import('../models/setMarketData').SetMarketData[]>}
   */
  async getSets(setNumbers = []) {
    const results = await Promise.all(setNumbers.map((setNumber) => this.getSet(setNumber)));
    return results.filter(Boolean);
  }

  /**
   * @returns {import('../models/setMarketData').SetMarketData[]}
   */
  getAllDemoSets() {
    return this.demoProvider.getAllSets();
  }

  getDemoFallback(setNumber) {
    return this.demoProvider.getSet(setNumber);
  }

  async fetchLiveSet(setNumber) {
    if (!LIVE_API_ENABLED) {
      return null;
    }

    const response = await fetch(`${LIVE_API_BASE}/${encodeURIComponent(setNumber)}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Live market data unavailable (${response.status})`);
    }

    const payload = await response.json();
    return createSetMarketData({
      ...payload,
      setNumber,
      source: payload.source || MARKET_DATA_SOURCES.BRICK_ECONOMY,
    });
  }

  finalizeRecord(record) {
    const images = resolveMarketDataImages(record);
    return createSetMarketData({
      ...record,
      ...images,
      lastUpdated: record.lastUpdated || new Date().toISOString(),
    });
  }

  formatLastUpdated(value, now = new Date()) {
    return formatLastUpdatedLabel(value, now);
  }

  formatTimestamp(value, now = new Date()) {
    return formatMarketDataTimestamp(value, now);
  }

  getSourceBadge(source) {
    return getMarketDataSourceBadge(source);
  }

  normalizeLegacySource(legacySource) {
    return normalizeLegacyDataSource(legacySource);
  }

  resolveImages(record) {
    return resolveMarketDataImages(record);
  }

  /**
   * Adapter: legacy Scan & Evaluate demo profile shape.
   * @param {import('../models/setMarketData').SetMarketData|null} record
   */
  toScanDemoProfile(record) {
    if (!record) {
      return null;
    }

    return {
      name: record.name,
      theme: record.theme,
      pieces: record.pieces,
      minifigures: record.minifigures,
      retailPrice: record.retailPrice,
      imageUrl: record.imageUrl,
      brickEconomyStatus: record.brickEconomyStatus || "Tracked",
      investmentHorizon: record.investmentHorizon || "2–4 years",
      expectedRoi: record.expectedRoi ?? 24,
    };
  }

  /**
   * Adapter: fields to merge into collectible/enriched records without changing scoring.
   * @param {import('../models/setMarketData').SetMarketData|null} record
   */
  toCollectibleOverlay(record) {
    if (!record) {
      return {};
    }

    return {
      sku: record.setNumber,
      price: record.marketPrice,
      currentMarketValue: record.marketPrice,
      retailPrice: record.retailPrice,
      imageUrl: record.imageUrl,
      expectedRetirementDate: record.estimatedRetirement,
      marketDataSource: record.source,
      marketDataLastUpdated: record.lastUpdated,
      marketDataConfidence: record.confidence,
    };
  }

  /**
   * @param {object} collectible
   * @returns {string}
   */
  resolveSourceForCollectible(collectible) {
    if (collectible?.marketDataSource) {
      return collectible.marketDataSource;
    }
    if (collectible?.dataSource === "live") {
      return MARKET_DATA_SOURCES.BRICK_ECONOMY;
    }
    return MARKET_DATA_SOURCES.DEMO;
  }
}

export const marketDataService = new MarketDataService();

export { CACHE_STATES, MARKET_DATA_SOURCES };
