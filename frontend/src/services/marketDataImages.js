const LEGO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'%3E%3Crect width='320' height='240' fill='%23f3f4f6'/%3E%3Crect x='96' y='88' width='128' height='64' rx='8' fill='%23d1d5db'/%3E%3Ctext x='160' y='178' text-anchor='middle' fill='%236b7280' font-family='Arial,sans-serif' font-size='14'%3ELEGO Set%3C/text%3E%3C/svg%3E";

function normalizeSetNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

/**
 * Standard Brickset image URL for a LEGO set number.
 * @param {string} setNumber
 * @returns {string|null}
 */
export function bricksetImageUrl(setNumber) {
  const normalized = normalizeSetNumber(setNumber);
  if (!normalized) {
    return null;
  }
  return `https://images.brickset.com/sets/images/${normalized}-1.jpg`;
}

/**
 * Resolve standardized image fields for a market data record.
 * @param {Partial<import('../models/setMarketData').SetMarketData>} record
 * @returns {{ imageUrl: string, thumbnailUrl: string, placeholderImageUrl: string }}
 */
export function resolveMarketDataImages(record = {}) {
  const setNumber = normalizeSetNumber(record.setNumber);
  const imageUrl = record.imageUrl || bricksetImageUrl(setNumber) || LEGO_PLACEHOLDER;
  const thumbnailUrl = record.thumbnailUrl || imageUrl;
  const placeholderImageUrl = record.placeholderImageUrl || LEGO_PLACEHOLDER;

  return {
    imageUrl,
    thumbnailUrl,
    placeholderImageUrl,
  };
}

export { LEGO_PLACEHOLDER as MARKET_DATA_PLACEHOLDER_IMAGE };
