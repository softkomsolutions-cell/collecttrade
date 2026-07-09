/**
 * Demo data provider for Scan & Evaluate workflow.
 * Keeps demo content out of UI components — swap for API calls when backend is ready.
 */

import { marketDataService } from "./services/marketDataService";
import { DEMO_SET_NUMBER_MAP, DEMO_SET_PROFILES } from "./providers/demoMarketData";

export { DEMO_SET_NUMBER_MAP, DEMO_SET_PROFILES };

export const PROCESSING_STEPS = [
  { id: "uploading", label: "Uploading..." },
  { id: "analysing", label: "Demo identification running..." },
  { id: "identifying", label: "Identifying LEGO set..." },
  { id: "market", label: "Fetching market data..." },
  { id: "scoring", label: "Calculating Brick Alpha score..." },
];

export const PREMIUM_COMPARABLES = [
  {
    setNumber: "76178",
    name: "Daily Bugle",
    score: 86,
    roi: 28,
    growth: "+22%",
    recommendation: "Strong Buy",
    theme: "Marvel",
  },
  {
    setNumber: "10316",
    name: "Rivendell",
    score: 91,
    roi: 38,
    growth: "+24%",
    recommendation: "Strong Buy",
    theme: "Icons",
  },
  {
    setNumber: "75290",
    name: "Mos Eisley Cantina",
    score: 84,
    roi: 20,
    growth: "+18%",
    recommendation: "Buy",
    theme: "Star Wars",
  },
  {
    setNumber: "75192",
    name: "UCS Millennium Falcon",
    score: 93,
    roi: 48,
    growth: "+35%",
    recommendation: "Hold",
    theme: "Star Wars",
  },
];

export const COPILOT_DEMO_RESPONSES = {
  "should i buy three of these?":
    "Three sealed copies would diversify your exit strategy — one for long-term hold, one for retirement pop, and one for liquidity. At current pricing with a Strong Buy rating, accumulating 2–3 units before retirement is aligned with Brick Alpha's model for high-conviction UCS sets.",
  default:
    "Based on the Brick Alpha score and retirement window, this set fits a core accumulation strategy. Monitor discount periods and consider staged entries rather than a single lump-sum purchase.",
};

const SEARCH_ALIASES = {
  destroyer: "75252",
  "star destroyer": "75252",
  atat: "75313",
  "at-at": "75313",
  avengers: "76269",
  tower: "76269",
  sanctum: "76218",
  venator: "75367",
  hogwarts: "71043",
  castle: "10305",
  rivendell: "10316",
  spiderman: "76261",
  "spider-man": "76261",
  bugle: "76178",
  falcon: "75192",
  cantina: "75290",
};

function normalizeSetNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function extractSetNumberFromText(text) {
  const match = String(text || "").match(/\b(\d{4,6})\b/);
  return match ? match[1] : "";
}

export function identifySetNumberFromFilename(filename) {
  const fromDigits = extractSetNumberFromText(filename);
  if (fromDigits && DEMO_SET_PROFILES[fromDigits]) {
    return fromDigits;
  }
  const lower = String(filename || "").toLowerCase();
  for (const [alias, setNumber] of Object.entries(SEARCH_ALIASES)) {
    if (lower.includes(alias)) {
      return setNumber;
    }
  }
  return fromDigits || "";
}

export function getDemoSetProfile(setNumber) {
  const normalized = normalizeSetNumber(setNumber);
  return marketDataService.toScanDemoProfile(marketDataService.getSetSync(normalized));
}

export function findCatalogMatch(collectibles, setNumber, demoSeed = 0) {
  const legoItems = collectibles.filter((item) => item.brand === "LEGO");
  const pool = legoItems.length ? legoItems : collectibles;
  const normalized = normalizeSetNumber(setNumber);

  if (normalized) {
    const catalogId = DEMO_SET_NUMBER_MAP[normalized];
    if (catalogId) {
      const hinted = pool.find((item) => item.id === catalogId);
      if (hinted) {
        return hinted;
      }
    }
    const bySku = pool.find((item) => normalizeSetNumber(item.sku) === normalized);
    if (bySku) {
      return bySku;
    }
    const byId = pool.find((item) => String(item.id || "").includes(normalized));
    if (byId) {
      return byId;
    }
  }

  return pool[demoSeed % Math.max(pool.length, 1)] || null;
}

export function searchDemoSets(query, collectibles = []) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) {
    return [];
  }

  const legoItems = collectibles.filter((item) => item.brand === "LEGO");
  const pool = legoItems.length ? legoItems : collectibles;

  const aliasSetNumber = SEARCH_ALIASES[needle];
  const results = new Map();

  const addResult = (item, setNumber) => {
    if (!item) {
      return;
    }
    const key = item.id || setNumber;
    if (!results.has(key)) {
      results.set(key, {
        id: item.id,
        setNumber: setNumber || normalizeSetNumber(item.sku),
        name: item.name,
        theme: item.legoTheme || item.category,
        item,
      });
    }
  };

  if (aliasSetNumber) {
    addResult(findCatalogMatch(pool, aliasSetNumber), aliasSetNumber);
  }

  const digitMatch = extractSetNumberFromText(needle);
  if (digitMatch) {
    addResult(findCatalogMatch(pool, digitMatch), digitMatch);
  }

  pool.forEach((item) => {
    const setNumber = normalizeSetNumber(item.sku) || extractSetNumberFromText(item.id);
    const haystack = [item.name, item.legoTheme, item.category, setNumber, item.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (haystack.includes(needle)) {
      addResult(item, setNumber);
    }
  });

  Object.entries(DEMO_SET_PROFILES).forEach(([setNumber, profile]) => {
    const haystack = [profile.name, profile.theme, setNumber].join(" ").toLowerCase();
    if (haystack.includes(needle) && !results.has(setNumber)) {
      const item = findCatalogMatch(pool, setNumber);
      if (item) {
        addResult(item, setNumber);
      }
    }
  });

  return Array.from(results.values()).slice(0, 8);
}

export function buildMarketPricing(evaluation, demoProfile) {
  const current = Number(evaluation?.currentMarketValue || evaluation?.price) || 0;
  const retail = Number(evaluation?.retailPrice || demoProfile?.retailPrice) || current;
  const discount = evaluation?.discountPercentage ?? ((retail - current) / retail) * 100;
  const spread = Math.max(retail * 0.08, 1200);

  return {
    retail,
    currentValue: current,
    lowestPrice: Math.round(current - spread * 0.6),
    highestPrice: Math.round(current + spread * 0.9),
    averageMarketPrice: Math.round((current + retail) / 2),
    discountPercent: discount,
    expectedRetirementPop: Math.round(current * (1 + (demoProfile?.expectedRoi || 30) / 100)),
  };
}

export function buildForecastCards(evaluation) {
  const current = Number(evaluation?.currentMarketValue || evaluation?.price) || 0;
  const projected = Number(evaluation?.projectedFutureValue) || current * 1.32;
  const horizons = [1, 5, 10];

  return horizons.map((years) => {
    const growth =
      current > 0 && projected > current
        ? Math.pow(projected / current, 1 / Math.max(evaluation?.holdingPeriod || 3, 1))
        : 1.08;
    const value = Math.round(current * Math.pow(growth, years));
    const roi = current > 0 ? ((value - current) / current) * 100 : 0;
    return {
      years,
      label: years === 1 ? "1 Year Forecast" : `${years} Year Forecast`,
      value,
      roi,
    };
  });
}

export function buildAiInvestmentSummary(evaluation, demoProfile) {
  const name = evaluation?.name || demoProfile?.name || "this set";
  const recommendation = evaluation?.recommendation || "Buy";
  const retirement =
    evaluation?.retirementStatus === "Retired"
      ? "already retired with tightening sealed supply"
      : evaluation?.retirementStatus === "Imminent" || evaluation?.retirementStatus === "Overdue"
        ? "approaching retirement with a favourable accumulation window"
        : "a developing retirement window";

  const minifigNote =
    Number(evaluation?.exclusiveMinifigures) >= 2 || Number(demoProfile?.minifigures) >= 4
      ? "Strong exclusive minifigures."
      : "Solid minifigure roster appeal.";

  const pricingNote =
    Number(evaluation?.discountPercentage) > 8
      ? "Current pricing remains attractive."
      : "Premium pricing is justified by scarcity and theme demand.";

  const action =
    recommendation === "Strong Buy" || recommendation === "Buy" ? "BUY" : recommendation.toUpperCase();

  return {
    lead: `Brick Alpha has identified ${name} as an excellent accumulation opportunity.`,
    bullets: [
      minifigNote,
      `Retirement window ${retirement}.`,
      pricingNote,
      "Historical comparable sets have appreciated significantly after retirement.",
    ],
    action: `Recommended action: ${action}.`,
    fullText: `Brick Alpha has identified ${name} as an excellent accumulation opportunity. ${minifigNote} Retirement window ${retirement}. ${pricingNote} Historical comparable sets have appreciated significantly after retirement. Recommended action: ${action}.`,
  };
}

export function buildRetirementSnapshot(evaluation) {
  const months = evaluation?.monthsUntilRetirement ?? evaluation?.retirementMonthsRemaining ?? 14;
  return {
    expectedRetirement: evaluation?.expectedRetirementDate || evaluation?.sellByTargetDate || "Q4 2026",
    retirementProbability: Math.round(Number(evaluation?.retirementProbability) || 72),
    retirementConfidence: Math.round(Number(evaluation?.retirementConfidence) || 78),
    monthsRemaining: months,
    expectedRetirementPop: Math.round(
      (Number(evaluation?.currentMarketValue) || 0) *
        (1 + (Number(evaluation?.projectedRoi) || 28) / 100),
    ),
    status: evaluation?.retirementStatus || "Available",
  };
}

export function riskLabel(riskScore) {
  const score = Number(riskScore) || 50;
  if (score <= 38) {
    return "LOW";
  }
  if (score <= 58) {
    return "MODERATE";
  }
  return "HIGH";
}

export function getCopilotResponse(question) {
  const normalized = String(question || "").trim().toLowerCase();
  if (!normalized) {
    return COPILOT_DEMO_RESPONSES.default;
  }
  for (const [key, response] of Object.entries(COPILOT_DEMO_RESPONSES)) {
    if (key !== "default" && normalized.includes(key.replace(/\?/g, ""))) {
      return response;
    }
  }
  return COPILOT_DEMO_RESPONSES.default;
}

export function demoSeedFromFile(file) {
  if (!file?.name) {
    return 0;
  }
  return file.name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export async function runProcessingPipeline(onStepChange, totalMs = 4500) {
  const stepMs = totalMs / PROCESSING_STEPS.length;
  for (let index = 0; index < PROCESSING_STEPS.length; index += 1) {
    onStepChange(PROCESSING_STEPS[index].id, index);
    await new Promise((resolve) => window.setTimeout(resolve, stepMs));
  }
}
