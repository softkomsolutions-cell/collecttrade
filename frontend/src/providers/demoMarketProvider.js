import { createSetMarketData } from "../models/setMarketData";
import { MARKET_DATA_SOURCES } from "../services/marketDataSources";
import { resolveMarketDataImages } from "../services/marketDataImages";
import { DEMO_SET_NUMBER_MAP, DEMO_SET_PROFILES } from "./demoMarketData";
import { RETIREMENT_DEMO_CATALOG } from "../retirementIntelligenceData";

function normalizeSetNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function deriveDemoMarketPrice(retailPrice, expectedRoi = 0) {
  const retail = Number(retailPrice) || 0;
  if (!retail) {
    return 0;
  }
  const uplift = 1 + Math.max(0, Number(expectedRoi) || 0) / 200;
  return Math.round(retail * uplift);
}

function profileToMarketData(setNumber, profile, catalogItem = null) {
  const retailPrice = Number(catalogItem?.retailPrice ?? profile.retailPrice ?? catalogItem?.price) || 0;
  const marketPrice = Number(catalogItem?.price ?? deriveDemoMarketPrice(retailPrice, profile.expectedRoi)) || retailPrice;
  const images = resolveMarketDataImages({
    setNumber,
    imageUrl: profile.imageUrl,
  });

  return createSetMarketData({
    id: catalogItem?.id || DEMO_SET_NUMBER_MAP[setNumber] || `lego-set-${setNumber}`,
    setNumber,
    name: profile.name || catalogItem?.name,
    theme: profile.theme || catalogItem?.category || "LEGO",
    retailPrice,
    marketPrice,
    brickEconomyValue: marketPrice,
    retirementStatus: profile.retirementStatus || catalogItem?.actualRetirementDate ? "Retired" : "Active",
    estimatedRetirement: profile.estimatedRetirement || catalogItem?.expectedRetirementDate || null,
    lastUpdated: new Date().toISOString(),
    imageUrl: images.imageUrl,
    thumbnailUrl: images.thumbnailUrl,
    placeholderImageUrl: images.placeholderImageUrl,
    source: MARKET_DATA_SOURCES.DEMO,
    confidence: 55,
    pieces: profile.pieces,
    minifigures: profile.minifigures,
    brickEconomyStatus: profile.brickEconomyStatus,
    investmentHorizon: profile.investmentHorizon,
    expectedRoi: profile.expectedRoi,
  });
}

function catalogItemToMarketData(item) {
  const setNumber = normalizeSetNumber(item.sku || item.id);
  const profile = DEMO_SET_PROFILES[setNumber] || {
    name: item.name,
    theme: item.category,
    retailPrice: item.retailPrice ?? item.price,
    expectedRoi: 20,
    estimatedRetirement: item.expectedRetirementDate,
  };
  return profileToMarketData(setNumber, profile, item);
}

/**
 * Demo market data provider — used when live APIs are unavailable.
 */
export class DemoMarketProvider {
  constructor() {
    this.catalogBySetNumber = this.buildCatalogIndex();
  }

  buildCatalogIndex() {
    /** @type {Map<string, import('../models/setMarketData').SetMarketData>} */
    const index = new Map();

    Object.entries(DEMO_SET_PROFILES).forEach(([setNumber, profile]) => {
      const catalogItem = RETIREMENT_DEMO_CATALOG.find(
        (item) => normalizeSetNumber(item.sku) === setNumber,
      );
      index.set(setNumber, profileToMarketData(setNumber, profile, catalogItem));
    });

    RETIREMENT_DEMO_CATALOG.forEach((item) => {
      const setNumber = normalizeSetNumber(item.sku);
      if (!setNumber || index.has(setNumber)) {
        return;
      }
      index.set(setNumber, catalogItemToMarketData(item));
    });

    return index;
  }

  /**
   * @param {string} setNumber
   * @returns {import('../models/setMarketData').SetMarketData|null}
   */
  getSet(setNumber) {
    const normalized = normalizeSetNumber(setNumber);
    if (!normalized) {
      return null;
    }
    return this.catalogBySetNumber.get(normalized) || null;
  }

  /**
   * @returns {import('../models/setMarketData').SetMarketData[]}
   */
  getAllSets() {
    return Array.from(this.catalogBySetNumber.values());
  }

  /**
   * @param {string[]} setNumbers
   * @returns {import('../models/setMarketData').SetMarketData[]}
   */
  getSets(setNumbers = []) {
    return setNumbers
      .map((setNumber) => this.getSet(setNumber))
      .filter(Boolean);
  }
}

export const demoMarketProvider = new DemoMarketProvider();
