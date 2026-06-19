const { getLegoStatus, getLegoValuation } = require("./legoValuation");

const CATEGORY_PROFILES = {
  lego: {
    id: "lego",
    label: "LEGO",
    mode: "automatic",
    identifierLabel: "LEGO set number",
    identifierPlaceholder: "30725",
    itemNamePlaceholder: "Optional when a set number is available",
    annualGrowthPercent: 6,
    evidenceHint: "BrickAlpha checks configured BrickLink and BrickEconomy sources.",
    riskNotes: [
      "Sealed condition, box quality, retirement timing, and minifigure exclusivity can change resale value.",
    ],
  },
  whiskey: {
    id: "whiskey",
    label: "Whiskey",
    mode: "appraisal",
    identifierLabel: "Bottle reference",
    identifierPlaceholder: "Distillery, expression, vintage, bottle size",
    itemNamePlaceholder: "Example: Distillery 12 Year Limited Release",
    annualGrowthPercent: 5,
    evidenceHint: "Use recent comparable auction or specialist-retailer evidence for the bottle.",
    riskNotes: [
      "Bottle seal, fill level, label condition, provenance, storage, vintage, and local alcohol rules matter.",
      "The app values a collectible bottle only. It does not verify authenticity or provide a sales channel.",
    ],
  },
  stamps: {
    id: "stamps",
    label: "Stamps",
    mode: "appraisal",
    identifierLabel: "Catalog or issue reference",
    identifierPlaceholder: "Catalog number, issuer, year, denomination",
    itemNamePlaceholder: "Example: Union of South Africa issue",
    annualGrowthPercent: 4,
    evidenceHint: "Use catalog values cautiously and prefer recent auction comparables for the same grade.",
    riskNotes: [
      "Centering, gum, perforations, cancellations, faults, certification, and provenance drive value.",
    ],
  },
  puzzles: {
    id: "puzzles",
    label: "Puzzles",
    mode: "appraisal",
    identifierLabel: "Edition reference",
    identifierPlaceholder: "Maker, title, edition, piece count",
    itemNamePlaceholder: "Example: Vintage wooden puzzle limited edition",
    annualGrowthPercent: 3,
    evidenceHint: "Use sold comparables for the same maker, edition, completeness, and packaging condition.",
    riskNotes: [
      "Completeness, edition scarcity, packaging, maker reputation, and documented provenance drive value.",
    ],
  },
  coins: {
    id: "coins",
    label: "Coins",
    mode: "appraisal",
    identifierLabel: "Coin reference",
    identifierPlaceholder: "Country, year, denomination, mint mark",
    itemNamePlaceholder: "Example: 1898 ZAR Pond",
    annualGrowthPercent: 4,
    evidenceHint: "Use recent auction comparables for the same coin, grade, and certification status.",
    riskNotes: [
      "Grade, certification, metal content, cleaning, damage, and authenticity materially affect value.",
    ],
  },
  cards: {
    id: "cards",
    label: "Trading Cards",
    mode: "appraisal",
    identifierLabel: "Card reference",
    identifierPlaceholder: "Game, set, card number, grade",
    itemNamePlaceholder: "Example: Pokemon 151 Charizard ex PSA 10",
    annualGrowthPercent: 5,
    evidenceHint: "Use recent sold listings for the exact card, edition, language, and grade.",
    riskNotes: [
      "Edition, language, grading company, population, condition, and liquidity materially affect value.",
    ],
  },
  comics: {
    id: "comics",
    label: "Comics",
    mode: "appraisal",
    identifierLabel: "Issue reference",
    identifierPlaceholder: "Title, issue, publisher, year, grade",
    itemNamePlaceholder: "Example: Amazing Spider-Man #300 CGC 9.4",
    annualGrowthPercent: 4,
    evidenceHint: "Use sold comparables for the exact issue, variant, grade, and certification.",
    riskNotes: [
      "Grade, restoration, variant, certification, scarcity, and character demand materially affect value.",
    ],
  },
  other: {
    id: "other",
    label: "Other Collectible",
    mode: "appraisal",
    identifierLabel: "Reference",
    identifierPlaceholder: "Maker, edition, year, serial or catalog reference",
    itemNamePlaceholder: "Describe the collectible precisely",
    annualGrowthPercent: 3,
    evidenceHint: "Use recent sold comparables and document why they are genuinely comparable.",
    riskNotes: [
      "Authenticity, condition, provenance, scarcity, and buyer depth must be reviewed before relying on the estimate.",
    ],
  },
};

function asPositiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function cleanText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function buildProjection(currentValueZAR, annualGrowthPercent, years) {
  return Math.round(currentValueZAR * (1 + annualGrowthPercent / 100) ** years);
}

function recommendationForScore(score) {
  if (score >= 9) return "Exceptional Buy";
  if (score >= 7.5) return "Strong Buy";
  if (score >= 6) return "Watchlist";
  return "Pass for now";
}

function riskRatingForScore(score, confidence) {
  if (score >= 8.5 && confidence === "appraisal-input") return "Low";
  if (score >= 7.5) return "Moderate";
  if (score >= 6) return "Speculative";
  return "High";
}

function confidenceLabelFor(confidence) {
  if (confidence === "appraisal-input") return "Medium";
  if (confidence === "early-appraisal") return "Early";
  return "Review";
}

function profileFor(category) {
  const profile = CATEGORY_PROFILES[cleanText(category, 40).toLowerCase()];
  if (!profile) {
    throw new Error("collectible_category_required");
  }
  return profile;
}

function scoreAppraisal({ purchasePriceZAR, currentValueZAR, condition, provenance }) {
  const discountPercent = ((currentValueZAR - purchasePriceZAR) / currentValueZAR) * 100;
  const discountPoints = Math.min(4.5, Math.max(0, discountPercent / 18));
  const conditionPoints = condition === "excellent" ? 1.2 : condition === "good" ? 0.7 : 0.2;
  const provenancePoints = provenance ? 1 : 0.2;
  return Math.min(10, Math.max(1, Number((2.7 + discountPoints + conditionPoints + provenancePoints).toFixed(1))));
}

async function getCollectibleValuation(input) {
  const profile = profileFor(input?.category);

  if (profile.id === "lego") {
    const valuation = await getLegoValuation({
      setNum: input?.identifier,
      purchasePriceZAR: input?.purchasePriceZAR,
      purchaseDate: input?.purchaseDate,
      certificationNotes: input?.certificationNotes,
      portfolioHoldings: input?.portfolioHoldings,
    });
    return {
      ...valuation,
      category: profile.id,
      categoryLabel: profile.label,
      valuationMode: "automatic",
      evidenceHint: profile.evidenceHint,
    };
  }

  const itemName = cleanText(input?.itemName);
  const identifier = cleanText(input?.identifier);
  const condition = cleanText(input?.condition, 40).toLowerCase();
  const provenance = cleanText(input?.provenance, 400);
  const evidenceNotes = cleanText(input?.evidenceNotes, 500);
  const certificationNotes = cleanText(input?.certificationNotes, 700);
  const purchaseDate = cleanText(input?.purchaseDate, 40);
  const purchasePriceZAR = asPositiveNumber(input?.purchasePriceZAR);
  const currentValueZAR = asPositiveNumber(input?.currentMarketValueZAR);

  if (!itemName) throw new Error("collectible_name_required");
  if (!identifier) throw new Error("collectible_reference_required");
  if (!purchasePriceZAR) throw new Error("purchase_price_required");
  if (!currentValueZAR) throw new Error("market_comparable_value_required");

  const profitZAR = currentValueZAR - purchasePriceZAR;
  const multiplier = currentValueZAR / purchasePriceZAR;
  const roiPercent = (profitZAR / purchasePriceZAR) * 100;
  const discountPercent = (profitZAR / currentValueZAR) * 100;
  const score = scoreAppraisal({
    purchasePriceZAR,
    currentValueZAR,
    condition,
    provenance,
  });
  const annualGrowthPercent = profile.annualGrowthPercent;

  const confidence = evidenceNotes && provenance ? "appraisal-input" : "early-appraisal";

  return {
    ok: true,
    category: profile.id,
    categoryLabel: profile.label,
    valuationMode: "appraisal",
    identifier,
    name: itemName,
    purchasePriceZAR,
    purchaseDate,
    currentValueZAR,
    profitZAR: Math.round(profitZAR),
    multiplier: Number(multiplier.toFixed(1)),
    roiPercent: Number(roiPercent.toFixed(1)),
    discountPercent: Number(discountPercent.toFixed(1)),
    score,
    recommendation: recommendationForScore(score),
    confidence,
    confidenceLabel: confidenceLabelFor(confidence),
    riskRating: riskRatingForScore(score, confidence),
    certificationNotes,
    rarity: cleanText(input?.rarity, 100) || "Review required",
    condition: condition || "not supplied",
    projections: {
      oneYear: buildProjection(currentValueZAR, annualGrowthPercent, 1),
      fiveYears: buildProjection(currentValueZAR, annualGrowthPercent, 5),
      tenYears: buildProjection(currentValueZAR, annualGrowthPercent, 10),
      annualGrowthPercent,
    },
    evidenceHint: profile.evidenceHint,
    notes: [
      ...profile.riskNotes,
      evidenceNotes || "Add comparable-sale notes before relying on this appraisal.",
    ],
    sources: [
      {
        id: "appraisal-input",
        label: "Comparable market estimate",
        status: evidenceNotes ? "documented" : "needs evidence",
        detail: profile.evidenceHint,
      },
      {
        id: "provenance",
        label: "Provenance",
        status: provenance ? "documented" : "needs review",
        detail: provenance || "No provenance notes supplied.",
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

function getCollectiblesValuationMeta() {
  return {
    ok: true,
    categories: Object.values(CATEGORY_PROFILES),
    sourceStatus: {
      lego: getLegoStatus(),
    },
  };
}

module.exports = {
  getCollectibleValuation,
  getCollectiblesValuationMeta,
};
