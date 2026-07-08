import { useMemo, useState } from "react";
import {
  availabilityStatusFor,
  buildAiCommentary,
  buildBrickAlphaScoreBreakdown,
  buildPriceForecast,
  confidenceFor,
  letterGradeFor,
  legoThemeFor,
  summarizeBrickAlphaPortfolio,
} from "../brickAlphaModel";
import { formatCollectiblePrice, openExternal, positiveTone } from "../appUtils";
import { EmptyState } from "./appShell";
import { AlphaSignalBadges } from "./workspaceCards";
import { InvestmentAnalysisChart } from "./investmentAnalysisChart";
import { ScoreBar, ScoreRing } from "./brickAlphaScoreDisplay";
import { ScoreExplanationPanel } from "./scoreExplanationPanel";

const HORIZON_OPTIONS = [1, 3, 5, 10];

const COMPARABLE_CATALOG = {
  "lego-star-wars-75252": [
    {
      name: "Daily Bugle",
      sku: "76178",
      retail: 14999,
      current: 19200,
      growth: 28,
      yearsSinceRetirement: 2.5,
    },
    {
      name: "Mos Eisley Cantina",
      sku: "75290",
      retail: 13999,
      current: 16800,
      growth: 20,
      yearsSinceRetirement: 3,
    },
    {
      name: "Rivendell",
      sku: "10316",
      retail: 19999,
      current: 24500,
      growth: 22,
      yearsSinceRetirement: 1.5,
    },
    {
      name: "UCS Millennium Falcon",
      sku: "75192",
      retail: 34999,
      current: 52000,
      growth: 48,
      yearsSinceRetirement: 5,
    },
  ],
  "lego-icons-10305": [
    {
      name: "Rivendell",
      sku: "10316",
      retail: 19999,
      current: 24500,
      growth: 22,
      yearsSinceRetirement: 1.5,
    },
    {
      name: "Colosseum",
      sku: "10276",
      retail: 22999,
      current: 28500,
      growth: 24,
      yearsSinceRetirement: 2,
    },
    {
      name: "Titanic",
      sku: "10294",
      retail: 26999,
      current: 31200,
      growth: 16,
      yearsSinceRetirement: 2.5,
    },
    {
      name: "Loop Coaster",
      sku: "10303",
      retail: 14999,
      current: 16200,
      growth: 8,
      yearsSinceRetirement: 1,
    },
  ],
};

const MINIFIGURE_ROSTERS = {
  "lego-star-wars-75252": [
    { name: "Darth Vader", role: "UCS centerpiece" },
    { name: "Imperial Officer", role: "Officer variant" },
  ],
  "lego-icons-10305": [
    { name: "Lion Knight King", role: "Castle monarch" },
    { name: "Forest Maiden", role: "Display exclusive" },
    { name: "Black Falcon Knight", role: "Faction leader" },
    { name: "Royal Jester", role: "Castle entertainer" },
  ],
};

function formatScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}/100` : "--";
}

function recommendationTone(recommendation) {
  if (recommendation === "Strong Buy" || recommendation === "Buy") {
    return "buy";
  }
  if (recommendation === "Sell" || recommendation === "Avoid") {
    return "sell";
  }
  if (recommendation === "Reduce") {
    return "reduce";
  }
  return "hold";
}

function displayRecommendation(recommendation) {
  if (recommendation === "Watch") {
    return "Hold";
  }
  if (recommendation === "Avoid") {
    return "Reduce";
  }
  return recommendation;
}

function extractSetNumber(item) {
  if (item.sku) {
    return item.sku;
  }
  const match = String(item.id || "").match(/(\d{4,6})/);
  return match ? match[1] : "--";
}

function productionStartDate(item) {
  const anchor = item.actualRetirementDate || item.expectedRetirementDate;
  const anchorMs = Date.parse(anchor);
  if (!Number.isFinite(anchorMs)) {
    return "2019-01-01";
  }
  const date = new Date(anchorMs);
  date.setFullYear(date.getFullYear() - 3);
  return date.toISOString().slice(0, 10);
}

function extractPrimaryImageUrl(item) {
  const candidates = [
    item?.imageUrl,
    item?.imageURL,
    item?.image,
    item?.thumbnailUrl,
    item?.thumbnailURL,
    item?.thumbnail,
    item?.photoUrl,
    item?.photo,
  ];
  const url = candidates.find((value) => typeof value === "string" && value.trim().length);
  return url ? url.trim() : null;
}

function formatDiscountLabel(item) {
  const discount = Number(item?.discountPercentage) || 0;
  if (discount > 0) {
    return `${discount.toFixed(0)}% below retail`;
  }
  if (discount < 0) {
    return `${Math.abs(discount).toFixed(0)}% above retail`;
  }
  return "At retail";
}

function formatCountdownLabel(item) {
  const anchor = item?.actualRetirementDate || item?.expectedRetirementDate;
  const ms = Date.parse(anchor);
  if (!Number.isFinite(ms)) {
    return "--";
  }
  const months = Math.round((ms - Date.now()) / (1000 * 60 * 60 * 24 * 30.42));
  if (months <= 0) {
    return "Retired";
  }
  if (months === 1) {
    return "1 month";
  }
  return `${months} months`;
}

function formatCommentaryParagraphs(text) {
  const cleaned = String(text || "").replace(/^"+|"+$/g, "").trim();
  if (!cleaned) {
    return [];
  }
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }
  return paragraphs.slice(0, 4);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function retirementProgress(item, productionStart) {
  const startMs = Date.parse(productionStart);
  const endMs = Date.parse(item?.actualRetirementDate || item?.expectedRetirementDate);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  const nowMs = Date.now();
  const progress = (nowMs - startMs) / (endMs - startMs);
  return clamp(progress, 0, 1);
}

function buildMinifigureCards(item) {
  const roster = MINIFIGURE_ROSTERS[item.id] || [];
  const exclusiveCount = Math.max(1, Number(item.exclusiveMinifigures) || 1);
  const cards = roster.length
    ? roster
    : Array.from({ length: Math.min(exclusiveCount, 4) }, (_, index) => ({
        name: `Exclusive Minifigure ${index + 1}`,
        role: "Set exclusive",
      }));

  return cards.map((figure, index) => {
    const rarityBoost = index === 0 ? 8 : index === 1 ? 4 : 0;
    const popularity = Math.min(98, Math.round(Number(item.minifigureQuality) + rarityBoost - index * 2));
    const investmentValue = Math.min(96, Math.round(popularity * 0.92 + Number(item.themeStrength) * 0.08));
    const rarity = Math.min(99, Math.round(58 + exclusiveCount * 2 + rarityBoost));
    const appreciation = Math.min(95, Math.round(Number(item.projectedRoi) * 0.35 + rarity * 0.25));
    const overall = Math.round((popularity + investmentValue + rarity + appreciation) / 4);

    return {
      ...figure,
      popularity,
      investmentValue,
      rarity,
      appreciation,
      overall,
    };
  });
}

function buildComparables(item, collectibles) {
  const catalog = COMPARABLE_CATALOG[item.id];
  if (catalog?.length) {
    return catalog;
  }

  return collectibles
    .filter((candidate) => candidate.id !== item.id && candidate.brand === "LEGO")
    .slice(0, 4)
    .map((candidate) => ({
      name: candidate.name,
      sku: extractSetNumber(candidate),
      retail: candidate.retailPrice,
      current: candidate.currentMarketValue,
      growth: candidate.estimatedRoi,
      yearsSinceRetirement: candidate.actualRetirementDate ? 2 : 0.5,
    }));
}

export function InvestmentAnalysisWorkspace({
  activeCollectible,
  brickAlphaPortfolio,
  collectibles,
  handleCollectibleSelect,
  jumpToPageSection,
  openCollectibleTicket,
  openTrades,
}) {
  const [chartHorizon, setChartHorizon] = useState(3);
  const [forecastHorizon, setForecastHorizon] = useState(3);

  const legoSets = useMemo(
    () => collectibles.filter((item) => item.brand === "LEGO"),
    [collectibles],
  );

  const item = activeCollectible;
  const ownedTrade = useMemo(
    () =>
      openTrades.find(
        (trade) =>
          trade.assetClass === "collectible" &&
          (trade.collectibleId === item?.id || trade.ticker === item?.sku),
      ) || null,
    [item?.id, item?.sku, openTrades],
  );
  const isOwned = Boolean(ownedTrade);
  const portfolioPosition = isOwned ? "Owned" : "Not Owned";

  const breakdown = useMemo(
    () => (item ? buildBrickAlphaScoreBreakdown(item) : null),
    [item],
  );
  const forecast = useMemo(
    () => (item ? buildPriceForecast(item, forecastHorizon) : null),
    [forecastHorizon, item],
  );
  const minifigures = useMemo(() => (item ? buildMinifigureCards(item) : []), [item]);
  const comparables = useMemo(
    () => (item ? buildComparables(item, collectibles) : []),
    [collectibles, item],
  );
  const commentary = useMemo(() => (item ? buildAiCommentary(item) : ""), [item]);
  const confidence = item ? confidenceFor(item) : 0;
  const availability = item ? availabilityStatusFor(item) : "Available";
  const minifigureScore = minifigures.length
    ? Math.round(minifigures.reduce((sum, fig) => sum + fig.overall, 0) / minifigures.length)
    : Math.round(Number(item?.minifigureQuality) || 0);

  const portfolioSummary = brickAlphaPortfolio || summarizeBrickAlphaPortfolio(openTrades);
  const themeRow = portfolioSummary.themeAllocation?.breakdown?.find(
    (row) => row.theme === legoThemeFor(item || {}),
  );
  const allocationPercent =
    isOwned && portfolioSummary.netAssetValue
      ? ((Number(ownedTrade.currentValue) || 0) / portfolioSummary.netAssetValue) * 100
      : 0;

  if (!item) {
    return (
      <section className="iaWorkspace iaWorkspace-empty panel" id="investment-analysis">
        <EmptyState
          title="Start your first Investment Analysis"
          body="Select a LEGO set to open Brick Alpha Score, retirement timing, forecasts, and premium recommendations."
        />
        {legoSets.length ? (
          <div className="iaSetPicker">
            {legoSets.map((set) => (
              <button
                key={set.id}
                type="button"
                className="iaSetPickerChip"
                onClick={() => handleCollectibleSelect(set)}
              >
                <span>{extractSetNumber(set)}</span>
                <strong>{set.name}</strong>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  const thesis = item.investmentThesis;
  const brickEconomyUrl = `https://www.brickeconomy.com/set/${extractSetNumber(item)}`;
  const productionStart = productionStartDate(item);
  const todayLabel = new Date().toISOString().slice(0, 10);
  const heroImageUrl = extractPrimaryImageUrl(item);
  const discountLabel = formatDiscountLabel(item);
  const retirementCountdown = formatCountdownLabel(item);
  const retirementFill = retirementProgress(item, productionStart);
  const commentaryParagraphs = formatCommentaryParagraphs(commentary);

  return (
    <section className="iaWorkspace" id="investment-analysis">
      {legoSets.length > 1 ? (
        <div className="iaSetPicker iaSetPicker-compact">
          {legoSets.map((set) => (
            <button
              key={set.id}
              type="button"
              className={`iaSetPickerChip${set.id === item.id ? " iaSetPickerChip-active" : ""}`}
              onClick={() => handleCollectibleSelect(set)}
            >
              <span>{extractSetNumber(set)}</span>
              <strong>{set.name}</strong>
            </button>
          ))}
        </div>
      ) : null}

      <header className="iaHero">
        <div className="iaHeroVisual">
          <div className="iaHeroImage" aria-hidden={!heroImageUrl}>
            <span className="iaHeroImageBadge">{item.legoTheme}</span>
            {heroImageUrl ? (
              <img className="iaHeroImagePhoto" src={heroImageUrl} alt={`${item.name} set image`} />
            ) : (
              <strong>{extractSetNumber(item)}</strong>
            )}
          </div>
        </div>

        <div className="iaHeroBody">
          <div className="iaHeroIntro">
            <span className="executiveDashboardEyebrow">Investment Analysis</span>
            <h1>{item.name}</h1>
            <div className="iaHeroMeta">
              <span>#{extractSetNumber(item)}</span>
              <span>{item.legoTheme}</span>
              <span className={`iaStatusBadge iaStatusBadge-${availability.toLowerCase().replace(/\s+/g, "-")}`}>
                {availability}
              </span>
            </div>
            <AlphaSignalBadges signals={item.alphaSignals} />
          </div>

          <div className="iaHeroMetrics">
            <div className="iaHeroMetric iaHeroMetric-score">
              <span>Brick Alpha Score</span>
              <ScoreRing score={item.brickAlphaScore} size="large" />
            </div>
            <div className="iaHeroMetric">
              <span>Investment Grade</span>
              <strong className={`iaGrade iaGrade-${letterGradeFor(item.brickAlphaScore).replace("+", "plus")}`}>
                {letterGradeFor(item.brickAlphaScore)}
              </strong>
              <small>{item.investmentGrade}</small>
            </div>
            <div className="iaHeroMetric">
              <span>Recommendation</span>
              <strong className={`iaRecommendation iaRecommendation-${recommendationTone(item.recommendation)}`}>
                {displayRecommendation(item.recommendation)}
              </strong>
            </div>
            <div className="iaHeroMetric">
              <span>Confidence</span>
              <strong>{confidence}%</strong>
            </div>
            <div className="iaHeroMetric">
              <span>Current Value</span>
              <strong>{formatCollectiblePrice(item.currentMarketValue)}</strong>
              <small>{discountLabel}</small>
            </div>
            <div className="iaHeroMetric">
              <span>Retail Price</span>
              <strong>{formatCollectiblePrice(item.retailPrice)}</strong>
            </div>
            <div className="iaHeroMetric">
              <span>Retirement Status</span>
              <strong>{item.retirementStatus}</strong>
              <small>{item.actualRetirementDate || item.expectedRetirementDate || "--"} · {retirementCountdown}</small>
            </div>
            {isOwned ? (
              <div className="iaHeroMetric">
                <span>Portfolio Position</span>
                <strong>{portfolioPosition}</strong>
                <small className={positiveTone(ownedTrade.pnl)}>{Number(ownedTrade.pnl || 0).toFixed(1)}% return</small>
              </div>
            ) : (
              <div className="iaHeroMetric">
                <span>Portfolio Position</span>
                <strong>{portfolioPosition}</strong>
                <small>Actionable entry & timing insights below</small>
              </div>
            )}
          </div>

          <div className="iaHeroActions">
            <button
              type="button"
              className="primaryButton"
              onClick={() => openCollectibleTicket(item, "BUY")}
            >
              Add to Portfolio
            </button>
            <button type="button" className="ghostButton" onClick={() => openExternal(brickEconomyUrl)}>
              Source: BrickEconomy
            </button>
          </div>
        </div>
      </header>

      <article className="iaGlassCard iaVerdictCard">
        <div className="iaSectionHeader">
          <span className="executiveDashboardEyebrow">AI Investment Verdict</span>
          <h2>{displayRecommendation(item.recommendation)} · {item.investmentGrade}</h2>
        </div>
        <p className="iaVerdictLead">
          {item.name} combines a strong {item.legoTheme} theme,{" "}
          {item.exclusiveMinifigures ? `${item.exclusiveMinifigures} exclusive minifigures, ` : ""}
          {item.retirementStatus === "Retired"
            ? "retired supply dynamics"
            : "a favourable retirement timeline"}
          . Current pricing remains{" "}
          {item.discountPercentage > 0 ? "below retail with margin of safety" : "at a premium to retail"}.
          Brick Alpha currently rates this set as a {displayRecommendation(item.recommendation)} with{" "}
          {confidence >= 80 ? "high" : confidence >= 60 ? "moderate" : "developing"} confidence.
        </p>
        <div className="iaVerdictGrid">
          <div className="iaVerdictBlock">
            <span>Why</span>
            <ul>
              {thesis.upsideDrivers.slice(0, 3).map((driver) => (
                <li key={driver}>{driver}</li>
              ))}
            </ul>
          </div>
          <div className="iaVerdictBlock">
            <span>Biggest risk</span>
            <p>{thesis.risks[0] || "Standard sealed storage and exit liquidity considerations apply."}</p>
          </div>
          <div className="iaVerdictBlock">
            <span>Holding period</span>
            <p>
              {item.holdingPeriod} observed · target exit {item.sellByTargetDate} ·{" "}
              {item.retirementStatus === "Retired" ? "post-retirement hold" : "pre-retirement accumulation"}
            </p>
          </div>
          <div className="iaVerdictBlock">
            <span>Exit timing</span>
            <p>{thesis.exitStrategy}</p>
          </div>
          <div className="iaVerdictBlock iaVerdictBlock-highlight">
            <span>Biggest upside</span>
            <p>{thesis.upsideDrivers[0] || "Category demand and retirement-driven scarcity."}</p>
          </div>
          <div className="iaVerdictBlock iaVerdictBlock-action">
            <span>Primary action</span>
            <button type="button" className="primaryButton" onClick={() => openCollectibleTicket(item, "BUY")}>
              Add to Portfolio
            </button>
          </div>
        </div>
      </article>

      <div className="iaTwoColumn">
        <article className="iaGlassCard">
          <div className="iaSectionHeader iaSectionHeader-row">
            <div>
              <span className="executiveDashboardEyebrow">Price History</span>
              <h2>Retail · Market · Forecast</h2>
            </div>
            <div className="iaHorizonToggle" role="tablist" aria-label="Chart horizon">
              {HORIZON_OPTIONS.map((years) => (
                <button
                  key={years}
                  type="button"
                  className={chartHorizon === years ? "iaHorizonToggleActive" : ""}
                  onClick={() => setChartHorizon(years)}
                >
                  {years}Y
                </button>
              ))}
            </div>
          </div>
          <InvestmentAnalysisChart item={item} horizonYears={chartHorizon} />
        </article>

        <article className="iaGlassCard">
          <div className="iaSectionHeader">
            <span className="executiveDashboardEyebrow">Brick Alpha Score</span>
            <h2>Weighted breakdown</h2>
          </div>
          <div className="iaWeightLegend">
            {breakdown.displayGroups.map((group) => (
              <span key={group.key}>
                {group.label} {group.weight}%
              </span>
            ))}
          </div>
          <div className="iaScoreBars">
            {breakdown.factors.map((factor) => (
              <ScoreBar key={factor.key} factor={factor} />
            ))}
          </div>
        </article>
      </div>

      <ScoreExplanationPanel item={item} />

      <article className="iaGlassCard">
        <div className="iaSectionHeader">
          <span className="executiveDashboardEyebrow">Retirement Analysis</span>
          <h2>Production lifecycle</h2>
        </div>
        <div className="iaRetirementTimeline">
          <div className="iaRetirementNode">
            <span>Production Start</span>
            <strong>{productionStart}</strong>
          </div>
          <div
            className="iaRetirementTrack"
            style={{ "--ia-retire-progress": `${Math.round(retirementFill * 100)}%` }}
          >
            <div className="iaRetirementTrackFill" style={{ width: `${Math.round(retirementFill * 100)}%` }} />
            <div className="iaRetirementMarker iaRetirementMarker-today">
              <span>Today</span>
              <strong>{todayLabel}</strong>
            </div>
          </div>
          <div className="iaRetirementNode">
            <span>{item.actualRetirementDate ? "Actual Retirement" : "Expected Retirement"}</span>
            <strong>{item.actualRetirementDate || item.expectedRetirementDate}</strong>
          </div>
        </div>
        <div className="iaRetirementStats">
          <div className="iaRetirementCountdown">
            <span>Countdown</span>
            <strong>{retirementCountdown}</strong>
            <small>{item.retirementStatus}</small>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{Math.round(item.retirementConfidence)}%</strong>
          </div>
          <div>
            <span>Probability</span>
            <strong>{Math.round(item.retirementProbability)}%</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{item.retirementStatus}</strong>
          </div>
          <div>
            <span>Est. Retirement Pop</span>
            <strong>{Math.round(180000 - item.supplyScarcity * 850)}</strong>
          </div>
        </div>
      </article>

      <article className="iaGlassCard">
        <div className="iaSectionHeader iaSectionHeader-row">
          <div>
            <span className="executiveDashboardEyebrow">Minifigure Analysis</span>
            <h2>Exclusive figure premium</h2>
          </div>
          <div className="iaMinifigureScore">
            <span>Overall Minifigure Score</span>
            <strong>{minifigureScore}/100</strong>
          </div>
        </div>
        <div className="iaMinifigureGrid">
          {minifigures.map((figure) => (
            <article className="iaMinifigureCard" key={figure.name}>
              <div className="iaMinifigureAvatar" aria-hidden="true">
                {figure.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h3>{figure.name}</h3>
              <small>{figure.role}</small>
              <p className="iaMinifigureNote">
                Collector demand: <strong>{figure.popularity >= 80 ? "High" : figure.popularity >= 60 ? "Moderate" : "Developing"}</strong>{" "}
                · Exclusivity: <strong>{Number(item.exclusiveMinifigures) >= 3 ? "Strong" : Number(item.exclusiveMinifigures) >= 1 ? "Moderate" : "Limited"}</strong>
              </p>
              <div className="iaMinifigureMetrics">
                <div>
                  <span>Popularity</span>
                  <strong>{figure.popularity}</strong>
                </div>
                <div>
                  <span>Investment Value</span>
                  <strong>{figure.investmentValue}</strong>
                </div>
                <div>
                  <span>Rarity</span>
                  <strong>{figure.rarity}</strong>
                </div>
                <div>
                  <span>Expected Appreciation</span>
                  <strong className={positiveTone(figure.appreciation)}>{figure.appreciation}%</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </article>

      <div className="iaTwoColumn">
        <article className="iaGlassCard">
          <div className="iaSectionHeader iaSectionHeader-row">
            <div>
              <span className="executiveDashboardEyebrow">Price Forecast</span>
              <h2>Scenario forecast</h2>
            </div>
            <div className="iaHorizonToggle" role="tablist" aria-label="Forecast horizon">
              {HORIZON_OPTIONS.map((years) => (
                <button
                  key={years}
                  type="button"
                  className={forecastHorizon === years ? "iaHorizonToggleActive" : ""}
                  onClick={() => setForecastHorizon(years)}
                >
                  {years}Y
                </button>
              ))}
            </div>
          </div>
          {forecast ? (
            <div className="iaScenarioGrid">
              <article className="iaScenarioCard iaScenarioCard-best">
                <span className="iaScenarioLabel">Best</span>
                <strong className="iaScenarioValue">{formatCollectiblePrice(forecast.best)}</strong>
                <div className="iaScenarioMeta">
                  <span>Expected CAGR</span>
                  <strong className={positiveTone(forecast.cagr)}>{forecast.cagr.toFixed(1)}%</strong>
                </div>
              </article>
              <article className="iaScenarioCard iaScenarioCard-expected">
                <span className="iaScenarioLabel">Expected</span>
                <strong className="iaScenarioValue">{formatCollectiblePrice(forecast.expected)}</strong>
                <div className="iaScenarioMeta">
                  <span>Confidence</span>
                  <strong>{forecast.confidence}%</strong>
                </div>
              </article>
              <article className="iaScenarioCard iaScenarioCard-worst">
                <span className="iaScenarioLabel">Worst</span>
                <strong className="iaScenarioValue">{formatCollectiblePrice(forecast.worst)}</strong>
                <div className="iaScenarioMeta">
                  <span>Downside</span>
                  <strong className={positiveTone(-Math.abs(Number(forecast.cagr) || 0))}>Stress case</strong>
                </div>
              </article>
            </div>
          ) : null}
        </article>

        {isOwned ? (
          <article className="iaGlassCard">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">Portfolio Impact</span>
              <h2>Your position</h2>
            </div>
            <div className="iaPortfolioGrid">
              <div>
                <span>Current Allocation</span>
                <strong>{allocationPercent.toFixed(1)}%</strong>
              </div>
              <div>
                <span>Theme Exposure</span>
                <strong>{item.legoTheme}</strong>
                <small>
                  Target {item.themeAllocationTarget}% · Actual {themeRow ? themeRow.actual.toFixed(1) : "0.0"}%
                </small>
              </div>
              <div>
                <span>Portfolio Diversification</span>
                <strong>{formatScore(portfolioSummary.diversificationScore)}</strong>
              </div>
              <div>
                <span>Flywheel Rating</span>
                <strong>{formatScore(item.portfolioFit)}</strong>
              </div>
              <div>
                <span>Contribution to Portfolio</span>
                <strong>{formatCollectiblePrice(ownedTrade.currentValue)}</strong>
                <small className={positiveTone(ownedTrade.pnl)}>
                  {Number(ownedTrade.pnl || 0).toFixed(1)}% return
                </small>
              </div>
            </div>
          </article>
        ) : (
          <article className="iaGlassCard iaGlassCard-muted">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">Portfolio Impact</span>
              <h2>Not in your portfolio</h2>
            </div>
            <p>
              Add this set to your portfolio to see allocation, theme exposure, flywheel rating, and
              contribution metrics.
            </p>
            <button type="button" className="primaryButton" onClick={() => openCollectibleTicket(item, "BUY")}>
              Add to Portfolio
            </button>
          </article>
        )}
      </div>

      <article className="iaGlassCard">
        <div className="iaSectionHeader">
          <span className="executiveDashboardEyebrow">Comparable Sets</span>
          <h2>Similar retired sets</h2>
        </div>
        <div className="iaComparableGrid">
          {comparables.map((comp) => (
            <article className="iaComparableCard" key={`${comp.sku}-${comp.name}`}>
              <div className="iaComparableTop">
                <div className="iaComparableImage" aria-hidden="true">
                  <span>LEGO</span>
                  <strong>#{comp.sku}</strong>
                </div>
                <div className="iaComparableTitle">
                  <strong>{comp.name}</strong>
                  <span>Set #{comp.sku}</span>
                </div>
                <div className="iaComparableCallout">
                  <span>ROI</span>
                  <strong className={positiveTone(comp.growth)}>+{Number(comp.growth).toFixed(0)}%</strong>
                </div>
              </div>
              <div className="iaComparableMetrics">
                <div>
                  <span>Retail</span>
                  <strong>{formatCollectiblePrice(comp.retail)}</strong>
                </div>
                <div>
                  <span>Current Value</span>
                  <strong>{formatCollectiblePrice(comp.current)}</strong>
                </div>
                <div>
                  <span>Growth</span>
                  <strong className={positiveTone(comp.growth)}>+{Number(comp.growth).toFixed(0)}%</strong>
                </div>
                <div>
                  <span>Years Since Retirement</span>
                  <strong>{comp.yearsSinceRetirement}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="iaGlassCard iaCommentaryCard">
        <div className="iaSectionHeader">
          <span className="executiveDashboardEyebrow">AI Commentary</span>
          <h2>Brick Alpha Copilot</h2>
        </div>
        <div className="iaCommentaryBody">
          {commentaryParagraphs.length ? (
            commentaryParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <p className="iaCommentaryEmpty">No commentary available yet.</p>
          )}
        </div>
      </article>

      <footer className="iaActions">
        <button type="button" className="primaryButton" onClick={() => openCollectibleTicket(item, "BUY")}>
          Add to Portfolio
        </button>
        <button type="button" className="ghostButton" onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}>
          Track Retirement
        </button>
        <button type="button" className="ghostButton" onClick={() => jumpToPageSection("collectibles", "collectibles-grid")}>
          Compare
        </button>
        <button type="button" className="ghostButton" onClick={() => jumpToPageSection("reports", "reports-overview")}>
          Export Report
        </button>
      </footer>
    </section>
  );
}
