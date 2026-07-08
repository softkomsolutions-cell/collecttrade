import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import {
  availabilityStatusFor,
  buildAiCommentary,
  enrichBrickAlphaCollectible,
  legoThemeFor,
  summarizeBrickAlphaPortfolio,
} from "../brickAlphaModel";
import { formatCollectiblePrice, positiveTone } from "../appUtils";
import { EmptyState } from "./appShell";

const FILTER_OPTIONS = [
  { id: "theme", label: "Theme", type: "multi" },
  { id: "retired", label: "Retired" },
  { id: "retiring-soon", label: "Retiring Soon" },
  { id: "strong-buy", label: "Strong Buy" },
  { id: "owned", label: "Owned" },
  { id: "watchlist", label: "Watchlist" },
];

const SYNTHETIC_DEMO_SETS = [
  {
    id: "demo-marvel-76210",
    brand: "LEGO",
    name: "Hulkbuster",
    sku: "76210",
    category: "LEGO Marvel",
    price: 14200,
    pieces: 4047,
    year: 2022,
    legoTheme: "Marvel",
  },
  {
    id: "demo-harry-potter-76391",
    brand: "LEGO",
    name: "Hogwarts Icons",
    sku: "76391",
    category: "LEGO Harry Potter",
    price: 13800,
    pieces: 3010,
    year: 2021,
    legoTheme: "Harry Potter",
  },
  {
    id: "demo-ideas-21348",
    brand: "LEGO",
    name: "Red London Telephone Box",
    sku: "21348",
    category: "LEGO Ideas",
    price: 6200,
    pieces: 1460,
    year: 2024,
    legoTheme: "Ideas",
  },
  {
    id: "demo-lotr-10316",
    brand: "LEGO",
    name: "Rivendell",
    sku: "10316",
    category: "LEGO Icons",
    price: 24500,
    pieces: 6167,
    year: 2023,
    legoTheme: "LOTR",
  },
];

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}/100` : "--";
}

function formatSignedPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

function extractSetNumber(item) {
  if (item.sku) {
    return item.sku;
  }
  if (item.ticker) {
    return item.ticker;
  }
  const match = String(item.id || "").match(/(\d{4,6})/);
  return match ? match[1] : "--";
}

function extractYear(item) {
  if (item.year) {
    return item.year;
  }
  const anchor = item.actualRetirementDate || item.expectedRetirementDate || item.purchaseDate;
  const anchorMs = Date.parse(anchor);
  if (Number.isFinite(anchorMs)) {
    return new Date(anchorMs).getFullYear() - 2;
  }
  return new Date().getFullYear() - 1;
}

function estimatePieces(item) {
  if (item.pieces) {
    return item.pieces;
  }
  const tier = String(item.sizeTier || "").toLowerCase();
  if (tier.includes("flagship")) {
    return 4800;
  }
  if (tier.includes("large")) {
    return 3200;
  }
  return 1400;
}

function riskLabel(score) {
  const numeric = numberOrZero(score);
  if (numeric <= 40) {
    return "Low";
  }
  if (numeric <= 62) {
    return "Balanced";
  }
  return "Elevated";
}

function recommendationTone(recommendation) {
  if (recommendation === "Strong Buy" || recommendation === "Buy") {
    return "buy";
  }
  if (recommendation === "Sell" || recommendation === "Avoid") {
    return "sell";
  }
  return "hold";
}

function retirementTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "retired") {
    return "retired";
  }
  if (normalized === "imminent" || normalized === "overdue") {
    return "urgent";
  }
  if (normalized === "approaching") {
    return "warning";
  }
  return "active";
}

function normalizeHolding(item, { source = "portfolio", watchlistIds = new Set() } = {}) {
  const setNumber = extractSetNumber(item);
  const watchKey = setNumber || item.ticker || item.id;
  const quantity = Math.max(1, numberOrZero(item.quantity ?? item.quantityOwned ?? 1));
  const paidUnit = numberOrZero(item.buyPrice ?? item.entryPrice);
  const currentUnit = numberOrZero(item.currentMarketValue ?? item.currentPrice);
  const growthPercent = paidUnit
    ? ((currentUnit - paidUnit) / paidUnit) * 100
    : numberOrZero(item.estimatedRoi ?? item.pnl);

  return {
    id: item.id || `${setNumber}-${source}`,
    setNumber,
    name: item.label || item.name || item.ticker,
    theme: item.legoTheme || legoThemeFor(item),
    year: extractYear(item),
    pieces: estimatePieces(item),
    minifigs: numberOrZero(item.numberOfMinifigures),
    retailPrice: numberOrZero(item.retailPrice ?? item.price),
    paidPrice: paidUnit,
    currentValue: currentUnit,
    growthPercent,
    quantity,
    retirementStatus: item.retirementStatus || "Active",
    availability: availabilityStatusFor(item),
    brickAlphaScore: numberOrZero(item.brickAlphaScore),
    investmentGrade: item.investmentGrade || "--",
    recommendation: item.recommendation || "Hold",
    riskScore: numberOrZero(item.riskScore),
    riskLabel: riskLabel(item.riskScore),
    retirementProbability: numberOrZero(item.retirementProbability),
    aiNote: buildAiCommentary(item),
    collectibleId: item.collectibleId || item.id,
    purchaseDate: item.purchaseDate || item.createdAt,
    isOwned: source === "portfolio",
    isWatchlist: watchlistIds.has(watchKey),
    raw: item,
  };
}

function buildDemoHoldings(collectibles) {
  const catalogById = new Map(collectibles.map((item) => [item.id, item]));
  const specs = [
    { catalogId: "lego-star-wars-75252", quantity: 1 },
    { catalogId: "lego-icons-10305", quantity: 2 },
    ...SYNTHETIC_DEMO_SETS.map((item) => ({ item, quantity: 1 })),
  ];

  return specs.map((spec) => {
    const base = spec.catalogId ? catalogById.get(spec.catalogId) : spec.item;
    const enriched = enrichBrickAlphaCollectible({
      ...base,
      quantityOwned: spec.quantity,
    });
    return normalizeHolding(
      {
        ...enriched,
        quantity: spec.quantity,
        assetClass: "collectible",
      },
      { source: "demo" },
    );
  });
}

function buildPortfolioOverview(holdings) {
  const uniqueSets = new Set(holdings.map((holding) => holding.setNumber)).size;
  const ownedSets = holdings.reduce((sum, holding) => sum + holding.quantity, 0);
  const retiredSets = holdings.filter((holding) => holding.availability === "Retired").length;
  const pieces = holdings.reduce((sum, holding) => sum + holding.pieces * holding.quantity, 0);
  const minifigs = holdings.reduce((sum, holding) => sum + holding.minifigs * holding.quantity, 0);
  const retailValue = holdings.reduce(
    (sum, holding) => sum + holding.retailPrice * holding.quantity,
    0,
  );
  const costBasis = holdings.reduce(
    (sum, holding) => sum + holding.paidPrice * holding.quantity,
    0,
  );
  const netAssetValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue * holding.quantity,
    0,
  );
  const unrealizedGain = netAssetValue - costBasis;
  const growthPercent = costBasis ? (unrealizedGain / costBasis) * 100 : 0;

  return {
    ownedSets,
    uniqueSets,
    retiredSets,
    pieces,
    minifigs,
    retailValue,
    costBasis,
    netAssetValue,
    unrealizedGain,
    growthPercent,
  };
}

function buildThemeAllocationRows(holdings, totalNav) {
  const buckets = new Map();

  holdings.forEach((holding) => {
    const theme = holding.theme || "Other";
    const value = holding.currentValue * holding.quantity;
    const existing = buckets.get(theme) || { theme, sets: 0, value: 0 };
    existing.sets += holding.quantity;
    existing.value += value;
    buckets.set(theme, existing);
  });

  return Array.from(buckets.values())
    .map((row) => ({
      ...row,
      percent: totalNav ? (row.value / totalNav) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value);
}

function buildCollectionGrowthSeries(holdings) {
  const now = new Date();
  const months = 18;
  const sortedAcquisitions = holdings
    .flatMap((holding) =>
      Array.from({ length: holding.quantity }, (_, index) => ({
        date: holding.purchaseDate || now.toISOString(),
        value: holding.paidPrice + ((holding.currentValue - holding.paidPrice) * (index + 1)) / holding.quantity,
        holding,
      })),
    )
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));

  const points = [];
  let runningValue = 0;
  let runningSets = 0;
  let acquisitionIndex = 0;

  for (let offset = -months; offset <= 0; offset += 1) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + offset);
    const time = date.toISOString().slice(0, 10);
    const monthEnd = date.getTime();

    while (
      acquisitionIndex < sortedAcquisitions.length &&
      Date.parse(sortedAcquisitions[acquisitionIndex].date) <= monthEnd
    ) {
      const acquisition = sortedAcquisitions[acquisitionIndex];
      runningValue += acquisition.holding.paidPrice;
      runningSets += 1;
      acquisitionIndex += 1;
    }

    const progress = (offset + months) / months;
    const targetNav = holdings.reduce(
      (sum, holding) => sum + holding.currentValue * holding.quantity,
      0,
    );
    const interpolatedValue = runningValue + (targetNav - runningValue) * progress * 0.92;

    points.push({
      time,
      value: Math.round(interpolatedValue),
      sets: runningSets || Math.max(1, Math.round(holdings.length * progress)),
    });
  }

  return points;
}

function monthlyGrowthTrend(points) {
  if (points.length < 2) {
    return 0;
  }
  const latest = points[points.length - 1]?.value || 0;
  const previous = points[points.length - 2]?.value || 0;
  if (!previous) {
    return 0;
  }
  return ((latest - previous) / previous) * 100;
}

function PortfolioGrowthChart({ points }) {
  const chartRef = useRef(null);
  const trend = monthlyGrowthTrend(points);

  useEffect(() => {
    if (!chartRef.current || !points.length) {
      return undefined;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "transparent" },
        textColor: "#8da2c8",
      },
      grid: {
        vertLines: { color: "rgba(116, 132, 171, 0.1)" },
        horzLines: { color: "rgba(116, 132, 171, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(116, 132, 171, 0.14)",
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(116, 132, 171, 0.14)",
      },
      timeScale: {
        borderColor: "rgba(116, 132, 171, 0.14)",
        timeVisible: true,
      },
    });

    const valueSeries = chart.addSeries(LineSeries, {
      color: "#c9a962",
      lineWidth: 2,
      priceScaleId: "right",
    });
    const setsSeries = chart.addSeries(LineSeries, {
      color: "#5b6cff",
      lineWidth: 2,
      priceScaleId: "left",
    });

    valueSeries.setData(points.map((point) => ({ time: point.time, value: point.value })));
    setsSeries.setData(points.map((point) => ({ time: point.time, value: point.sets })));
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width;
      if (nextWidth) {
        chart.applyOptions({ width: nextWidth });
      }
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [points]);

  return (
    <div className="piGrowthChart">
      <div className="piGrowthChartHeader">
        <div className="piChartLegend">
          <span className="piChartLegendItem piChartLegendItem-value">Portfolio value</span>
          <span className="piChartLegendItem piChartLegendItem-sets">Sets owned</span>
        </div>
        <div className="piGrowthTrend">
          <span>Monthly trend</span>
          <strong className={positiveTone(trend)}>{formatSignedPercent(trend)}</strong>
        </div>
      </div>
      <div className="piChartSurface" ref={chartRef} />
    </div>
  );
}

function HoldingCard({ holding, onAnalyze, onWatchlist, onSelect }) {
  return (
    <article className="piHoldingCard">
      <div className="piHoldingCardTop">
        <div className="piSetImagePlaceholder" aria-hidden="true">
          <span>{holding.setNumber}</span>
          <small>LEGO</small>
        </div>
        <div className="piHoldingCardIdentity">
          <div className="piHoldingCardMeta">
            <span className="piSetNumber">#{holding.setNumber}</span>
            <span className={`piRetirementBadge piRetirementBadge-${retirementTone(holding.retirementStatus)}`}>
              {holding.availability}
            </span>
          </div>
          <h3>{holding.name}</h3>
          <p>
            {holding.theme} · {holding.year} · {holding.pieces.toLocaleString()} pcs · {holding.minifigs} minifigs
          </p>
        </div>
        <div className="piHoldingCardScore">
          <strong>{Math.round(holding.brickAlphaScore)}</strong>
          <span>Brick Alpha</span>
        </div>
      </div>

      <div className="piHoldingMetrics">
        <div>
          <span>Retail</span>
          <strong>{formatCollectiblePrice(holding.retailPrice)}</strong>
        </div>
        <div>
          <span>Paid</span>
          <strong>{formatCollectiblePrice(holding.paidPrice)}</strong>
        </div>
        <div>
          <span>Current</span>
          <strong>{formatCollectiblePrice(holding.currentValue)}</strong>
        </div>
        <div>
          <span>Growth</span>
          <strong className={positiveTone(holding.growthPercent)}>{formatSignedPercent(holding.growthPercent)}</strong>
        </div>
        <div>
          <span>Qty</span>
          <strong>{holding.quantity}</strong>
        </div>
      </div>

      <div className="piIntelligenceLayer">
        <div className="piIntelligenceBadges">
          <span className={`piRecommendation piRecommendation-${recommendationTone(holding.recommendation)}`}>
            {holding.recommendation}
          </span>
          <span className="piGradeBadge">{holding.investmentGrade}</span>
          <span className="piRiskBadge">Risk · {holding.riskLabel}</span>
          <span className="piRetirementProb">
            Retirement {Math.round(holding.retirementProbability)}%
          </span>
        </div>
        <p className="piAiNote">{holding.aiNote}</p>
      </div>

      <div className="piHoldingActions">
        <button type="button" className="ghostButton slimButton" onClick={() => onAnalyze(holding)}>
          Analyze set
        </button>
        <button type="button" className="ghostButton slimButton" onClick={() => onWatchlist(holding)}>
          Add to watchlist
        </button>
        <button type="button" className="ghostButton slimButton" onClick={() => onSelect(holding)}>
          View position
        </button>
      </div>
    </article>
  );
}

function exportPortfolioCsv(holdings, overview) {
  const headers = [
    "Set Number",
    "Name",
    "Theme",
    "Year",
    "Quantity",
    "Retail Price",
    "Paid Price",
    "Current Value",
    "Growth %",
    "Brick Alpha Score",
    "Recommendation",
    "Investment Grade",
    "Retirement Status",
  ];
  const rows = holdings.map((holding) => [
    holding.setNumber,
    holding.name,
    holding.theme,
    holding.year,
    holding.quantity,
    holding.retailPrice,
    holding.paidPrice,
    holding.currentValue,
    holding.growthPercent.toFixed(1),
    holding.brickAlphaScore,
    holding.recommendation,
    holding.investmentGrade,
    holding.availability,
  ]);

  const summary = [
    "",
    "Portfolio Summary",
    `Owned Sets,${overview.ownedSets}`,
    `Unique Sets,${overview.uniqueSets}`,
    `Net Asset Value,${overview.netAssetValue}`,
    `Cost Basis,${overview.costBasis}`,
    `Unrealized Gain,${overview.unrealizedGain}`,
    `Growth %,${overview.growthPercent.toFixed(1)}`,
  ];

  const csv = [headers.join(","), ...rows.map((row) => row.join(",")), ...summary].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brick-alpha-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PortfolioIntelligenceWorkspace({
  collectibles = [],
  handlePortfolioTradeSelect,
  jumpToPageSection,
  onAddToWatchlist,
  openTrades = [],
  watchlistItems = [],
}) {
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [selectedThemes, setSelectedThemes] = useState(new Set());
  const [actionStatus, setActionStatus] = useState("");

  const watchlistIds = useMemo(
    () => new Set((watchlistItems || []).map((item) => item.ticker || item.label)),
    [watchlistItems],
  );

  const liveHoldings = useMemo(
    () =>
      openTrades
        .filter((trade) => trade.assetClass === "collectible")
        .map((trade) => normalizeHolding(trade, { source: "portfolio", watchlistIds })),
    [openTrades, watchlistIds],
  );

  const isDemoMode = liveHoldings.length === 0;
  const holdings = useMemo(
    () => (isDemoMode ? buildDemoHoldings(collectibles) : liveHoldings),
    [collectibles, isDemoMode, liveHoldings],
  );

  const overview = useMemo(() => buildPortfolioOverview(holdings), [holdings]);
  const themeRows = useMemo(
    () => buildThemeAllocationRows(holdings, overview.netAssetValue),
    [holdings, overview.netAssetValue],
  );
  const growthPoints = useMemo(() => buildCollectionGrowthSeries(holdings), [holdings]);

  const availableThemes = useMemo(
    () => Array.from(new Set(holdings.map((holding) => holding.theme))).sort(),
    [holdings],
  );

  const filteredHoldings = useMemo(() => {
    let result = holdings;

    if (activeFilters.has("theme") && selectedThemes.size) {
      result = result.filter((holding) => selectedThemes.has(holding.theme));
    }
    if (activeFilters.has("retired")) {
      result = result.filter((holding) => holding.availability === "Retired");
    }
    if (activeFilters.has("retiring-soon")) {
      result = result.filter((holding) => holding.availability === "Retiring Soon");
    }
    if (activeFilters.has("strong-buy")) {
      result = result.filter((holding) => holding.recommendation === "Strong Buy");
    }
    if (activeFilters.has("owned")) {
      result = result.filter((holding) => holding.isOwned || isDemoMode);
    }
    if (activeFilters.has("watchlist")) {
      result = result.filter((holding) => holding.isWatchlist);
    }

    return result;
  }, [activeFilters, holdings, isDemoMode, selectedThemes]);

  const portfolioSummary = useMemo(() => {
    const tradeLike = holdings.map((holding) => ({
      assetClass: "collectible",
      quantity: holding.quantity,
      entryPrice: holding.paidPrice,
      currentPrice: holding.currentValue,
      buyPrice: holding.paidPrice,
      currentMarketValue: holding.currentValue,
      brickAlphaScore: holding.brickAlphaScore,
      riskScore: holding.riskScore,
      legoTheme: holding.theme,
      category: holding.theme,
    }));
    return summarizeBrickAlphaPortfolio(tradeLike);
  }, [holdings]);

  function toggleFilter(filterId) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filterId)) {
        next.delete(filterId);
        if (filterId === "theme") {
          setSelectedThemes(new Set());
        }
      } else {
        next.add(filterId);
      }
      return next;
    });
  }

  function toggleTheme(theme) {
    setSelectedThemes((current) => {
      const next = new Set(current);
      if (next.has(theme)) {
        next.delete(theme);
      } else {
        next.add(theme);
      }
      return next;
    });
    setActiveFilters((current) => {
      const next = new Set(current);
      next.add("theme");
      return next;
    });
  }

  function handleAnalyze(holding) {
    jumpToPageSection("collectibles", "investment-analysis");
    setActionStatus(`Opening analysis for ${holding.name}.`);
  }

  function handleWatchlist(holding) {
    if (onAddToWatchlist) {
      onAddToWatchlist({
        ticker: holding.setNumber,
        label: holding.name,
        desk: "collectible",
      });
      setActionStatus(`${holding.name} queued for watchlist.`);
      return;
    }
    setActionStatus("Sign in to sync watchlist items.");
  }

  function handleSelect(holding) {
    if (holding.raw?.id && handlePortfolioTradeSelect) {
      handlePortfolioTradeSelect(holding.raw);
    }
    jumpToPageSection("portfolio", "position-detail");
  }

  function handleExport() {
    exportPortfolioCsv(holdings, overview);
    setActionStatus("Portfolio exported as CSV.");
  }

  function handleGenerateReport() {
    jumpToPageSection("reports", "reports-performance");
    setActionStatus("Opening performance report workspace.");
  }

  const overviewMetrics = [
    { label: "Owned Sets", value: overview.ownedSets },
    { label: "Unique Sets", value: overview.uniqueSets },
    { label: "Retired Sets", value: overview.retiredSets },
    { label: "Pieces", value: overview.pieces.toLocaleString() },
    { label: "Minifigs", value: overview.minifigs },
    {
      label: "Retail Value",
      value: formatCollectiblePrice(overview.retailValue),
    },
    {
      label: "Paid Price",
      value: formatCollectiblePrice(overview.costBasis),
      detail: "Cost basis",
    },
    {
      label: "Current Value",
      value: formatCollectiblePrice(overview.netAssetValue),
      detail: "Net asset value",
      primary: true,
    },
    {
      label: "Unrealised Gain",
      value: formatCollectiblePrice(overview.unrealizedGain),
      tone: overview.unrealizedGain,
    },
    {
      label: "Growth",
      value: formatSignedPercent(overview.growthPercent),
      tone: overview.growthPercent,
    },
  ];

  return (
    <div className="piWorkspace">
      {isDemoMode ? (
        <div className="piDemoBanner">
          <span>Demo portfolio</span>
          <p>Showing Brick Alpha model data — add LEGO positions to replace with your live collection.</p>
        </div>
      ) : null}

      {actionStatus ? <div className="statusBanner subtleBanner">{actionStatus}</div> : null}

      <section className="piPanel" id="portfolio-intelligence">
        <header className="piPanelHeader">
          <div>
            <span className="piEyebrow">Collection Intelligence</span>
            <h2>Portfolio Overview</h2>
            <p>Your LEGO collection as an investment portfolio — NAV, cost basis, and growth at a glance.</p>
          </div>
          <div className="piHeaderStatus">
            <span>Collection grade</span>
            <strong>{portfolioSummary.collectionGrade}</strong>
            <small>Avg score {formatScore(portfolioSummary.averageBrickAlphaScore)}</small>
          </div>
        </header>

        <div className="piOverviewGrid">
          {overviewMetrics.map((metric) => (
            <div
              key={metric.label}
              className={`piOverviewCard${metric.primary ? " piOverviewCard-primary" : ""}`}
            >
              <span>{metric.label}</span>
              <strong className={metric.tone != null ? positiveTone(metric.tone) : undefined}>
                {metric.value}
              </strong>
              {metric.detail ? <small>{metric.detail}</small> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="piPanel" id="portfolio-growth">
        <header className="piPanelHeader">
          <div>
            <span className="piEyebrow">Performance</span>
            <h2>Collection Growth</h2>
            <p>Value trajectory and set accumulation over the last 18 months.</p>
          </div>
        </header>
        <PortfolioGrowthChart points={growthPoints} />
      </section>

      <section className="piPanel" id="portfolio-allocation">
        <header className="piPanelHeader">
          <div>
            <span className="piEyebrow">Diversification</span>
            <h2>Theme Allocation</h2>
            <p>NAV-weighted exposure across LEGO themes in your book.</p>
          </div>
        </header>

        {themeRows.length ? (
          <>
            <div className="piThemeTable">
              <div className="piThemeTableHeader">
                <span>Theme</span>
                <span>Sets</span>
                <span>Portfolio value</span>
                <span>% of book</span>
              </div>
              {themeRows.map((row) => (
                <div className="piThemeTableRow" key={row.theme}>
                  <strong>{row.theme}</strong>
                  <span>{row.sets}</span>
                  <span>{formatCollectiblePrice(row.value)}</span>
                  <span>{row.percent.toFixed(1)}%</span>
                  <div className="piThemeBar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, row.percent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No allocation view yet"
            body="No holdings found. Add LEGO positions to unlock theme allocation, diversification, and portfolio-grade KPIs."
          />
        )}
      </section>

      <section className="piPanel" id="portfolio-holdings">
        <header className="piPanelHeader piPanelHeader-split">
          <div>
            <span className="piEyebrow">Holdings</span>
            <h2>My Sets</h2>
            <p>Premium holdings cards with Brick Alpha intelligence for each position.</p>
          </div>
          <div className="piActionCluster">
            <button type="button" className="ghostButton slimButton" onClick={handleExport}>
              Export portfolio
            </button>
            <button type="button" className="primaryButton slimButton" onClick={handleGenerateReport}>
              Generate report
            </button>
          </div>
        </header>

        <div className="piFilterBar">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`piFilterChip${activeFilters.has(filter.id) ? " piFilterChip-active" : ""}`}
              onClick={() => toggleFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {activeFilters.has("theme") ? (
          <div className="piThemeFilterRow">
            {availableThemes.map((theme) => (
              <button
                key={theme}
                type="button"
                className={`piThemeChip${selectedThemes.has(theme) ? " piThemeChip-active" : ""}`}
                onClick={() => toggleTheme(theme)}
              >
                {theme}
              </button>
            ))}
          </div>
        ) : null}

        {filteredHoldings.length ? (
          <div className="piHoldingsGrid">
            {filteredHoldings.map((holding) => (
              <HoldingCard
                key={holding.id}
                holding={holding}
                onAnalyze={handleAnalyze}
                onWatchlist={handleWatchlist}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No holdings match filters"
            body="Clear filters or add your first LEGO holding to populate a premium wealth dashboard for your collection."
          />
        )}
      </section>

      <section className="piPanel piPanel-legacy" id="portfolio-dashboard">
        <header className="piPanelHeader">
          <div>
            <span className="piEyebrow">Legacy dashboard</span>
            <h2>Portfolio Dashboard</h2>
            <p>Roll-up metrics preserved for navigation compatibility.</p>
          </div>
        </header>
        <div className="piLegacyMetrics">
          <div>
            <span>Net Asset Value</span>
            <strong>{formatCollectiblePrice(portfolioSummary.netAssetValue)}</strong>
          </div>
          <div>
            <span>Cost Basis</span>
            <strong>{formatCollectiblePrice(portfolioSummary.costBasis)}</strong>
          </div>
          <div>
            <span>Diversification</span>
            <strong>{formatScore(portfolioSummary.diversificationScore)}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{formatScore(portfolioSummary.confidenceScore)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
