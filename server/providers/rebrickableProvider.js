const { MARKET_DATA_SOURCES } = require("../constants/marketDataSources");

/**
 * Rebrickable catalog provider.
 * TODO: Implement Rebrickable API integration.
 *   - Authenticate with REBRICKABLE_API_KEY
 *   - Fetch set metadata (name, theme, piece count, image)
 *   - Supplement with pricing from secondary source or cached values
 *   - Map to SetMarketData with catalog-only confidence score
 */
async function getSet(_setNumber) {
  return null;
}

module.exports = {
  id: "rebrickable",
  source: MARKET_DATA_SOURCES.REBRICKABLE,
  getSet,
};
