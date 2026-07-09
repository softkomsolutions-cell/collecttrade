const { createSetMarketData, normalizeSetNumber } = require("../models/setMarketData");
const { MARKET_DATA_SOURCES } = require("../constants/marketDataSources");
const { resolveMarketDataImages } = require("../utils/marketDataImages");
const { DEMO_SET_NUMBER_MAP, DEMO_SET_PROFILES } = require("../data/demoSetProfiles");
const { RETIREMENT_DEMO_CATALOG } = require("../data/retirementDemoCatalog");

function deriveDemoMarketPrice(retailPrice, expectedRoi = 0) {
  const retail = Number(retailPrice) || 0;
  if (!retail) {
    return 0;
  }
  const uplift = 1 + Math.max(0, Number(expectedRoi) || 0) / 200;
  return Math.round(retail * uplift);
}

function profileToMarketData(setNumber, profile, catalogItem = null) {
  const retailPrice =
    Number(catalogItem?.retailPrice ?? profile.retailPrice ?? catalogItem?.price) || 0;
  const marketPrice =
    Number(catalogItem?.price ?? deriveDemoMarketPrice(retailPrice, profile.expectedRoi)) ||
    retailPrice;
  const images = resolveMarketDataImages({
    setNumber,
    imageUrl: profile.imageUrl,
  });

  return createSetMarketData({
    setNumber,
    name: profile.name || catalogItem?.name,
    theme: profile.theme || catalogItem?.category || "LEGO",
    retailPrice,
    marketPrice,
    brickEconomyValue: marketPrice,
    retirementStatus:
      profile.retirementStatus || catalogItem?.actualRetirementDate ? "Retired" : "Active",
    estimatedRetirement: profile.estimatedRetirement || catalogItem?.expectedRetirementDate || null,
    lastUpdated: new Date().toISOString(),
    imageUrl: images.imageUrl,
    thumbnailUrl: images.thumbnailUrl,
    source: MARKET_DATA_SOURCES.DEMO,
    confidence: 55,
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

function buildCatalogIndex() {
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

const catalogBySetNumber = buildCatalogIndex();

/**
 * Demo market data provider — returns canonical demo LEGO set records.
 * @param {string} setNumber
 * @returns {object|null}
 */
function getSet(setNumber) {
  const normalized = normalizeSetNumber(setNumber);
  if (!normalized) {
    return null;
  }
  return catalogBySetNumber.get(normalized) || null;
}

function getAllSets() {
  return Array.from(catalogBySetNumber.values());
}

module.exports = {
  id: "demo",
  getSet,
  getAllSets,
  DEMO_SET_NUMBER_MAP,
};
