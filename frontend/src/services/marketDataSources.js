/**
 * Supported market data source identifiers for Brick Alpha RC2.
 * Every SetMarketData record carries one of these source values.
 */
export const MARKET_DATA_SOURCES = {
  BRICK_ECONOMY: "BrickEconomy",
  BRICK_LINK: "BrickLink",
  REBRICKABLE: "Rebrickable",
  MANUAL: "Manual",
  DEMO: "Demo",
};

export const MARKET_DATA_SOURCE_BADGES = {
  [MARKET_DATA_SOURCES.BRICK_ECONOMY]: {
    id: MARKET_DATA_SOURCES.BRICK_ECONOMY,
    label: "BrickEconomy",
    tone: "live",
  },
  [MARKET_DATA_SOURCES.BRICK_LINK]: {
    id: MARKET_DATA_SOURCES.BRICK_LINK,
    label: "BrickLink",
    tone: "live",
  },
  [MARKET_DATA_SOURCES.REBRICKABLE]: {
    id: MARKET_DATA_SOURCES.REBRICKABLE,
    label: "Rebrickable",
    tone: "catalog",
  },
  [MARKET_DATA_SOURCES.MANUAL]: {
    id: MARKET_DATA_SOURCES.MANUAL,
    label: "Manual",
    tone: "manual",
  },
  [MARKET_DATA_SOURCES.DEMO]: {
    id: MARKET_DATA_SOURCES.DEMO,
    label: "Demo",
    tone: "demo",
  },
};

/**
 * @param {string} source
 * @returns {{ id: string, label: string, tone: string }}
 */
export function getMarketDataSourceBadge(source) {
  return (
    MARKET_DATA_SOURCE_BADGES[source] || {
      id: source || MARKET_DATA_SOURCES.DEMO,
      label: source || "Demo",
      tone: "demo",
    }
  );
}

/**
 * Map legacy workspace dataSource values to canonical source badges.
 * @param {string} legacySource
 * @returns {string}
 */
export function normalizeLegacyDataSource(legacySource) {
  const normalized = String(legacySource || "").trim().toLowerCase();
  if (normalized === "live" || normalized === "brickeconomy") {
    return MARKET_DATA_SOURCES.BRICK_ECONOMY;
  }
  if (normalized === "bricklink") {
    return MARKET_DATA_SOURCES.BRICK_LINK;
  }
  if (normalized === "rebrickable") {
    return MARKET_DATA_SOURCES.REBRICKABLE;
  }
  if (normalized === "manual") {
    return MARKET_DATA_SOURCES.MANUAL;
  }
  return MARKET_DATA_SOURCES.DEMO;
}
