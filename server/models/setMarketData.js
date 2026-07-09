const { MARKET_DATA_SOURCES } = require("../constants/marketDataSources");

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSetNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function derivePriceSpread(marketPrice, retailPrice) {
  const anchor = Math.max(marketPrice, retailPrice, 1);
  return Math.max(anchor * 0.08, 120);
}

/**
 * Build a normalized SetMarketData record from partial inputs.
 * @param {object} input
 * @returns {object}
 */
function createSetMarketData(input = {}) {
  const setNumber = normalizeSetNumber(input.setNumber || input.sku);
  const retailPrice = numberOrZero(input.retailPrice ?? input.price);
  const marketPrice = numberOrZero(
    input.marketPrice ?? input.currentMarketValue ?? input.price ?? retailPrice,
  );
  const spread = derivePriceSpread(marketPrice, retailPrice);

  return {
    setNumber,
    name: String(input.name || "Unknown LEGO Set"),
    theme: String(input.theme || input.category || "LEGO"),
    retailPrice,
    marketPrice,
    lowestPrice: numberOrZero(input.lowestPrice ?? Math.round(marketPrice - spread * 0.6)),
    highestPrice: numberOrZero(input.highestPrice ?? Math.round(marketPrice + spread * 0.9)),
    brickEconomyValue:
      input.brickEconomyValue === null || input.brickEconomyValue === undefined
        ? marketPrice
        : numberOrZero(input.brickEconomyValue),
    retirementStatus: String(input.retirementStatus || "Active"),
    estimatedRetirement: input.estimatedRetirement ?? input.expectedRetirementDate ?? null,
    lastUpdated: input.lastUpdated || new Date().toISOString(),
    imageUrl: input.imageUrl || null,
    thumbnailUrl: input.thumbnailUrl || input.imageUrl || null,
    source: input.source || MARKET_DATA_SOURCES.DEMO,
    confidence: clamp(
      numberOrZero(input.confidence ?? (input.source === MARKET_DATA_SOURCES.DEMO ? 55 : 72)),
    ),
  };
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isSetMarketData(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.setNumber === "string" &&
      typeof value.name === "string" &&
      typeof value.source === "string",
  );
}

module.exports = {
  createSetMarketData,
  isSetMarketData,
  normalizeSetNumber,
};
