const brickEconomy = require("./brickeconomyService");
const brickLink = require("./bricklinkService");
const rateLimits = require("./rateLimitManager");

const VALUATION_CACHE_TTL_MS = Number(process.env.LEGO_VALUATION_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const USD_ZAR_RATE = Number(process.env.USD_ZAR_RATE || 17.8);
const cache = new Map();

const BETA_BENCHMARKS = {
  "40766": {
    name: "Tribute to Jane Austen's Books",
    currentValueUSD: 58,
    rarity: "Gift With Purchase",
    notes: [
      "Short-run LEGO Gift With Purchase release.",
      "Exclusive Jane Austen minifigure and literary display appeal.",
      "Benchmark fallback only: connect BrickLink or BrickEconomy for a fresh market quote.",
    ],
  },
};

function asPositiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function pickFirstNumber(values) {
  for (const value of values) {
    const numeric = asPositiveNumber(value);
    if (numeric) {
      return numeric;
    }
  }
  return null;
}

function priceFromBrickLink(payload) {
  return pickFirstNumber([
    payload?.sold?.avg_price,
    payload?.sold?.unit_quantity_average,
    payload?.stock?.avg_price,
  ]);
}

function priceFromBrickEconomy(payload) {
  const data = payload?.data || {};
  return pickFirstNumber([
    data?.currentValue,
    data?.current_value,
    data?.current_value_new,
    data?.value?.newSealed,
    data?.value?.new,
    data?.marketValue?.new,
    data?.market_value?.new,
    data?.prices?.new,
  ]);
}

function nameFromBrickEconomy(payload, setNum) {
  const data = payload?.data || {};
  return String(data?.name || data?.setName || data?.title || `LEGO Set ${setNum}`);
}

function buildProjection(currentValueZAR, annualGrowthPercent, years) {
  return Math.round(currentValueZAR * (1 + annualGrowthPercent / 100) ** years);
}

function scoreValuation({ discountPercent, dataConfidence, isGwp }) {
  const confidencePoints = dataConfidence === "live" ? 1.3 : dataConfidence === "benchmark" ? 0.5 : 0;
  const discountPoints = Math.min(5, Math.max(0, discountPercent / 18));
  const scarcityPoints = isGwp ? 1.2 : 0.4;
  return Math.min(10, Math.max(1, Number((2.5 + confidencePoints + discountPoints + scarcityPoints).toFixed(1))));
}

function recommendationForScore(score) {
  if (score >= 9) return "Exceptional Buy";
  if (score >= 7.5) return "Strong Buy";
  if (score >= 6) return "Watchlist";
  return "Pass for now";
}

function sourceView(id, label, response) {
  return {
    id,
    label,
    status: response?.ok ? (response.cache === "stale" ? "stale" : "live") : "unavailable",
    detail: response?.ok
      ? response.cache === "stale"
        ? "Using the last cached response while the source is unavailable."
        : "Fresh source response included in this valuation."
      : response?.reason || response?.error || "No source response available.",
  };
}

async function getLegoValuation(input) {
  const setNum = String(input?.setNum || "").trim().split("-")[0];
  const purchasePriceZAR = asPositiveNumber(input?.purchasePriceZAR);

  if (!/^\d{3,8}$/.test(setNum)) {
    throw new Error("lego_set_number_required");
  }
  if (!purchasePriceZAR) {
    throw new Error("purchase_price_required");
  }

  const cacheKey = `${setNum}:${purchasePriceZAR}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, cache: "fresh" };
  }

  const [brickLinkResponse, brickEconomyResponse] = await Promise.all([
    brickLink.getPriceGuide(setNum),
    brickEconomy.getSet(setNum),
  ]);
  const benchmark = BETA_BENCHMARKS[setNum] || null;
  const brickLinkPrice = priceFromBrickLink(brickLinkResponse);
  const brickEconomyPrice = priceFromBrickEconomy(brickEconomyResponse);
  const prices = [brickLinkPrice, brickEconomyPrice].filter(Boolean);
  const livePriceUSD = prices.length
    ? prices.reduce((sum, price) => sum + price, 0) / prices.length
    : null;
  const currentValueUSD = livePriceUSD || benchmark?.currentValueUSD || null;

  if (!currentValueUSD) {
    throw new Error("lego_market_data_unavailable");
  }

  const dataConfidence = livePriceUSD ? "live" : "benchmark";
  const currentValueZAR = Math.round(currentValueUSD * USD_ZAR_RATE);
  const profitZAR = currentValueZAR - purchasePriceZAR;
  const discountPercent = (profitZAR / currentValueZAR) * 100;
  const multiplier = currentValueZAR / purchasePriceZAR;
  const isGwp = benchmark?.rarity === "Gift With Purchase";
  const annualGrowthPercent = isGwp ? 8 : 6;
  const score = scoreValuation({ discountPercent, dataConfidence, isGwp });
  const valuation = {
    ok: true,
    setNum,
    name: benchmark?.name || nameFromBrickEconomy(brickEconomyResponse, setNum),
    purchasePriceZAR,
    currentValueZAR,
    currentValueUSD: Number(currentValueUSD.toFixed(2)),
    usdZarRate: USD_ZAR_RATE,
    profitZAR: Math.round(profitZAR),
    multiplier: Number(multiplier.toFixed(1)),
    score,
    recommendation: recommendationForScore(score),
    confidence: dataConfidence,
    rarity: benchmark?.rarity || "Standard Set",
    projections: {
      oneYear: buildProjection(currentValueZAR, annualGrowthPercent, 1),
      fiveYears: buildProjection(currentValueZAR, annualGrowthPercent, 5),
      tenYears: buildProjection(currentValueZAR, annualGrowthPercent, 10),
      annualGrowthPercent,
    },
    notes: benchmark?.notes || [
      "Live pricing is available for this set.",
      "Projection is a scenario estimate, not a guaranteed return.",
    ],
    sources: [
      sourceView("bricklink", "BrickLink", brickLinkResponse),
      sourceView("brickeconomy", "BrickEconomy", brickEconomyResponse),
      {
        id: "benchmark",
        label: "Collecttrade benchmark",
        status: benchmark ? "available" : "unavailable",
        detail: benchmark
          ? "Used only when configured external sources cannot return a fresh quote."
          : "No internal benchmark is stored for this set.",
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  cache.set(cacheKey, {
    value: valuation,
    expiresAt: Date.now() + VALUATION_CACHE_TTL_MS,
  });
  return valuation;
}

function getLegoStatus() {
  return {
    ok: true,
    sources: [brickLink.status(), brickEconomy.status()],
    rateLimits: rateLimits.getStats(),
  };
}

module.exports = {
  getLegoStatus,
  getLegoValuation,
};
