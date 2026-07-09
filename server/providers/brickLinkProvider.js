const { MARKET_DATA_SOURCES } = require("../constants/marketDataSources");

/**
 * BrickLink market data provider.
 * TODO: Implement BrickLink API integration.
 *   - Authenticate with BRICK_LINK_CONSUMER_KEY / BRICK_LINK_TOKEN
 *   - Fetch catalog item and price guide data for set number
 *   - Map min/max/avg used/new prices to SetMarketData fields
 *   - Normalize currency to ZAR or configured locale
 */
async function getSet(_setNumber) {
  return null;
}

module.exports = {
  id: "brickLink",
  source: MARKET_DATA_SOURCES.BRICK_LINK,
  getSet,
};
