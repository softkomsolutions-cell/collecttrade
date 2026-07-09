import { MARKET_DATA_SOURCES } from "../services/marketDataSources";

/**
 * Canonical LEGO set market record consumed by all Brick Alpha workspaces.
 * @typedef {Object} SetMarketData
 * @property {string} setNumber
 * @property {string} name
 * @property {string} theme
 * @property {number} retailPrice
 * @property {number} marketPrice
 * @property {number} lowestPrice
 * @property {number} highestPrice
 * @property {number|null} brickEconomyValue
 * @property {string} retirementStatus
 * @property {string|null} estimatedRetirement
 * @property {string|null} lastUpdated
 * @property {string|null} imageUrl
 * @property {string|null} thumbnailUrl
 * @property {string|null} placeholderImageUrl
 * @property {string} source
 * @property {number} confidence
 * @property {string} [id]
 * @property {number} [pieces]
 * @property {number} [minifigures]
 * @property {string} [brickEconomyStatus]
 * @property {string} [investmentHorizon]
 * @property {number} [expectedRoi]
 */

export const SET_MARKET_DATA_FIELDS = [
  "setNumber",
  "name",
  "theme",
  "retailPrice",
  "marketPrice",
  "lowestPrice",
  "highestPrice",
  "brickEconomyValue",
  "retirementStatus",
  "estimatedRetirement",
  "lastUpdated",
  "imageUrl",
  "thumbnailUrl",
  "placeholderImageUrl",
  "source",
  "confidence",
];

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
 * @param {Partial<SetMarketData> & { setNumber?: string, sku?: string }} input
 * @returns {SetMarketData}
 */
export function createSetMarketData(input = {}) {
  const setNumber = normalizeSetNumber(input.setNumber || input.sku);
  const retailPrice = numberOrZero(input.retailPrice ?? input.price);
  const marketPrice = numberOrZero(
    input.marketPrice ?? input.currentMarketValue ?? input.price ?? retailPrice,
  );
  const spread = derivePriceSpread(marketPrice, retailPrice);

  return {
    id: input.id || (setNumber ? `lego-set-${setNumber}` : ""),
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
    lastUpdated: input.lastUpdated || null,
    imageUrl: input.imageUrl || null,
    thumbnailUrl: input.thumbnailUrl || input.imageUrl || null,
    placeholderImageUrl: input.placeholderImageUrl || null,
    source: input.source || MARKET_DATA_SOURCES.DEMO,
    confidence: clamp(numberOrZero(input.confidence ?? (input.source === MARKET_DATA_SOURCES.DEMO ? 55 : 72))),
    pieces: input.pieces,
    minifigures: input.minifigures,
    brickEconomyStatus: input.brickEconomyStatus,
    investmentHorizon: input.investmentHorizon,
    expectedRoi: input.expectedRoi,
  };
}

/**
 * @param {unknown} value
 * @returns {value is SetMarketData}
 */
export function isSetMarketData(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.setNumber === "string" &&
      typeof value.name === "string" &&
      typeof value.source === "string",
  );
}
