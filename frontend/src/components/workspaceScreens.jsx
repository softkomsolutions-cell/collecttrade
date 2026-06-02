import { useMemo, useState } from "react";
import {
  DEFAULT_EXECUTION_PROFILES,
  DESK_FILTERS,
  MARKET_DESKS,
  PARTNER_TEST_FLOW,
  RAILS,
} from "../appConfig";
import {
  actionTone,
  findDeskMeta,
  formatCollectiblePrice,
  formatDateTime,
  formatTickerPrice,
  formatTradePrice,
  handleInteractiveKey,
  humanizeStatus,
  labelDesk,
  labelRegion,
  marketModeLabel,
  openExternal,
  positiveTone,
  providerLabel,
  statusTone,
  venueDetailLabel,
} from "../appUtils";
import {
  EmptyState,
  WorkspaceCommandBar,
  WorkspaceHero,
  WorkspaceSectionBar,
} from "./appShell";
import {
  ConnectorCard,
  PositionDetailCard,
  TradeCollectibleCard,
} from "./workspaceCards";

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function average(values) {
  const safeValues = values.map(numberOrZero).filter((value) => Number.isFinite(value));
  if (!safeValues.length) {
    return 0;
  }
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function reportDeskKeyForTrade(trade) {
  if (trade?.assetClass === "collectible") {
    return "collectibles";
  }

  const source = String(trade?.desk || trade?.marketTicker || trade?.ticker || "").toUpperCase();
  if (source.includes("USDZAR") || source.includes("EURUSD")) {
    return "forex";
  }
  if (source.includes("SPY") || source.includes("QQQ") || source.includes("GLD")) {
    return "etfs";
  }
  if (source.includes("BTC")) {
    return "crypto";
  }
  if (source.includes("JSE")) {
    return "jse";
  }
  return "forex";
}

function reportDeskLabel(deskKey) {
  if (deskKey === "collectibles") {
    return "Collectibles";
  }

  return labelDesk(deskKey);
}

function formatSignedPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function buildPerformancePoints(trades) {
  let cumulative = 0;

  return trades
    .slice()
    .sort(
      (left, right) =>
        new Date(left.closedAt || left.updatedAt || left.createdAt || 0).getTime() -
        new Date(right.closedAt || right.updatedAt || right.createdAt || 0).getTime(),
    )
    .slice(-12)
    .map((trade, index) => {
      cumulative += numberOrZero(trade.pnl);

      return {
        id: trade.id || `${trade.ticker || "trade"}-${index}`,
        label: trade.ticker || trade.marketTicker || `Trade ${index + 1}`,
        shortLabel: String(trade.ticker || trade.marketTicker || `T${index + 1}`).slice(0, 8),
        value: Number(cumulative.toFixed(2)),
        raw: numberOrZero(trade.pnl),
      };
    });
}

function formatZar(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `R${numeric.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
    : "--";
}

const COLLECTIBLE_VALUATION_CATEGORIES = [
  {
    id: "lego",
    label: "LEGO",
    mode: "automatic",
    identifierLabel: "LEGO set number",
    identifierPlaceholder: "30725",
    itemNamePlaceholder: "Resolved from the set number",
    evidenceHint: "Automatic lookup uses configured BrickLink and BrickEconomy sources.",
  },
];

function collectibleErrorMessage(error) {
  const messages = {
    lego_market_data_unavailable:
      "No live source or saved reference benchmark is available for that set yet.",
    lego_set_number_required: "Enter a valid LEGO set number.",
    purchase_price_required: "Enter the price you paid in rand.",
    collectible_category_required: "Choose a collectible category.",
    collectible_name_required: "Enter a clear name for the collectible.",
    collectible_reference_required: "Enter a catalog, edition, or product reference.",
    market_comparable_value_required:
      "Enter an evidence-led current market estimate from comparable sales.",
  };
  return messages[error] || "The collectible valuation could not be completed. Please try again.";
}

function CollectibleValuationPanel({ authToken, onSaved }) {
  const [category] = useState("lego");
  const [identifier, setIdentifier] = useState("40766");
  const [itemName, setItemName] = useState("");
  const [purchasePriceZAR, setPurchasePriceZAR] = useState("65");
  const [currentMarketValueZAR, setCurrentMarketValueZAR] = useState("");
  const [condition, setCondition] = useState("excellent");
  const [rarity, setRarity] = useState("");
  const [provenance, setProvenance] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [valuation, setValuation] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const activeProfile =
    COLLECTIBLE_VALUATION_CATEGORIES.find((profile) => profile.id === category) ||
    COLLECTIBLE_VALUATION_CATEGORIES[0];
  const appraisalMode = activeProfile.mode === "appraisal";
  const requestPayload = {
    category,
    identifier,
    itemName,
    purchasePriceZAR: Number(purchasePriceZAR),
    currentMarketValueZAR: Number(currentMarketValueZAR),
    condition,
    rarity,
    provenance,
    evidenceNotes,
    quantity: Number(quantity),
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");

    try {
      const response = await fetch("/api/collectibles/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "lego_valuation_failed");
      }
      setValuation(payload);
    } catch (error) {
      setValuation(null);
      setStatus(collectibleErrorMessage(error.message));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setStatus("");

    try {
      const response = await fetch("/api/collectibles/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "collectible_save_failed");
      }
      setStatus("Saved to your collectibles portfolio.");
      await onSaved();
    } catch (error) {
      setStatus(collectibleErrorMessage(error.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel legoValuationPanel" id="collectibles-valuation">
      <div className="panelHeader">
        <div>
          <span className="legoPanelEyebrow">Collectibles Valuation Desk</span>
          <h2>Rate This Purchase</h2>
          <p>
            Rate LEGO purchases with a consistent investment workflow for market value, rarity,
            provenance, and 1, 5, and 10 year scenarios.
          </p>
        </div>
        <div className="headerStatus">
          <span>Valuation mode</span>
          <strong>{appraisalMode ? "Evidence-led appraisal" : "Connected market lookup"}</strong>
        </div>
      </div>

      <form className="legoValuationForm" onSubmit={handleSubmit}>
        {appraisalMode ? (
          <label>
            <span>Collectible name</span>
            <input
              type="text"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder={activeProfile.itemNamePlaceholder}
            />
          </label>
        ) : null}
        <label>
          <span>{activeProfile.identifierLabel}</span>
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={activeProfile.identifierPlaceholder}
          />
        </label>
        <label>
          <span>Purchase price (ZAR)</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={purchasePriceZAR}
            onChange={(event) => setPurchasePriceZAR(event.target.value)}
            placeholder="65"
          />
        </label>
        <label>
          <span>Quantity</span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        {appraisalMode ? (
          <>
            <label>
              <span>Current market estimate (ZAR)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={currentMarketValueZAR}
                onChange={(event) => setCurrentMarketValueZAR(event.target.value)}
                placeholder="Comparable-sale estimate"
              />
            </label>
            <label>
              <span>Condition</span>
              <select value={condition} onChange={(event) => setCondition(event.target.value)}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </label>
            <label>
              <span>Rarity or edition</span>
              <input
                type="text"
                value={rarity}
                onChange={(event) => setRarity(event.target.value)}
                placeholder="Limited release, catalog grade, edition size"
              />
            </label>
            <label className="legoValuationWideField">
              <span>Provenance</span>
              <textarea
                value={provenance}
                onChange={(event) => setProvenance(event.target.value)}
                placeholder="Where it came from, authenticity evidence, storage, certification"
              />
            </label>
            <label className="legoValuationWideField">
              <span>Comparable-sale evidence</span>
              <textarea
                value={evidenceNotes}
                onChange={(event) => setEvidenceNotes(event.target.value)}
                placeholder={activeProfile.evidenceHint}
              />
            </label>
          </>
        ) : null}
        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Analyzing..." : "Get Valuation"}
        </button>
      </form>

      {status ? <div className="statusBanner">{status}</div> : null}

      {valuation ? (
        <div className="legoValuationResult">
          <div className="legoValuationHeadline">
            <div>
              <span>
                {valuation.categoryLabel || "Collectible"} {valuation.setNum || valuation.identifier}
              </span>
              <h3>{valuation.name}</h3>
              <p>
                {valuation.rarity} |{" "}
                {valuation.confidence === "live"
                  ? "Live market data"
                  : valuation.valuationMode === "automatic"
                    ? "Saved benchmark"
                    : "Appraisal input"}
              </p>
            </div>
            <div className="legoScore">
              <strong>{valuation.score}</strong>
              <span>/ 10</span>
              <small>{valuation.recommendation}</small>
            </div>
          </div>

          <div className="legoMetricGrid">
            <div>
              <span>You paid</span>
              <strong>{formatZar(valuation.purchasePriceZAR)}</strong>
            </div>
            <div>
              <span>Current estimate</span>
              <strong>{formatZar(valuation.currentValueZAR)}</strong>
            </div>
            <div>
              <span>Current gain</span>
              <strong>{formatZar(valuation.profitZAR)}</strong>
            </div>
            <div>
              <span>Cost multiple</span>
              <strong>{valuation.multiplier}x</strong>
            </div>
          </div>

          <div className="legoProjectionGrid">
            <div>
              <span>1 year</span>
              <strong>{formatZar(valuation.projections.oneYear)}</strong>
            </div>
            <div>
              <span>5 years</span>
              <strong>{formatZar(valuation.projections.fiveYears)}</strong>
            </div>
            <div>
              <span>10 years</span>
              <strong>{formatZar(valuation.projections.tenYears)}</strong>
            </div>
          </div>

          <div className="legoValuationDetailGrid">
            <div>
              <span>Investment Notes</span>
              {(valuation.notes || []).map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
            <div>
              <span>Investment Grade</span>
              <p>
                <strong>{valuation.investmentGrade || valuation.recommendation}</strong>
              </p>
              <p>{valuation.investmentGradeDetail}</p>
            </div>
            <div>
              <span>Pricing Sources</span>
              {(valuation.sources || []).map((source) => (
                <p key={source.id}>
                  <strong>{source.label}</strong>
                  <small>{source.status}</small>
                </p>
              ))}
            </div>
            {valuation.minifigures?.length ? (
              <div>
                <span>Minifigure Values</span>
                {valuation.minifigures.map((minifigure) => (
                  <p key={minifigure.id}>
                    <strong>
                      {minifigure.name}
                      {minifigure.exclusive ? " | Exclusive" : ""}
                    </strong>
                    <small>{formatZar(minifigure.estimatedValueZAR)}</small>
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="legoProjectionNote">
            Projections use a {valuation.projections.annualGrowthPercent}% annual scenario and are
            estimates, not guaranteed returns.
            {valuation.usdZarRate ? ` USD/ZAR reference: ${valuation.usdZarRate}.` : ""}
          </div>
          <div className="panelActions">
            <button className="primaryButton" type="button" disabled={busy} onClick={handleSave}>
              {busy ? "Saving..." : "Save to My Collection"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildDeskExposureItems(trades) {
  const buckets = new Map();

  trades.forEach((trade) => {
    const deskKey = reportDeskKeyForTrade(trade);
    const existing = buckets.get(deskKey) || { label: reportDeskLabel(deskKey), value: 0, pnl: 0 };
    existing.value += 1;
    existing.pnl += numberOrZero(trade.pnl);
    buckets.set(deskKey, existing);
  });

  return Array.from(buckets.entries())
    .map(([deskKey, bucket]) => ({
      id: deskKey,
      label: bucket.label,
      value: bucket.value,
      meta: formatSignedPercent(bucket.pnl),
    }))
    .sort((left, right) => right.value - left.value);
}

function buildSignalDeskItems(signals) {
  const buckets = new Map();

  signals.forEach((signal) => {
    const existing = buckets.get(signal.desk) || {
      label: labelDesk(signal.desk),
      count: 0,
      confidenceTotal: 0,
      rsiTotal: 0,
    };
    existing.count += 1;
    existing.confidenceTotal += numberOrZero(signal.confidence);
    existing.rsiTotal += numberOrZero(signal.rsi);
    buckets.set(signal.desk, existing);
  });

  return Array.from(buckets.entries())
    .map(([deskKey, bucket]) => ({
      id: deskKey,
      label: bucket.label,
      value: Number((bucket.confidenceTotal / Math.max(bucket.count, 1)).toFixed(1)),
      meta: `${Number((bucket.rsiTotal / Math.max(bucket.count, 1)).toFixed(1))} RSI avg`,
    }))
    .sort((left, right) => right.value - left.value);
}

function buildActionMixItems(signals) {
  const counts = signals.reduce(
    (accumulator, signal) => {
      const action = String(signal.action || "HOLD").toUpperCase();
      if (action === "BUY") {
        accumulator.buy += 1;
      } else if (action === "SELL") {
        accumulator.sell += 1;
      } else {
        accumulator.hold += 1;
      }
      return accumulator;
    },
    { buy: 0, sell: 0, hold: 0 },
  );

  return [
    { id: "buy", label: "Buy", value: counts.buy, meta: "Signals backing upside" },
    { id: "sell", label: "Sell", value: counts.sell, meta: "Signals pressing downside" },
    { id: "hold", label: "Hold", value: counts.hold, meta: "Signals still waiting" },
  ];
}

function buildExecutionModeItems(trades) {
  const counts = trades.reduce(
    (accumulator, trade) => {
      if (trade.executionMode === "live") {
        accumulator.live += 1;
      } else {
        accumulator.paper += 1;
      }
      return accumulator;
    },
    { live: 0, paper: 0 },
  );

  return [
    { id: "paper", label: "Paper", value: counts.paper, meta: "Simulated routing" },
    { id: "live", label: "Live", value: counts.live, meta: "Venue-backed routing" },
  ];
}

function ReportLineChart({ points }) {
  if (!points.length) {
    return (
      <div className="reportChartEmpty">
        <strong>No performance curve yet</strong>
        <small>Closed and open trades will start drawing this line once the book has some history.</small>
      </div>
    );
  }

  const width = 320;
  const height = 164;
  const padding = 18;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const chartPoints = points.map((point, index) => {
    const x =
      padding +
      (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return { ...point, x, y };
  });

  const linePath = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = [
    `${padding},${height - padding}`,
    ...chartPoints.map((point) => `${point.x},${point.y}`),
    `${chartPoints.at(-1)?.x || width - padding},${height - padding}`,
  ].join(" ");

  return (
    <div className="reportChartShell">
      <svg viewBox={`0 0 ${width} ${height}`} className="reportLineSvg" role="img" aria-label="Performance curve">
        <defs>
          <linearGradient id="reportLineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(74,139,255,0.38)" />
            <stop offset="100%" stopColor="rgba(74,139,255,0)" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="reportAxisLine" />
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="reportAxisLine"
        />
        <polygon points={areaPath} fill="url(#reportLineGradient)" />
        <polyline points={linePath} className="reportLinePath" />
        {chartPoints.map((point) => (
          <circle key={point.id} cx={point.x} cy={point.y} r="3.5" className="reportLinePoint" />
        ))}
      </svg>

      <div className="reportAxisRow">
        {chartPoints.map((point) => (
          <span key={point.id}>{point.shortLabel}</span>
        ))}
      </div>
    </div>
  );
}

function ReportBarList({ items, valueFormatter = (value) => value }) {
  const max = Math.max(...items.map((item) => numberOrZero(item.value)), 1);

  return (
    <div className="reportBarList">
      {items.map((item) => (
        <div className="reportBarRow" key={item.id}>
          <div className="reportBarMeta">
            <div>
              <strong>{item.label}</strong>
              {item.meta ? <small>{item.meta}</small> : null}
            </div>
            <span>{valueFormatter(item.value)}</span>
          </div>
          <div className="reportBarTrack">
            <div
              className={`reportBarFill ${item.tone || ""}`.trim()}
              style={{ width: `${(numberOrZero(item.value) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeScreen({
  activeDesk,
  activePageSections,
  appSettings,
  collectiblesResponse,
  connectedProviderCount,
  feedbackResponse,
  health,
  jumpToPageSection,
  liveReadyDeskCount,
  navigateToPage,
  newsResponse,
  openTrades,
  shareStatus,
  signalsResponse,
  totalOpenPnl,
}) {
  const feedbackSummary = feedbackResponse.summary || {};
  const allSignals = signalsResponse.signals || [];
  const leadSignal = signalsResponse.leadSignal;
  const leadNewsItem = newsResponse.items?.[0] || null;
  const latestFeedbackItem = feedbackResponse.items?.[0] || null;
  const latestOpenTrade = openTrades?.[0] || null;
  const shareIsLive = shareStatus?.status === "live" && shareStatus?.publicUrl;
  const strongestSignal =
    allSignals
      .slice()
      .sort((left, right) => numberOrZero(right.confidence) - numberOrZero(left.confidence))[0] ||
    leadSignal ||
    null;
  const executionProfiles = appSettings.executionProfiles || DEFAULT_EXECUTION_PROFILES;
  const deskPulseCards = ["forex", "crypto", "etfs", "jse"].map((deskKey) => {
    const signal =
      allSignals.find((item) => item.desk === deskKey) ||
      (strongestSignal?.desk === deskKey ? strongestSignal : null);

    return {
      deskKey,
      label: labelDesk(deskKey),
      signal,
      routeMode: marketModeLabel(executionProfiles?.[deskKey]?.mode || "paper"),
    };
  });
  const sessionReadinessScore = Math.max(
    48,
    Math.min(
      99,
      Math.round(
        average([
          shareIsLive ? 100 : 72,
          liveReadyDeskCount ? (liveReadyDeskCount / 4) * 100 : 35,
          connectedProviderCount ? Math.min(connectedProviderCount * 22, 100) : 28,
          strongestSignal ? numberOrZero(strongestSignal.confidence) : 42,
          openTrades.length ? 88 : 58,
        ]),
      ),
    ),
  );
  const launchCards = [
    {
      id: "news",
      label: "News",
      glyph: "NW",
      hint: "Read the tape before you act.",
      action: () => jumpToPageSection("news", "macro-feed", activeDesk),
      metaLabel: "Lead source",
      metaValue: leadNewsItem?.sourceName || "Waiting",
    },
    {
      id: "signals",
      label: "Trade Desk",
      glyph: "TR",
      hint: "Open the chart, structure plan, and ticket.",
      action: () => jumpToPageSection("signals", "chart-panel", activeDesk),
      metaLabel: "Lead setup",
      metaValue: leadSignal ? `${leadSignal.action} ${leadSignal.label}` : "No setup yet",
    },
    {
      id: "collectibles",
      label: "Collectibles",
      glyph: "CL",
      hint: "Alternative-assets inventory with the same discipline.",
      action: () => jumpToPageSection("collectibles", "collectibles-grid"),
      metaLabel: "Inventory",
      metaValue: `${collectiblesResponse.items?.length || 0} items`,
    },
    {
      id: "portfolio",
      label: "Portfolio",
      glyph: "PF",
      hint: "Review open positions and your latest close decisions.",
      action: () => jumpToPageSection("portfolio", "open-positions"),
      metaLabel: "Open positions",
      metaValue: `${openTrades.length}`,
    },
    {
      id: "reports",
      label: "Reports",
      glyph: "RP",
      hint: "Open performance graphs, desk exposure, and signal analytics.",
      action: () => jumpToPageSection("reports", "reports-performance"),
      metaLabel: "Report mode",
      metaValue: "Graphs ready",
    },
    {
      id: "tools",
      label: "Tools",
      glyph: "TL",
      hint: "Mentor, analyzer, simulator, and research stack.",
      action: () => jumpToPageSection("tools", "tools-workbench", activeDesk),
      metaLabel: "Research reports",
      metaValue: "Desk-linked",
    },
    {
      id: "connections",
      label: "Connections",
      glyph: "CN",
      hint: "Feeds, brokers, and live-routing readiness.",
      action: () => jumpToPageSection("connections", "connections-overview", activeDesk),
      metaLabel: "Configured",
      metaValue: `${connectedProviderCount} providers`,
    },
  ];
  const homeActions = [
    {
      id: "trade",
      label: "Today's Signal",
      meta: strongestSignal?.label || "Waiting",
      detail: "Jump straight into the chart, plan, and ticket for the strongest live setup.",
      onClick: () => jumpToPageSection("signals", "chart-panel", activeDesk),
    },
    {
      id: "news",
      label: "Macro Tape",
      meta: leadNewsItem?.sourceName || "Tape",
      detail: "Read the lead headlines before you route the next decision.",
      onClick: () => jumpToPageSection("news", "macro-feed", activeDesk),
    },
    {
      id: "portfolio",
      label: "Portfolio Pulse",
      meta: `${openTrades.length} open`,
      detail: "Review the live book, current PnL, and the most recent position changes.",
      onClick: () => jumpToPageSection("portfolio", "open-positions"),
    },
    {
      id: "reports",
      label: "Reports",
      meta: `${sessionReadinessScore}%`,
      detail: "Open the chart-rich reporting workspace and review the book visually.",
      onClick: () => jumpToPageSection("reports", "reports-performance", activeDesk),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="home"
        eyebrow="Daily Command Center"
        title="Home"
        description="A premium session hub for subscribers: today's best setup, macro context, portfolio pulse, and launch paths into every workspace."
        statusLabel="Session readiness"
        statusValue={`${sessionReadinessScore}% ready`}
        metrics={[
          {
            label: "Best signal",
            value: strongestSignal?.label || "Waiting",
            detail: strongestSignal?.setup || "Monitoring the desk",
          },
          {
            label: "Macro lead",
            value: leadNewsItem?.sourceName || "Waiting",
            detail: labelDesk(activeDesk),
          },
          {
            label: "Open book",
            value: openTrades.length,
            detail: Number.isFinite(totalOpenPnl)
              ? `${totalOpenPnl >= 0 ? "+" : ""}${totalOpenPnl.toFixed(2)}% live PnL`
              : "No live PnL yet",
          },
        ]}
        primaryAction={{
          label: "Open Today's Signal",
          onClick: () => jumpToPageSection("signals", "chart-panel", activeDesk),
        }}
        secondaryAction={{
          label: "Open Reports",
          onClick: () => jumpToPageSection("reports", "reports-performance", activeDesk),
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("home", sectionId, activeDesk)}
      />
      <WorkspaceCommandBar
        tone="home"
        title="Subscriber Shortcuts"
        hint="Move straight into the next high-value workflow without hunting around the app."
        actions={homeActions}
      />

      <section className="homeCommandDeck" id="home-overview">
        <article className="homeLeadPanel">
          <div className="homeLeadTop">
            <div>
              <span className="homePanelEyebrow">Today's best signal</span>
              <h2>{strongestSignal?.headline || strongestSignal?.label || "Waiting for the next clean setup"}</h2>
            </div>
            <div className="homeLeadStatus">
              <span>Confidence</span>
              <strong>{strongestSignal ? `${strongestSignal.confidence}%` : "--"}</strong>
            </div>
          </div>

          <div className="homeLeadMetaRow">
            <span className={`signalBadge ${actionTone(strongestSignal?.action || "HOLD")}`}>
              {strongestSignal?.action || "WAIT"}
            </span>
            <span className="signalMiniTag">{strongestSignal?.setup || "Signal engine"}</span>
            <span className="signalMiniTag">{strongestSignal?.anchorTrend || "Trend watch"}</span>
          </div>

          <p className="homeLeadSummary">
            {strongestSignal?.thesis ||
              "The desk is monitoring for the next clean structure break, retest, and execution window."}
          </p>

          <div className="homeLeadStats">
            <div className="homeLeadStat">
              <span>Instrument</span>
              <strong>{strongestSignal?.label || "Waiting"}</strong>
            </div>
            <div className="homeLeadStat">
              <span>Price</span>
              <strong>{strongestSignal ? formatTickerPrice(strongestSignal.ticker, strongestSignal.price) : "--"}</strong>
            </div>
            <div className="homeLeadStat">
              <span>RSI</span>
              <strong>{strongestSignal?.rsi || "--"}</strong>
            </div>
            <div className="homeLeadStat">
              <span>Exit rule</span>
              <strong>{strongestSignal?.exitRule || "Desk discipline"}</strong>
            </div>
          </div>

          <div className="homeLeadActions">
            <button
              type="button"
              className="primaryButton"
              onClick={() => jumpToPageSection("signals", "chart-panel", strongestSignal?.desk || activeDesk)}
            >
              Open Signal
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => jumpToPageSection("news", "macro-feed", strongestSignal?.desk || activeDesk)}
            >
              Read Macro Context
            </button>
          </div>
        </article>

        <div className="homePulseGrid">
          <button
            type="button"
            className="homePulseCard"
            onClick={() => jumpToPageSection("news", "macro-feed", activeDesk)}
          >
            <span>Macro pulse</span>
            <strong>{leadNewsItem?.sourceName || "Waiting for tape"}</strong>
            <small>{leadNewsItem?.title || "The lead headline will anchor the next move here."}</small>
          </button>

          <button
            type="button"
            className="homePulseCard"
            onClick={() => jumpToPageSection("portfolio", "open-positions")}
          >
            <span>Portfolio pulse</span>
            <strong className={positiveTone(totalOpenPnl)}>
              {Number.isFinite(totalOpenPnl) ? `${totalOpenPnl >= 0 ? "+" : ""}${totalOpenPnl.toFixed(2)}%` : "--"}
            </strong>
            <small>{openTrades.length} open positions in the current book.</small>
          </button>

          <button
            type="button"
            className="homePulseCard"
            onClick={() => jumpToPageSection("reports", "reports-performance", activeDesk)}
          >
            <span>Reports pulse</span>
            <strong>{openTrades.length ? "Live curve" : "Analytics ready"}</strong>
            <small>Performance graphs, desk exposure, and signal pressure are live.</small>
          </button>

          <button
            type="button"
            className="homePulseCard"
            onClick={() => jumpToPageSection("connections", "connections-overview", activeDesk)}
          >
            <span>Readiness</span>
            <strong>{liveReadyDeskCount} live-ready desks</strong>
            <small>{signalsResponse.marketData?.provider || "Simulator"} is currently backing the desk.</small>
          </button>
        </div>

        <div className="homeDeskPulseGrid">
          {deskPulseCards.map((card) => (
            <button
              key={card.deskKey}
              type="button"
              className="homeDeskPulseCard"
              onClick={() =>
                jumpToPageSection(
                  card.deskKey === "forex" || card.deskKey === "crypto" || card.deskKey === "etfs" || card.deskKey === "jse"
                    ? "signals"
                    : "news",
                  "signals-grid",
                  card.deskKey,
                )
              }
            >
              <div className="homeDeskPulseTop">
                <span>{card.label}</span>
                <strong>{card.routeMode}</strong>
              </div>
              <div className="homeDeskPulseBody">
                <strong>{card.signal?.label || "Monitoring"}</strong>
                <small>
                  {card.signal
                    ? `${card.signal.action} | ${formatTickerPrice(card.signal.ticker, card.signal.price)} | RSI ${card.signal.rsi}`
                    : "No lead setup in this lane yet."}
                </small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="splitGrid">
        <section className="panel" id="home-launchpad">
          <div className="panelHeader">
            <div>
              <h2>Open a workspace</h2>
              <p>Move from the command center into the exact lane you want without losing context.</p>
            </div>
            <div className="headerStatus">
              <span>Current desk</span>
              <strong>{labelDesk(activeDesk)}</strong>
            </div>
          </div>

          <div className="homeLaunchGrid">
            {launchCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className="homeLaunchCard"
                onClick={card.action}
              >
                <div className="homeLaunchTop">
                  <span className="navGlyph">{card.glyph}</span>
                  <div className="homeLaunchCopy">
                    <strong>{card.label}</strong>
                    <small>{card.hint}</small>
                  </div>
                </div>
                <div className="homeLaunchMeta">
                  <span>{card.metaLabel}</span>
                  <strong>{card.metaValue}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel" id="home-partner">
          <div className="panelHeader">
            <div>
              <h2>Trust and readiness</h2>
              <p>Keep product trust visible: partner access, feed state, support load, and live environment health.</p>
            </div>
            <div className="headerStatus">
              <span>Partner access</span>
              <strong>{shareIsLive ? "Live" : "Private"}</strong>
            </div>
          </div>

          <div className="homeStatusStrip">
            <div className="homeStatusCard">
              <span>Public access</span>
              <strong>{shareIsLive ? "Live" : "Not shared"}</strong>
              <small>
                {shareIsLive ? shareStatus.publicUrl : "Open Settings and share the app when you want outside testers in."}
              </small>
            </div>
            <div className="homeStatusCard">
              <span>Market feeds</span>
              <strong>{marketModeLabel(signalsResponse.marketData?.mode)}</strong>
              <small>{signalsResponse.marketData?.provider || "Simulator"} is currently backing the live desk.</small>
            </div>
            <div className="homeStatusCard">
              <span>Partner board</span>
              <strong>{feedbackSummary.open || 0} open items</strong>
              <small>
                {latestFeedbackItem
                  ? `Latest note: ${latestFeedbackItem.title}`
                  : "No partner notes have landed yet."}
              </small>
            </div>
            <div className="homeStatusCard">
              <span>Frontend state</span>
              <strong>{health.metrics?.productionFrontendReady ? "Ready" : "Warming up"}</strong>
              <small>
                {health.metrics?.productionFrontendReady
                  ? "Built frontend, API health, and persisted state are all available."
                  : "The workspace is still warming up."}
              </small>
            </div>
          </div>

          <div className="panelActions">
            <button
              type="button"
              className="primaryButton"
              onClick={() => navigateToPage("settings", false, activeDesk)}
            >
              Open Partner Testing
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => navigateToPage("connections", false, activeDesk)}
            >
              Review Connections
            </button>
          </div>
        </section>
      </div>

      <section className="panel" id="home-activity">
        <div className="panelHeader">
          <div>
            <h2>Session Pulse</h2>
            <p>Show what's moving right now across signal, tape, book, and product state.</p>
          </div>
        </div>

        <div className="homeActivityGrid">
          <div className="homeActivityCard">
            <span>Best signal now</span>
            <strong>{strongestSignal?.label || "Waiting for setup"}</strong>
            <small>
              {strongestSignal
                ? `${strongestSignal.action} | ${strongestSignal.setup} | ${strongestSignal.anchorTrend}`
                : "The engine will surface the next clean desk setup here."}
            </small>
          </div>
          <div className="homeActivityCard">
            <span>Lead headline</span>
            <strong>{leadNewsItem?.sourceName || "Feed warming up"}</strong>
            <small>{leadNewsItem?.title || "The latest macro headline will appear here once the feed settles."}</small>
          </div>
          <div className="homeActivityCard">
            <span>Latest position</span>
            <strong>{latestOpenTrade?.marketLabel || latestOpenTrade?.label || "No open positions"}</strong>
            <small>
              {latestOpenTrade
                ? `${latestOpenTrade.side} | ${latestOpenTrade.executionLabel || "Paper"} | Updated ${formatDateTime(
                    latestOpenTrade.updatedAt || latestOpenTrade.createdAt,
                    appSettings.timezone,
                  )}`
                : "Open a ticket from the trade desk to see live position context here."}
            </small>
          </div>
          <div className="homeActivityCard">
            <span>Workspace state</span>
            <strong>{labelRegion(appSettings.preferredRegion)}</strong>
            <small>
              {shareIsLive
                ? "Shared partner route is live and ready for outside feedback."
                : "Private workspace mode is active until you expose a partner route."}
            </small>
          </div>
        </div>
      </section>
    </>
  );
}

export function NewsScreen({
  activeDesk,
  activeDeskNewsLabel,
  activeDeskProfile,
  activePageSections,
  appSettings,
  deskLeadSignal,
  globalHeadlineCount,
  handleDeskRoute,
  jumpToPageSection,
  leadNewsItem,
  newsResponse,
  newsSourceMap,
  refreshContext,
  southAfricaHeadlineCount,
}) {
  const newsActions = [
    {
      id: "trade",
      label: "Trade Desk",
      meta: deskLeadSignal?.label || "Waiting",
      detail: "Carry the tape straight into the execution workspace.",
      onClick: () => jumpToPageSection("signals", "chart-panel", activeDesk),
    },
    {
      id: "refresh",
      label: "Refresh Feed",
      meta: formatDateTime(newsResponse.refreshedAt, appSettings.timezone) || "Now",
      detail: "Pull the latest headlines and source state again.",
      onClick: refreshContext,
    },
    {
      id: "south-africa",
      label: "South Africa",
      meta: `${southAfricaHeadlineCount}`,
      detail: "Focus the tape on South African headlines and local macro.",
      onClick: () => handleDeskRoute("news", "jse"),
      active: activeDesk === "jse",
    },
    {
      id: "all",
      label: "All Markets",
      meta: `${newsResponse.items.length}`,
      detail: "Step back and scan the full cross-market tape.",
      onClick: () => handleDeskRoute("news", "all"),
      active: activeDesk === "all",
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="news"
        eyebrow="Macro Tape"
        title={activeDesk === "all" ? "Market News" : `${labelDesk(activeDesk)} News`}
        description="Dedicated macro tape, South African context, and trade-adjacent headlines in a separate workspace from execution."
        statusLabel="Feed refresh"
        statusValue={formatDateTime(newsResponse.refreshedAt, appSettings.timezone)}
        metrics={[
          {
            label: "Lead source",
            value: leadNewsItem?.sourceName || "Waiting",
            detail: activeDeskNewsLabel,
          },
          {
            label: "South Africa",
            value: southAfricaHeadlineCount,
            detail: "Local macro tape",
          },
          {
            label: "Global",
            value: globalHeadlineCount,
            detail: "Cross-market flow",
          },
        ]}
        primaryAction={{
          label: "Open Trade Desk",
          onClick: () => jumpToPageSection("signals", "chart-panel", activeDesk),
        }}
        secondaryAction={{
          label: "Refresh Feed",
          onClick: refreshContext,
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("news", sectionId, activeDesk)}
      />
      <WorkspaceCommandBar
        tone="news"
        title="Tape Shortcuts"
        hint="Shift between the tape, the desk, and the source flow quickly."
        actions={newsActions}
      />

      <section className="panel deskPanel" id="news-desk-selector">
        <div className="panelHeader">
          <div>
            <h2>Choose a news lens</h2>
            <p>Keep the tape anchored to the market lane you care about before you jump into trade execution.</p>
          </div>
          <div className="headerStatus">
            <span>Headlines</span>
            <strong>{newsResponse.items.length}</strong>
          </div>
        </div>

        <div className="deskToolbar">
          <div className="segmentedControl deskFilters" role="tablist" aria-label="News desks">
            {DESK_FILTERS.map((desk) => (
              <button
                key={desk.id}
                type="button"
                className={activeDesk === desk.id ? "active" : ""}
                onClick={() => handleDeskRoute("news", desk.id)}
              >
                {desk.label}
              </button>
            ))}
          </div>

          <div className="deskStats">
            <div className="deskStat">
              <span>Focus</span>
              <strong>{activeDeskNewsLabel}</strong>
            </div>
            <div className="deskStat">
              <span>Sources</span>
              <strong>{newsResponse.sources.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="summaryGrid">
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("news", "macro-feed", activeDesk)}
        >
          <span>Total headlines</span>
          <strong>{newsResponse.items.length}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("news", "macro-feed", activeDesk)}
        >
          <span>South Africa</span>
          <strong>{southAfricaHeadlineCount}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("news", "macro-feed", activeDesk)}
        >
          <span>Global</span>
          <strong>{globalHeadlineCount}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("signals", "chart-panel", activeDesk)}
        >
          <span>Trade desk</span>
          <strong>{activeDesk === "all" ? "Open trade" : findDeskMeta(activeDesk).heading}</strong>
        </button>
      </section>

      <div className="splitGrid">
        <section className="panel" id="news-lead">
          <div className="panelHeader">
            <div>
              <h2>{leadNewsItem?.title || "Lead headline loading"}</h2>
              <p>
                {leadNewsItem?.summary || "The lead story will show here as the feed settles."}
              </p>
            </div>
            <div className="headerStatus">
              <span>Desk lens</span>
              <strong>{activeDeskNewsLabel}</strong>
            </div>
          </div>

          {leadNewsItem ? (
            <>
              <div className="signalCommandGrid">
                <div className="signalCommandMetric">
                  <span>Source</span>
                  <strong>{leadNewsItem.sourceName}</strong>
                </div>
                <div className="signalCommandMetric">
                  <span>Region</span>
                  <strong>{leadNewsItem.region === "south-africa" ? "JSE / ZAR" : "Global"}</strong>
                </div>
                <div className="signalCommandMetric">
                  <span>Timestamp</span>
                  <strong>
                    {formatDateTime(
                      leadNewsItem.publishedAt || leadNewsItem.seenAt,
                      appSettings.timezone,
                    )}
                  </strong>
                </div>
                <div className="signalCommandMetric">
                  <span>Trade route</span>
                  <strong>{deskLeadSignal?.label || "Waiting"}</strong>
                </div>
              </div>

              <div className="panelActions">
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() => jumpToPageSection("signals", "chart-panel", activeDesk)}
                >
                  Open Trade Desk
                </button>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => openExternal(leadNewsItem.link || newsSourceMap[leadNewsItem.sourceId])}
                >
                  Read Source
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="News is refreshing"
              body="The feed is warming up and the lead headline will appear once the sources respond."
            />
          )}
        </section>

        <section className="panel" id="chart-analyzer">
          <div className="panelHeader">
            <div>
              <h2>Desk context</h2>
              <p>Keep the macro tape and the actual trade lane stitched together.</p>
            </div>
          </div>

          <div className="deskBriefGrid">
            <div className="deskBriefCard">
              <span>Lens</span>
              <strong>{activeDeskNewsLabel}</strong>
              <small>
                {activeDesk === "all"
                  ? "Scan the full tape before narrowing to a desk."
                  : findDeskMeta(activeDesk).blurb}
              </small>
            </div>
            <div className="deskBriefCard">
              <span>Lead setup</span>
              <strong>{deskLeadSignal?.setup || "Waiting"}</strong>
              <small>
                {deskLeadSignal
                  ? `${deskLeadSignal.action} on ${deskLeadSignal.label} is currently leading this desk.`
                  : "The engine will promote the next clean setup here."}
              </small>
            </div>
            <div className="deskBriefCard">
              <span>Route</span>
              <strong>
                {activeDesk === "all"
                  ? "Desk-specific routing"
                  : `${providerLabel(activeDeskProfile?.providerId)} | ${marketModeLabel(
                      activeDeskProfile?.mode,
                    )}`}
              </strong>
              <small>
                {activeDesk === "crypto" && activeDeskProfile?.pair
                  ? `Preferred pair: ${activeDeskProfile.pair}.`
                  : "Switch into Trade when you want chart structure and execution tickets."}
              </small>
            </div>
            <div className="deskBriefCard">
              <span>Next action</span>
              <strong>{deskLeadSignal?.label || "Open trade desk"}</strong>
              <small>
                Read the tape here, then move into Trade when the setup and the story agree.
              </small>
            </div>
          </div>
        </section>
      </div>

      <section className="panel" id="macro-feed">
        <div className="panelHeader">
          <div>
            <h2>Macro Feed</h2>
            <p>{labelRegion(appSettings.preferredRegion)} headlines with honest timestamps.</p>
          </div>
        </div>

        <div className="newsList">
          {newsResponse.items.map((item) => {
            const targetUrl = item.link || newsSourceMap[item.sourceId];
            const interactiveProps = targetUrl
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => openExternal(targetUrl),
                  onKeyDown: (event) => handleInteractiveKey(event, () => openExternal(targetUrl)),
                }
              : {};

            return (
              <article
                key={item.id}
                className={`newsItem interactiveCard ${targetUrl ? "clickable" : ""}`}
                {...interactiveProps}
              >
                <div className="newsItemTop">
                  <span>{item.sourceName}</span>
                  <span>{item.region === "south-africa" ? "JSE / ZAR" : "Global"}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary || "No summary available yet."}</p>
                <small>
                  {item.publishedAt ? "Published " : "Seen "}
                  {formatDateTime(item.publishedAt || item.seenAt, appSettings.timezone)}
                </small>
              </article>
            );
          })}
          {!newsResponse.items.length ? (
            <EmptyState
              title="News is refreshing"
              body="The feed is warming up and will fill in as sources respond."
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

export function ToolsScreen({
  activeChartPlan,
  activeDeskProfile,
  activePageSections,
  activeResearchReports,
  activeSignal,
  appSettings,
  chartUploadName,
  handleChartUpload,
  jumpToPageSection,
  leadNewsItem,
  mentorChecklist,
  mentorSummary,
  navigateToPage,
  openResearchReport,
  openTrades,
  toolStatus,
  toolsDeskKey,
}) {
  const learningTracks = [
    {
      id: "ema",
      label: "EMA Framework",
      title: "8 / 21 EMA entries and exits",
      progress: activeSignal ? 100 : 68,
      detail: activeSignal
        ? "The live desk already has an active setup you can study against the framework."
        : "Review the cross, retest, and invalidation flow before you act.",
    },
    {
      id: "macro",
      label: "Macro Context",
      title: "Tape before trade",
      progress: leadNewsItem ? 100 : 62,
      detail: leadNewsItem
        ? `${leadNewsItem.sourceName} is anchoring the current desk context.`
        : "Use this track to understand the story behind the next move.",
    },
    {
      id: "risk",
      label: "Risk Management",
      title: "Stops, targets, and discipline",
      progress: activeChartPlan ? 100 : mentorChecklist.length ? 76 : 54,
      detail: activeChartPlan
        ? "A live structure plan is already available to review."
        : "Build cleaner stop, target, and invalidation habits before routing.",
    },
  ];
  const progressModules = [
    {
      id: "context",
      label: "Market context",
      value: leadNewsItem ? 100 : 40,
      meta: leadNewsItem ? "Lead tape loaded" : "Feed still warming up",
    },
    {
      id: "analysis",
      label: "Chart analysis",
      value: chartUploadName ? 100 : activeSignal ? 74 : 38,
      meta: chartUploadName ? "Screenshot ready" : activeSignal ? "Live chart available" : "No active chart yet",
    },
    {
      id: "simulation",
      label: "Simulator",
      value: activeDeskProfile?.mode === "paper" ? 100 : 82,
      meta: activeDeskProfile?.mode === "paper" ? "Paper first" : "Live-capable desk",
    },
    {
      id: "discipline",
      label: "Execution discipline",
      value: activeChartPlan ? 100 : mentorChecklist.length ? 72 : 44,
      meta: activeChartPlan ? "Plan structured" : "Plan still forming",
    },
  ];
  const progressScore = Math.round(average(progressModules.map((item) => item.value)));
  const toolActions = [
    {
      id: "mentor",
      label: "AI Mentor",
      meta: mentorSummary.action,
      detail: "Start with the plain-English read before touching the ticket.",
      onClick: () => jumpToPageSection("tools", "tools-workbench", toolsDeskKey),
    },
    {
      id: "analyzer",
      label: "Snap & Analyze",
      meta: chartUploadName || "No upload",
      detail: "Upload a stock or crypto chart and compare it against the live desk.",
      onClick: () => jumpToPageSection("tools", "chart-analyzer", toolsDeskKey),
    },
    {
      id: "simulator",
      label: "Simulator",
      meta: activeDeskProfile?.mode === "paper" ? "Paper" : "Live-capable",
      detail: "Pressure-test the idea with virtual money before you commit.",
      onClick: () => jumpToPageSection("tools", "scenario-simulator", toolsDeskKey),
    },
    {
      id: "learn",
      label: "Learn",
      meta: `${learningTracks.length} tracks`,
      detail: "Step-by-step learning cards for strategy, context, and risk.",
      onClick: () => jumpToPageSection("tools", "learn-dashboard", toolsDeskKey),
    },
    {
      id: "progress",
      label: "Progress",
      meta: `${progressScore}%`,
      detail: "Current readiness across context, analysis, simulation, and discipline.",
      onClick: () => jumpToPageSection("tools", "progress-dashboard", toolsDeskKey),
    },
    {
      id: "connections",
      label: "Connections",
      meta: marketModeLabel(activeDeskProfile?.mode || "paper"),
      detail: "Check route health before carrying a tool idea into execution.",
      onClick: () => navigateToPage("connections", false, toolsDeskKey),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="tools"
        eyebrow="Decision Support"
        title="Tools"
        description="Decision support, practice, and research tools that sit beside the live desk without getting in its way."
        statusLabel="Active desk"
        statusValue={labelDesk(toolsDeskKey)}
        metrics={[
          {
            label: "AI mentor",
            value: mentorSummary.action,
            detail: mentorSummary.setup,
          },
          {
            label: "Chart intake",
            value: chartUploadName || "No upload yet",
            detail: activeSignal?.label || "Waiting for lead market",
          },
          {
            label: "Research",
            value: activeResearchReports.length,
            detail: "Desk-linked reports",
          },
        ]}
        primaryAction={{
          label: "Open Trade Desk",
          onClick: () => jumpToPageSection("signals", "chart-panel", toolsDeskKey),
        }}
        secondaryAction={{
          label: "Open News",
          onClick: () => jumpToPageSection("news", "macro-feed", toolsDeskKey),
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("tools", sectionId, toolsDeskKey)}
      />
      <WorkspaceCommandBar
        tone="tools"
        title="Workbench Shortcuts"
        hint="Move between mentoring, analysis, simulation, and research without breaking context."
        actions={toolActions}
      />

      {toolStatus ? <div className="statusBanner subtleBanner">{toolStatus}</div> : null}

      <section className="summaryGrid">
        <div className="summaryCard">
          <span>AI mentor</span>
          <strong>{mentorSummary.action}</strong>
        </div>
        <div className="summaryCard">
          <span>Chart intake</span>
          <strong>{chartUploadName ? "Chart uploaded" : "Snap & Analyze"}</strong>
        </div>
        <div className="summaryCard">
          <span>Learning tracks</span>
          <strong>{learningTracks.length}</strong>
        </div>
        <div className="summaryCard">
          <span>Progress</span>
          <strong>{progressScore}%</strong>
        </div>
      </section>

      <div className="splitGrid">
        <section className="panel" id="tools-workbench">
          <div className="panelHeader">
            <div>
              <h2>AI Mentor</h2>
              <p>Translate the current desk into plain English before you move into execution.</p>
            </div>
            <div className="headerStatus">
              <span>Lead setup</span>
              <strong>{mentorSummary.setup}</strong>
            </div>
          </div>

          <div className="deskBriefGrid">
            <div className="deskBriefCard">
              <span>What the desk is saying</span>
              <strong>{mentorSummary.action}</strong>
              <small>{mentorSummary.rationale}</small>
            </div>
            <div className="deskBriefCard">
              <span>Invalidation</span>
              <strong>{mentorSummary.setup}</strong>
              <small>{mentorSummary.invalidation}</small>
            </div>
            <div className="deskBriefCard">
              <span>Macro link</span>
              <strong>{leadNewsItem?.sourceName || "Feed warming up"}</strong>
              <small>
                {leadNewsItem?.title ||
                  "Open the News screen to ground the next trade in the current tape."}
              </small>
            </div>
            <div className="deskBriefCard">
              <span>Checklist</span>
              <strong>{mentorChecklist.length} checks</strong>
              <small>{mentorChecklist[0] || "The desk checklist will appear here."}</small>
            </div>
          </div>

          <div className="toolBulletList">
            {mentorChecklist.map((item) => (
              <div className="toolBullet" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

          <div className="panelActions">
            <button
              type="button"
              className="primaryButton"
              onClick={() => jumpToPageSection("signals", "chart-panel", toolsDeskKey)}
            >
              Open Trade Desk
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => jumpToPageSection("news", "macro-feed", toolsDeskKey)}
            >
              Open News
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => navigateToPage("connections", false, toolsDeskKey)}
            >
              Check Connections
            </button>
          </div>
        </section>

        <section className="panel" id="scenario-simulator">
          <div className="panelHeader">
            <div>
              <h2>Chart Analyzer</h2>
              <p>Queue a chart image for comparison against the active live setup and structure plan.</p>
            </div>
          </div>

          <div className="toolCardList">
            <div className="toolCard">
              <span>Live chart context</span>
              <strong>{activeSignal?.label || "Waiting for a lead market"}</strong>
              <small>
                {activeSignal
                  ? `EMA8 ${formatTickerPrice(activeSignal.ticker, activeSignal.ema8)} · EMA21 ${formatTickerPrice(activeSignal.ticker, activeSignal.ema21)}`
                  : "The current chart context will appear here once the desk has a lead setup."}
              </small>
            </div>
            <div className="toolCard">
              <span>Structure plan</span>
              <strong>{activeChartPlan?.source || "Desk preset"}</strong>
              <small>
                {activeChartPlan
                  ? `${activeChartPlan.side} stop ${formatTickerPrice(activeSignal?.ticker, activeChartPlan.stopPrice)} · target ${formatTickerPrice(activeSignal?.ticker, activeChartPlan.targetPrice)}`
                  : "Open the Trade screen to generate a live structure plan."}
              </small>
            </div>
            <div className="toolCard">
              <span>Chart upload</span>
              <strong>{chartUploadName || "No chart uploaded"}</strong>
              <small>
                Use this for screenshots or external chart captures you want to compare with the live desk.
              </small>
            </div>
          </div>

          <div className="panelActions">
            <label className="ghostButton toolUploadButton">
              Upload Chart
              <input type="file" accept="image/*" onChange={handleChartUpload} />
            </label>
            <button
              type="button"
              className="primaryButton"
              onClick={() => jumpToPageSection("signals", "chart-panel", toolsDeskKey)}
            >
              Review Live Chart
            </button>
          </div>
        </section>
      </div>

      <div className="splitGrid">
        <section className="panel" id="research-library">
          <div className="panelHeader">
            <div>
              <h2>Scenario Simulator</h2>
              <p>Keep practice and planning separate from live routing so you can test the idea first.</p>
            </div>
          </div>

          <div className="deskBriefGrid">
            <div className="deskBriefCard">
              <span>Execution mode</span>
              <strong>{marketModeLabel(activeDeskProfile?.mode || "paper")}</strong>
              <small>
                {activeDeskProfile?.mode === "live"
                  ? "This desk can route live, so use the simulator to pressure-test the idea first."
                  : "Paper mode is active, which makes this the right place to test scenarios."}
              </small>
            </div>
            <div className="deskBriefCard">
              <span>Open positions</span>
              <strong>{openTrades.length}</strong>
              <small>Use current positions as references for sizing, notes, and close discipline.</small>
            </div>
            <div className="deskBriefCard">
              <span>Risk mode</span>
              <strong>{appSettings.riskMode}</strong>
              <small>Stay consistent between the simulator, the ticket, and the actual desk.</small>
            </div>
            <div className="deskBriefCard">
              <span>Next action</span>
              <strong>{activeSignal?.action || "Wait"}</strong>
              <small>When the scenario feels clean, carry it across into the Trade screen.</small>
            </div>
          </div>

          <div className="panelActions">
            <button
              type="button"
              className="primaryButton"
              onClick={() => jumpToPageSection("portfolio", "open-positions")}
            >
              Review Portfolio
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => jumpToPageSection("signals", "signals-grid", toolsDeskKey)}
            >
              Open Setups
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Research Library</h2>
              <p>Keep the desk anchored to the reports and playbooks already informing the workflow.</p>
            </div>
          </div>

          <div className="toolCardList">
            {activeResearchReports.map((report) => (
              <button
                key={report.id}
                type="button"
                className="toolCard toolCardButton"
                onClick={() => openResearchReport(report)}
              >
                <span>
                  {report.targetDesk === "crypto"
                    ? "Crypto"
                    : report.targetDesk === "forex"
                      ? "Forex"
                      : "Desk"}
                </span>
                <strong>{report.title}</strong>
                <small>{report.subtitle}</small>
              </button>
            ))}
            {!activeResearchReports.length ? (
              <EmptyState
                title="No research pinned to this desk"
                body="Switch desks or add more desk-linked reports to expand the tool shelf."
              />
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}

export function CollectiblesScreen({
  activeCollectible,
  activeService = "valuation",
  activePageSections,
  appSettings,
  authToken,
  collectibleBrand,
  collectibleCategory,
  collectibleImports,
  collectiblePortfolio,
  collectibleQuery,
  collectibles,
  collectiblesResponse,
  filteredCollectibles,
  handleCollectibleSelect,
  jumpToPageSection,
  openCollectibleTicket,
  refreshContext,
  setCollectibleBrand,
  setCollectibleCategory,
  setCollectibleQuery,
}) {
  const [importBusyId, setImportBusyId] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [revalueBusyId, setRevalueBusyId] = useState("");
  const [portfolioStatus, setPortfolioStatus] = useState("");
  const [saleBusyId, setSaleBusyId] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("all");
  const [portfolioImportBusyId, setPortfolioImportBusyId] = useState("");
  const officialShelves = collectiblesResponse.referenceShelves || [];
  const partnerSources = (collectiblesResponse.partnerSources || []).filter(
    (source) => source.category === "LEGO",
  );
  const reviewedPortfolios = (collectiblesResponse.reviewedPortfolios || []).filter(
    (portfolio) => portfolio.category === "LEGO" || portfolio.categoryId === "lego",
  );
  const legoReferenceShelf =
    officialShelves.find((shelf) => shelf.brand === "LEGO") || officialShelves[0] || null;
  const collectibleHoldings = (collectiblePortfolio.items || []).filter(
    (holding) => holding.category === "lego" || holding.categoryLabel === "LEGO",
  );
  const collectibleTransactions = (collectiblePortfolio.transactions || []).filter(
    (transaction) => transaction.category === "lego" || transaction.categoryLabel === "LEGO",
  );
  const collectibleSummary = collectiblePortfolio.summary || {};
  const inventoryCategories = collectibleSummary.categoryBreakdown || [];
  const filteredOwnedInventory = collectibleHoldings.filter((holding) => {
    const matchesCategory = inventoryCategory === "all" || holding.category === inventoryCategory;
    const query = inventoryQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [holding.name, holding.identifier, holding.categoryLabel, holding.rarity, holding.condition]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });
  const queuedSourceIds = new Set((collectibleImports || []).map((item) => item.sourceId));
  const importedBatchIds = new Set(
    collectibleHoldings.map((holding) => holding.importBatchId).filter(Boolean),
  );
  const queueImport = async (sourceId) => {
    setImportBusyId(sourceId);
    setImportStatus("");

    try {
      const response = await fetch("/api/collectibles/imports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sourceId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "collectible_source_import_failed");
      }
      setImportStatus(
        payload.duplicate
          ? "That source is already queued for import review."
          : "Source queued. Review is required before holdings are imported.",
      );
      await refreshContext();
    } catch {
      setImportStatus("The source could not be queued. Please try again.");
    } finally {
      setImportBusyId("");
    }
  };
  const revalueHolding = async (holdingId) => {
    setRevalueBusyId(holdingId);
    setPortfolioStatus("");

    try {
      const response = await fetch(`/api/collectibles/portfolio/${holdingId}/revalue`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "collectible_revalue_failed");
      }
      setPortfolioStatus("Holding refreshed with the latest available evidence.");
      await refreshContext();
    } catch {
      setPortfolioStatus("The holding could not be refreshed. Please try again.");
    } finally {
      setRevalueBusyId("");
    }
  };
  const importReviewedPortfolio = async (portfolioId) => {
    setPortfolioImportBusyId(portfolioId);
    setPortfolioStatus("");

    try {
      const response = await fetch(`/api/collectibles/partner-portfolios/${portfolioId}/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "partner_portfolio_import_failed");
      }
      setPortfolioStatus(
        payload.duplicate
          ? "That reviewed portfolio is already in your inventory."
          : `${payload.importedCount} reviewed positions imported into inventory.`,
      );
      await refreshContext();
    } catch {
      setPortfolioStatus("The reviewed portfolio could not be imported.");
    } finally {
      setPortfolioImportBusyId("");
    }
  };
  const recordSale = async (holding) => {
    const quantity = window.prompt(`How many ${holding.name} items were sold?`, "1");
    if (!quantity) return;
    const unitPriceZAR = window.prompt("Sale price per item in ZAR?");
    if (!unitPriceZAR) return;

    setSaleBusyId(holding.id);
    setPortfolioStatus("");
    try {
      const response = await fetch(`/api/collectibles/portfolio/${holding.id}/sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          quantity: Number(quantity),
          unitPriceZAR: Number(unitPriceZAR),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "collectible_sale_failed");
      }
      setPortfolioStatus("Sale recorded. Portfolio performance has been updated.");
      await refreshContext();
    } catch {
      setPortfolioStatus("The sale could not be recorded. Check the quantity and price.");
    } finally {
      setSaleBusyId("");
    }
  };
  const groupedCollectibles = [
    ...(collectiblesResponse.brands || [])
      .map((brand) => ({
        brand,
        items: filteredCollectibles.filter((item) => item.brand === brand),
      }))
      .filter((group) => group.items.length),
    ...Array.from(
      new Map(
        filteredCollectibles
          .filter(
            (item) =>
              !(collectiblesResponse.brands || []).some((brand) => brand === item.brand),
          )
          .map((item) => [item.brand, { brand: item.brand, items: [] }]),
      ).values(),
    ).map((group) => ({
      ...group,
      items: filteredCollectibles.filter((item) => item.brand === group.brand),
    })),
  ];
  const collectibleActions = [
    {
      id: "valuation",
      label: "Rate Purchase",
      meta: "Start here",
      detail: "Open the LEGO valuation workflow for market value, rarity, and projections.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-valuation"),
    },
    {
      id: "collection",
      label: "My Collection",
      meta: `${collectibleSummary.itemCount || 0}`,
      detail: "Review saved purchases, current estimates, and long-range projection scenarios.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-portfolio"),
    },
    {
      id: "owned-inventory",
      label: "Owned Inventory",
      meta: `${collectibleSummary.itemCount || 0}`,
      detail: "Search the owned collection register with cost, value, condition, and rarity.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-owned-inventory"),
    },
    {
      id: "reviewed-portfolios",
      label: "Reviewed Imports",
      meta: `${reviewedPortfolios.length}`,
      detail: "Load reviewed portfolios into owned inventory with reconciled invoice references.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-reviewed-portfolios"),
    },
    {
      id: "partner-sources",
      label: "Source Library",
      meta: `${partnerSources.length}`,
      detail: "Open portfolio documents, shared folders, and market references.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-partner-sources"),
    },
    {
      id: "inventory",
      label: "Tradable Inventory",
      meta: `${filteredCollectibles.length}`,
      detail: "Stay inside Collecttrade and scan the items you can actually act on.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-grid"),
    },
    {
      id: "source",
      label: "Official Sources",
      meta: legoReferenceShelf?.sourceName || "Reference",
      detail: "Verify lineups and product context without leaving the core workflow too early.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-reference"),
    },
    {
      id: "buy",
      label: "Inventory Ticket",
      meta: activeCollectible?.brand || "Select item",
      detail: "Open the collectible ticket flow on the current focus item.",
      onClick: () => activeCollectible && openCollectibleTicket(activeCollectible, "BUY"),
      disabled: !activeCollectible,
    },
    {
      id: "portfolio",
      label: "My Collection",
      meta: "Review holdings",
      detail: "Review saved purchases, estimates, and projection scenarios.",
      onClick: () => jumpToPageSection("collectibles", "collectibles-portfolio"),
    },
  ];

  return (
    <div className={`collectiblesServicePage collectiblesService-${activeService}`}>
      <WorkspaceHero
        tone="collectibles"
        eyebrow="LEGO Investment Register"
        title="LEGO Collection"
        description="Rate purchases, document evidence, and track LEGO sets, minifigures, sealed items, reviewed imports, and investment activity."
        statusLabel="Inventory refresh"
        statusValue={formatDateTime(collectiblesResponse.updatedAt, appSettings.timezone)}
        metrics={[
          {
            label: "Tradable items",
            value: collectibles.length,
            detail: "Research inventory",
          },
          {
            label: "Brands",
            value: (collectiblesResponse.brands || []).length,
            detail: "Across tracked categories",
          },
          {
            label: "Lead item",
            value: activeCollectible?.brand || "Waiting",
            detail: activeCollectible?.name || "Select an item",
          },
          {
            label: "Official shelf",
            value: legoReferenceShelf?.sourceName || "Waiting",
            detail: legoReferenceShelf?.title || "Reference layer",
          },
        ]}
        primaryAction={{
          label: "Rate a Purchase",
          onClick: () => jumpToPageSection("collectibles", "collectibles-valuation"),
        }}
        secondaryAction={{
          label: "Review My Collection",
          onClick: () => jumpToPageSection("collectibles", "collectibles-portfolio"),
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("collectibles", sectionId)}
      />
      <WorkspaceCommandBar
        tone="collectibles"
        title="Collectibles Shortcuts"
        hint="Keep valuation, inventory, verification, and collection review in one tidy flow."
        actions={collectibleActions}
      />

      <CollectibleValuationPanel authToken={authToken} onSaved={refreshContext} />

      <section className="panel" id="collectibles-portfolio">
        <div className="panelHeader">
          <div>
            <h2>My Collectibles Portfolio</h2>
            <p>
              Save rated purchases here to track the amount invested, the latest evidence-led
              estimate, and the 1, 5, and 10 year scenarios used throughout the register.
            </p>
          </div>
          <div className="headerStatus">
            <span>Saved items</span>
            <strong>{collectibleSummary.itemCount || 0}</strong>
          </div>
        </div>

        <section className="summaryGrid">
          <div className="summaryCard">
            <span>Cost basis</span>
            <strong>{formatZar(collectibleSummary.purchaseValueZAR)}</strong>
          </div>
          <div className="summaryCard">
            <span>Current estimate</span>
            <strong>{formatZar(collectibleSummary.currentValueZAR)}</strong>
          </div>
          <div className="summaryCard">
            <span>Unrealized gain</span>
            <strong>{formatZar(collectibleSummary.unrealizedPnlZAR)}</strong>
          </div>
          <div className="summaryCard">
            <span>Realized gain</span>
            <strong>{formatZar(collectibleSummary.realizedPnlZAR)}</strong>
          </div>
          <div className="summaryCard">
            <span>5 year scenario</span>
            <strong>{formatZar(collectibleSummary.projectedFiveYearsZAR)}</strong>
          </div>
          <div className="summaryCard">
            <span>10 year scenario</span>
            <strong>{formatZar(collectibleSummary.projectedTenYearsZAR)}</strong>
          </div>
        </section>

        {collectibleHoldings.length ? (
          <div className="collectibleReferenceGrid">
            {collectibleHoldings.map((holding) => (
              <article className="collectibleReferenceCard" key={holding.id}>
                <div className="collectibleReferenceTop">
                  <span>{holding.categoryLabel}</span>
                  <strong>{holding.score}/10</strong>
                </div>
                <h3>{holding.name}</h3>
                <p>
                  {holding.identifier} | Quantity {holding.quantity}
                </p>
                <div className="collectibleReferenceMeta">
                  <div>
                    <span>You paid</span>
                    <strong>{formatZar(holding.purchasePriceZAR)}</strong>
                  </div>
                  <div>
                    <span>Current</span>
                    <strong>{formatZar(holding.currentValueZAR)}</strong>
                  </div>
                </div>
                <div className="panelActions">
                  <button
                    className="ghostButton"
                    type="button"
                    disabled={revalueBusyId === holding.id}
                    onClick={() => revalueHolding(holding.id)}
                  >
                    {revalueBusyId === holding.id ? "Refreshing..." : "Refresh Valuation"}
                  </button>
                  <button
                    className="ghostButton"
                    type="button"
                    disabled={saleBusyId === holding.id}
                    onClick={() => recordSale(holding)}
                  >
                    {saleBusyId === holding.id ? "Recording..." : "Record Sale"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved collectibles yet"
            body="Rate a purchase above and save it to start the collection register."
          />
        )}
        {portfolioStatus ? <div className="statusBanner">{portfolioStatus}</div> : null}
      </section>

      <section className="panel" id="collectibles-owned-inventory">
        <div className="panelHeader">
          <div>
            <h2>Owned Inventory Register</h2>
            <p>
              Keep the operational collection record beside the investment view. Search the items
              you own and review the details that affect resale value.
            </p>
          </div>
          <div className="headerStatus">
            <span>Inventory items</span>
            <strong>{collectibleSummary.itemCount || 0}</strong>
          </div>
        </div>

        <div className="collectibleInventoryToolbar">
          <label>
            <span>Search owned inventory</span>
            <input
              type="search"
              value={inventoryQuery}
              onChange={(event) => setInventoryQuery(event.target.value)}
              placeholder="Name, reference, rarity, condition"
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={inventoryCategory}
              onChange={(event) => setInventoryCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {inventoryCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {inventoryCategories.length ? (
          <div className="collectibleInventoryCategoryGrid">
            {inventoryCategories.map((category) => (
              <article className="collectibleInventoryStat" key={category.id}>
                <span>{category.label}</span>
                <strong>{category.itemCount} items</strong>
                <small>{formatZar(category.currentValueZAR)} estimated value</small>
              </article>
            ))}
          </div>
        ) : null}

        {filteredOwnedInventory.length ? (
          <div className="collectibleInventoryTableWrap">
            <table className="collectibleInventoryTable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Condition</th>
                  <th>Rarity</th>
                  <th>Cost basis</th>
                  <th>Estimate</th>
                  <th>Gain</th>
                  <th>Score</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredOwnedInventory.map((holding) => (
                  <tr key={holding.id}>
                    <td>
                      <strong>{holding.name}</strong>
                      <small>{holding.identifier}</small>
                    </td>
                    <td>{holding.categoryLabel}</td>
                    <td>{holding.quantity}</td>
                    <td>{holding.condition || "Review required"}</td>
                    <td>{holding.rarity || "Review required"}</td>
                    <td>{formatZar(holding.purchasePriceZAR * holding.quantity)}</td>
                    <td>{formatZar(holding.currentValueZAR * holding.quantity)}</td>
                    <td>{formatZar(holding.profitZAR * holding.quantity)}</td>
                    <td>{holding.score}/10</td>
                    <td>{formatDateTime(holding.lastValuedAt, appSettings.timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={collectibleHoldings.length ? "No inventory matches that filter" : "No owned inventory yet"}
            body={
              collectibleHoldings.length
                ? "Adjust the search or category filter to see more of the collection."
                : "Rate and save a purchase to add the first collectible to inventory."
            }
          />
        )}
      </section>

      <section className="panel" id="collectibles-catalog">
        <div className="panelHeader">
          <div>
            <h2>Collection Catalog</h2>
            <p>
              Build a structured asset record for every collectible. Keep identifiers, category,
              condition, rarity, cost, and estimated value together so a physical collection can
              be searched, shared, and prepared for trade.
            </p>
          </div>
          <div className="headerStatus">
            <span>Cataloged assets</span>
            <strong>{collectibleHoldings.length}</strong>
          </div>
        </div>

        <section className="summaryGrid">
          <div className="summaryCard">
            <span>Asset records</span>
            <strong>{collectibleHoldings.length}</strong>
          </div>
          <div className="summaryCard">
            <span>Categories</span>
            <strong>{inventoryCategories.length}</strong>
          </div>
          <div className="summaryCard">
            <span>Evidence sources</span>
            <strong>{partnerSources.length}</strong>
          </div>
          <div className="summaryCard">
            <span>Reviewed imports</span>
            <strong>{importedBatchIds.size}</strong>
          </div>
        </section>

        {collectibleHoldings.length ? (
          <div className="collectibleReferenceGrid">
            {collectibleHoldings.slice(0, 12).map((holding) => (
              <article className="collectibleReferenceCard" key={holding.id}>
                <div className="collectibleReferenceTop">
                  <span>{holding.categoryLabel}</span>
                  <strong>{holding.identifier}</strong>
                </div>
                <h3>{holding.name}</h3>
                <p>
                  {holding.condition || "Condition review required"} |{" "}
                  {holding.rarity || "Rarity review required"}
                </p>
                <div className="collectibleReferenceMeta">
                  <div>
                    <span>Quantity</span>
                    <strong>{holding.quantity}</strong>
                  </div>
                  <div>
                    <span>Current estimate</span>
                    <strong>{formatZar(holding.currentValueZAR * holding.quantity)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No catalog records yet"
            body="Save a rated purchase or import a reviewed portfolio to start the collection catalog."
          />
        )}
        <div className="panelActions">
          <button
            type="button"
            className="ghostButton"
            onClick={() => jumpToPageSection("collectibles", "collectibles-owned-inventory")}
          >
            Open Full Inventory
          </button>
        </div>
      </section>

      <section className="panel" id="collectibles-documentation">
        <div className="panelHeader">
          <div>
            <h2>Documentation & Provenance</h2>
            <p>
              Preserve the evidence behind each investment decision. A serious collectible record
              should make its identification, condition, acquisition trail, and valuation sources
              easy to review before resale or insurance documentation.
            </p>
          </div>
          <div className="headerStatus">
            <span>Evidence sources</span>
            <strong>{partnerSources.length}</strong>
          </div>
        </div>

        <div className="deskBriefGrid">
          <article className="deskBriefCard">
            <span>01</span>
            <strong>Identification</strong>
            <p>Record the item name, category, reference number, edition, and quantity.</p>
          </article>
          <article className="deskBriefCard">
            <span>02</span>
            <strong>Condition</strong>
            <p>Document grading, sealed status, visible wear, and any appraisal notes.</p>
          </article>
          <article className="deskBriefCard">
            <span>03</span>
            <strong>Provenance</strong>
            <p>Keep acquisition cost, invoice references, shared documents, and source trail.</p>
          </article>
          <article className="deskBriefCard">
            <span>04</span>
            <strong>Valuation</strong>
            <p>Link comparable evidence and keep the latest 1, 5, and 10 year scenarios.</p>
          </article>
        </div>

        <section className="summaryGrid">
          <div className="summaryCard">
            <span>Condition documented</span>
            <strong>{collectibleHoldings.filter((holding) => holding.condition).length}</strong>
          </div>
          <div className="summaryCard">
            <span>Rarity documented</span>
            <strong>{collectibleHoldings.filter((holding) => holding.rarity).length}</strong>
          </div>
          <div className="summaryCard">
            <span>Shared references</span>
            <strong>{partnerSources.length}</strong>
          </div>
          <div className="summaryCard">
            <span>Reviewed portfolios</span>
            <strong>{reviewedPortfolios.length}</strong>
          </div>
        </section>

        <div className="panelActions">
          <button
            type="button"
            className="ghostButton"
            onClick={() => jumpToPageSection("collectibles", "collectibles-partner-sources")}
          >
            Review Source Library
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => jumpToPageSection("collectibles", "collectibles-reviewed-portfolios")}
          >
            Review Imports
          </button>
        </div>
      </section>

      <section className="panel" id="collectibles-digital-registry">
        <div className="panelHeader">
          <div>
            <h2>Digital Registry</h2>
            <p>
              Give each physical collectible a clear digital representation. The registry
              keeps the asset reference, ownership record, evidence state, and estimated value
              ready for future verification, sharing, and trade workflows.
            </p>
          </div>
          <div className="headerStatus">
            <span>Registry status</span>
            <strong>Ready</strong>
          </div>
        </div>

        <section className="summaryGrid">
          <div className="summaryCard">
            <span>Registered assets</span>
            <strong>{collectibleHoldings.length}</strong>
          </div>
          <div className="summaryCard">
            <span>Import batches</span>
            <strong>{importedBatchIds.size}</strong>
          </div>
          <div className="summaryCard">
            <span>Source references</span>
            <strong>{partnerSources.length}</strong>
          </div>
          <div className="summaryCard">
            <span>Verification state</span>
            <strong>Review ready</strong>
          </div>
        </section>

        {collectibleHoldings.length ? (
          <div className="collectibleReferenceGrid">
            {collectibleHoldings.slice(0, 12).map((holding) => (
              <article className="collectibleReferenceCard" key={holding.id}>
                <div className="collectibleReferenceTop">
                  <span>{holding.categoryLabel}</span>
                  <strong>Physical asset</strong>
                </div>
                <h3>{holding.name}</h3>
                <p>{holding.identifier} | Evidence linked | Review ready</p>
                <div className="collectibleReferenceMeta">
                  <div>
                    <span>Registry quantity</span>
                    <strong>{holding.quantity}</strong>
                  </div>
                  <div>
                    <span>Estimated value</span>
                    <strong>{formatZar(holding.currentValueZAR * holding.quantity)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="The digital registry is ready"
            body="Save a rated purchase or import a reviewed portfolio to create the first physical-asset record."
          />
        )}
      </section>

      <section className="panel" id="collectibles-transactions">
        <div className="panelHeader">
          <div>
            <h2>Investment Activity</h2>
            <p>
              Purchases and exits stay together so each collectible has an investment trail from
              acquisition through sale.
            </p>
          </div>
          <div className="headerStatus">
            <span>Transactions</span>
            <strong>{collectibleTransactions.length}</strong>
          </div>
        </div>

        {collectibleTransactions.length ? (
          <div className="collectibleReferenceGrid">
            {collectibleTransactions.map((transaction) => (
              <article className="collectibleReferenceCard" key={transaction.id}>
                <div className="collectibleReferenceTop">
                  <span>{transaction.categoryLabel}</span>
                  <strong>{transaction.type === "sale" ? "Sold" : "Purchased"}</strong>
                </div>
                <h3>{transaction.name}</h3>
                <p>
                  {transaction.identifier} | Quantity {transaction.quantity}
                </p>
                <div className="collectibleReferenceMeta">
                  <div>
                    <span>{transaction.type === "sale" ? "Sale value" : "Cost"}</span>
                    <strong>{formatZar(transaction.totalValueZAR)}</strong>
                  </div>
                  {transaction.type === "sale" ? (
                    <div>
                      <span>Realized gain</span>
                      <strong>{formatZar(transaction.realizedPnlZAR)}</strong>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No investment activity yet"
            body="Saved valuations become purchase records and appear here automatically."
          />
        )}
      </section>

      <section className="panel" id="collectibles-reviewed-portfolios">
        <div className="panelHeader">
          <div>
            <h2>Reviewed Portfolio Imports</h2>
            <p>
              Import reconciled collections into owned inventory. Raw invoices stay
              private; the working register keeps reviewed costs, estimates, grades, and invoice
              references.
            </p>
          </div>
          <div className="headerStatus">
            <span>Reviewed portfolios</span>
            <strong>{reviewedPortfolios.length}</strong>
          </div>
        </div>

        <div className="collectibleReferenceGrid">
          {reviewedPortfolios.map((portfolio) => (
            <article className="collectibleReferenceCard" key={portfolio.id}>
              <div className="collectibleReferenceTop">
                <span>{portfolio.category}</span>
                <strong>{portfolio.reviewStatus}</strong>
              </div>
              <h3>{portfolio.title}</h3>
              <p>{portfolio.notes}</p>
              <div className="collectibleReferenceMeta">
                <div>
                  <span>Positions</span>
                  <strong>{portfolio.positionCount}</strong>
                </div>
                <div>
                  <span>Cost</span>
                  <strong>{formatZar(portfolio.summary.purchaseValueZAR)}</strong>
                </div>
                <div>
                  <span>Market value</span>
                  <strong>{formatZar(portfolio.summary.currentValueZAR)}</strong>
                </div>
                <div>
                  <span>ROI</span>
                  <strong>{portfolio.summary.roiPercent}%</strong>
                </div>
              </div>
              <div className="panelActions">
                <button
                  type="button"
                  className="primaryButton"
                  disabled={
                    portfolioImportBusyId === portfolio.id || importedBatchIds.has(portfolio.id)
                  }
                  onClick={() => importReviewedPortfolio(portfolio.id)}
                >
                  {importedBatchIds.has(portfolio.id)
                    ? "Imported"
                    : portfolioImportBusyId === portfolio.id
                      ? "Importing..."
                      : "Import Reviewed Portfolio"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" id="collectibles-partner-sources">
        <div className="panelHeader">
          <div>
            <h2>Source Library</h2>
            <p>
              Keep the shared portfolio documents and market references close to the valuation
              workflow. These links stay as source material until a reviewed import pipeline is
              ready. Queue a source for reviewed import when it should become part of the working
              collection.
            </p>
          </div>
          <div className="headerStatus">
            <span>Shared sources</span>
            <strong>{partnerSources.length}</strong>
          </div>
        </div>

        <div className="collectibleReferenceGrid">
          {partnerSources.map((source) => (
            <article className="collectibleReferenceCard" key={source.id}>
              <div className="collectibleReferenceTop">
                <span>{source.category}</span>
                <strong>{source.sourceType}</strong>
              </div>
              <h3>{source.title}</h3>
              <p>{source.summary}</p>
              <div className="panelActions">
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => openExternal(source.url)}
                >
                  Open Source
                </button>
                <button
                  type="button"
                  className="ghostButton"
                  disabled={importBusyId === source.id || queuedSourceIds.has(source.id)}
                  onClick={() => queueImport(source.id)}
                >
                  {queuedSourceIds.has(source.id)
                    ? "Queued for Review"
                    : importBusyId === source.id
                      ? "Queueing..."
                      : "Queue Import Review"}
                </button>
              </div>
            </article>
          ))}
        </div>
        {importStatus ? <div className="statusBanner">{importStatus}</div> : null}
      </section>

      <section className="summaryGrid">
        <div className="summaryCard">
          <span>Tradable items</span>
          <strong>{collectibles.length}</strong>
        </div>
        <div className="summaryCard">
          <span>Brands</span>
          <strong>{(collectiblesResponse.brands || []).length}</strong>
        </div>
        <div className="summaryCard">
          <span>Categories</span>
          <strong>{(collectiblesResponse.categories || []).length}</strong>
        </div>
        <div className="summaryCard">
          <span>Updated</span>
          <strong>{formatDateTime(collectiblesResponse.updatedAt, appSettings.timezone)}</strong>
        </div>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("collectibles", "collectibles-reference")}
        >
          <span>Official sources</span>
          <strong>{legoReferenceShelf?.sourceName || "Reference"}</strong>
        </button>
      </section>

      <section className="panel" id="collectibles-lanes">
        <div className="panelHeader">
          <div>
            <h2>Collectibles Workflow</h2>
            <p>
              Keep the purchase-review workflow and the source-verification workflow distinct so
              the collection stays practical and evidence-led.
            </p>
          </div>
        </div>

        <div className="collectibleLaneGrid">
          <button
            type="button"
            className="collectibleLaneCard"
            onClick={() => jumpToPageSection("collectibles", "collectibles-grid")}
          >
            <span>Research Inventory</span>
            <strong>Review opportunities inside Collecttrade</strong>
            <small>
              Scan inventory ideas, compare thesis, open purchase or sale tickets, and keep the
              investment workflow inside the app.
            </small>
          </button>

          <button
            type="button"
            className="collectibleLaneCard"
            onClick={() => jumpToPageSection("collectibles", "collectibles-reference")}
          >
            <span>Official Sources</span>
            <strong>Verify the product context</strong>
            <small>
              Use official LEGO ZA and related source pages to validate lineups, themes, and retail
              context without making them the primary experience.
            </small>
          </button>
        </div>
      </section>

      {activeCollectible ? (
        <section className="panel" id="collectibles-focus">
          <div className="panelHeader">
            <div>
              <h2>{activeCollectible.name}</h2>
              <p>{activeCollectible.thesis || activeCollectible.description}</p>
            </div>
            <div className="priceCluster">
              <span>{formatCollectiblePrice(activeCollectible.price)}</span>
              <small>
                {activeCollectible.brand} | {activeCollectible.category}
              </small>
            </div>
          </div>

          <div className="stateGrid">
            <div>
              <span>Category</span>
              <strong>{activeCollectible.category}</strong>
            </div>
            <div>
              <span>Brand</span>
              <strong>{activeCollectible.brand}</strong>
            </div>
            <div>
              <span>Liquidity</span>
              <strong>{activeCollectible.liquidity}</strong>
            </div>
            <div>
              <span>Venue</span>
              <strong>{activeCollectible.venue}</strong>
            </div>
          </div>

          <div className="panelActions">
            <button
              type="button"
              className="primaryButton"
              onClick={() => openCollectibleTicket(activeCollectible, "BUY")}
            >
              Buy Ticket
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => openCollectibleTicket(activeCollectible, "SELL")}
            >
              Sell Ticket
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => jumpToPageSection("collectibles", "collectibles-portfolio")}
            >
              Review My Collection
            </button>
            {activeCollectible.brand === "LEGO" && legoReferenceShelf?.url ? (
              <button
                type="button"
                className="ghostButton"
                onClick={() => jumpToPageSection("collectibles", "collectibles-reference")}
              >
                View Source Notes
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel" id="collectibles-trading">
        <div className="panelHeader">
          <div>
            <h2>Research Inventory</h2>
            <p>
              These are the items you act on inside Collecttrade. Search, filter, compare, then
              move into the collectible purchase or sale flow.
            </p>
          </div>
          <div className="headerStatus">
            <span>Primary workflow</span>
            <strong>Review inside app</strong>
          </div>
        </div>

        <div className="deskBriefGrid">
          <div className="deskBriefCard">
            <span>Lane</span>
            <strong>Investment review</strong>
            <small>
              Use this lane to review collectible theses, liquidity, and ticket entries without
              leaving the workspace.
            </small>
          </div>
          <div className="deskBriefCard">
            <span>Lead category</span>
            <strong>{activeCollectible?.category || "Select an item"}</strong>
            <small>
              {activeCollectible
                ? `${activeCollectible.brand} is currently in focus for deeper review.`
                : "Choose a collectible card below to promote it into the focus panel."}
            </small>
          </div>
          <div className="deskBriefCard">
            <span>Inventory source</span>
            <strong>Collecttrade tracked</strong>
            <small>
              Pricing and thesis here are part of your tradable inventory layer, separate from
              official retail references.
            </small>
          </div>
          <div className="deskBriefCard">
            <span>Verification lane</span>
            <strong>{legoReferenceShelf?.sourceName || "Official sources"}</strong>
            <small>
              Use the source lane only when you want to verify an official product page or series
              lineup.
            </small>
          </div>
        </div>

        <div className="collectibleInventoryToolbar">
          <input
            type="text"
            value={collectibleQuery}
            onChange={(event) => setCollectibleQuery(event.target.value)}
            placeholder="Search brand, title, category, or market"
          />
          <select
            value={collectibleBrand}
            onChange={(event) => setCollectibleBrand(event.target.value)}
          >
            <option value="all">All brands</option>
            {(collectiblesResponse.brands || []).map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <select
            value={collectibleCategory}
            onChange={(event) => setCollectibleCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {(collectiblesResponse.categories || []).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="collectibleInventoryMeta">
          <div className="collectibleInventoryStat">
            <span>Filtered items</span>
            <strong>{filteredCollectibles.length}</strong>
          </div>
          <div className="collectibleInventoryStat">
            <span>Brand filter</span>
            <strong>{collectibleBrand === "all" ? "All brands" : collectibleBrand}</strong>
          </div>
          <div className="collectibleInventoryStat">
            <span>Category filter</span>
            <strong>
              {collectibleCategory === "all" ? "All categories" : collectibleCategory}
            </strong>
          </div>
          <div className="collectibleInventoryStat">
            <span>Grouped shelves</span>
            <strong>{groupedCollectibles.length}</strong>
          </div>
        </div>
      </section>

      {legoReferenceShelf ? (
        <section className="panel" id="collectibles-reference">
          <div className="panelHeader">
            <div>
              <h2>{legoReferenceShelf.title}</h2>
              <p>{legoReferenceShelf.summary}</p>
            </div>
            <div className="headerStatus">
              <span>Verification lane</span>
              <strong>{legoReferenceShelf.sourceName}</strong>
            </div>
          </div>

          <div className="deskBriefGrid">
            {(legoReferenceShelf.notes || []).map((note) => (
              <div className="deskBriefCard" key={note}>
                <span>Reference note</span>
                <strong>{legoReferenceShelf.sourceName}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>

          <div className="collectibleReferenceGrid">
            {(legoReferenceShelf.highlights || []).map((item) => (
              <article className="collectibleReferenceCard" key={item.id}>
                <div className="collectibleReferenceTop">
                  <span>{item.category}</span>
                  <strong>{item.status}</strong>
                </div>
                <h3>{item.name}</h3>
                <p>{item.note}</p>
                <div className="collectibleReferenceMeta">
                  <div>
                    <span>Age</span>
                    <strong>{item.age || "--"}</strong>
                  </div>
                  <div>
                    <span>Pieces</span>
                    <strong>{item.pieces || "--"}</strong>
                  </div>
                </div>
                <div className="panelActions">
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => openExternal(item.url || legoReferenceShelf.url)}
                  >
                    Verify Source
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="panelActions">
            <div className="collectibleSourceHint">
              Collecttrade stays the main workspace. Official LEGO ZA links are here for source verification, not as the primary route.
            </div>
            {legoReferenceShelf.aboutUrl ? (
              <button
                type="button"
                className="ghostButton"
                onClick={() => openExternal(legoReferenceShelf.aboutUrl)}
              >
                Learn How Minifigures Work
              </button>
            ) : null}
            {legoReferenceShelf.url ? (
              <button
                type="button"
                className="ghostButton"
                onClick={() => openExternal(legoReferenceShelf.url)}
              >
                Open Official LEGO ZA
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="collectibleShelfStack" id="collectibles-grid">
        {groupedCollectibles.map((group) => (
          <section className="panel collectibleShelfPanel" key={group.brand}>
            <div className="panelHeader">
              <div>
                <h2>{group.brand}</h2>
                <p>
                  Display-led sets, minifigures, and collector inventory with the official source
                  shelf available beside the trade flow.
                </p>
              </div>
              <div className="headerStatus">
                <span>Items</span>
                <strong>{group.items.length}</strong>
              </div>
            </div>

            <div className="collectibleGrid">
              {group.items.map((item) => (
                <TradeCollectibleCard
                  key={item.id}
                  item={item}
                  isActive={activeCollectible?.id === item.id}
                  onSelect={handleCollectibleSelect}
                  onTrade={openCollectibleTicket}
                />
              ))}
            </div>
          </section>
        ))}
        {!filteredCollectibles.length ? (
          <EmptyState
            title="No collectibles match that filter"
            body="Try another brand, category, or a broader search term."
          />
        ) : null}
      </section>
    </div>
  );
}

export function PortfolioScreen({
  activeDesk,
  activePageSections,
  activePortfolioTrade,
  appSettings,
  closedTrades,
  handleCloseTrade,
  handlePortfolioTradeNavigate,
  handlePortfolioTradeSelect,
  health,
  jumpToPageSection,
  openTrades,
  totalOpenPnl,
}) {
  const portfolioActions = [
    {
      id: "positions",
      label: "Open Positions",
      meta: `${openTrades.length}`,
      detail: "Focus on what is still live and carrying risk.",
      onClick: () => jumpToPageSection("portfolio", "open-positions"),
    },
    {
      id: "history",
      label: "Order History",
      meta: `${closedTrades.length}`,
      detail: "Review closes, timestamps, and exit discipline.",
      onClick: () => jumpToPageSection("portfolio", "order-history"),
    },
    {
      id: "selected",
      label: "Selected Trade",
      meta: activePortfolioTrade?.ticker || "No selection",
      detail: "Jump to the current position detail pane.",
      onClick: () => jumpToPageSection("portfolio", "position-detail"),
    },
    {
      id: "trade",
      label: "Back to Trade",
      meta: labelDesk(activeDesk),
      detail: "Return to the live desk and open another ticket.",
      onClick: () => jumpToPageSection("signals", "chart-panel", activeDesk),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="portfolio"
        eyebrow="Portfolio Book"
        title="My Portfolio"
        description="User-scoped order tracking, EMA-managed exits, and saved execution history."
        statusLabel="Last engine tick"
        statusValue={formatDateTime(health.metrics?.lastEngineTickAt, appSettings.timezone)}
        metrics={[
          {
            label: "Open positions",
            value: openTrades.length,
            detail: "Across market and collectible desks",
          },
          {
            label: "Closed trades",
            value: closedTrades.length,
            detail: "Archived with exit reason",
          },
          {
            label: "Live PnL",
            value: `${totalOpenPnl.toFixed(2)}%`,
            detail: "Open-book change",
          },
        ]}
        primaryAction={{
          label: "Open Trade Desk",
          onClick: () => jumpToPageSection("signals", "chart-panel", activeDesk),
        }}
        secondaryAction={{
          label: "Review History",
          onClick: () => jumpToPageSection("portfolio", "order-history"),
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("portfolio", sectionId)}
      />
      <WorkspaceCommandBar
        tone="portfolio"
        title="Book Shortcuts"
        hint="Move between the live book, history, and the next execution step."
        actions={portfolioActions}
      />

      <PositionDetailCard
        trade={activePortfolioTrade}
        timeZone={appSettings.timezone}
        onNavigate={handlePortfolioTradeNavigate}
        onCloseTrade={handleCloseTrade}
      />

      <section className="summaryGrid">
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("portfolio", "open-positions")}
        >
          <span>Open positions</span>
          <strong>{openTrades.length}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("portfolio", "order-history")}
        >
          <span>Closed trades</span>
          <strong>{closedTrades.length}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("portfolio", "open-positions")}
        >
          <span>Live PnL</span>
          <strong className={positiveTone(totalOpenPnl)}>{totalOpenPnl.toFixed(2)}%</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("signals", "chart-panel")}
        >
          <span>Last update</span>
          <strong>{formatDateTime(health.metrics?.lastEngineTickAt, appSettings.timezone)}</strong>
        </button>
      </section>

      <div className="splitGrid">
        <section className="panel" id="open-positions">
          <div className="panelHeader">
            <div>
              <h2>Open Positions</h2>
              <p>Open positions now carry quantity, notes, and a manual close workflow.</p>
            </div>
          </div>

          {openTrades.length ? (
            <div className="tableShell">
              <div className="tableHeaderRow positions">
                <span>Market</span>
                <span>Side</span>
                <span>Qty</span>
                <span>Entry</span>
                <span>Current</span>
                <span>PnL</span>
              </div>

              {openTrades.map((trade) => (
                <div
                  className="tableRow positions interactiveRow"
                  key={trade.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePortfolioTradeSelect(trade)}
                  onKeyDown={(event) => handleInteractiveKey(event, () => handlePortfolioTradeSelect(trade))}
                >
                  <div className="tableCellStack">
                    <strong>{trade.ticker}</strong>
                    <small>
                      {trade.assetClass === "collectible" ? trade.category : trade.setup} Â·{" "}
                      {trade.executionMode === "live"
                        ? venueDetailLabel(providerLabel(trade.executionProvider), trade.executionPair)
                        : "Paper"}
                    </small>
                  </div>
                  <span>{trade.side}</span>
                  <span>{trade.quantity}</span>
                  <span>{formatTradePrice(trade, trade.entryPrice)}</span>
                  <span>{formatTradePrice(trade, trade.currentPrice)}</span>
                  <span className={positiveTone(trade.pnl)}>{trade.pnl.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No open positions yet"
              body="Use Fast Trade from the Trade page to seed your portfolio."
            />
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Execution Rails</h2>
              <p>Operational lanes ready for local, offshore, crypto, and JSE flow.</p>
            </div>
          </div>

          <div className="railList">
            {RAILS.map((rail) => (
              <div className="railRow" key={rail}>
                <span className="railDot" />
                <strong>{rail}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" id="order-history">
        <div className="panelHeader">
          <div>
            <h2>Order History</h2>
            <p>Full timestamps in South Africa local time.</p>
          </div>
        </div>

        {closedTrades.length ? (
          <div className="tableShell">
            <div className="tableHeaderRow historyDetailed">
              <span>Market</span>
              <span>Side</span>
              <span>Qty</span>
              <span>Status</span>
              <span>Handled</span>
              <span>Exit</span>
            </div>

            {closedTrades.map((trade) => (
              <div
                className="tableRow historyDetailed interactiveRow"
                key={trade.id}
                role="button"
                tabIndex={0}
                onClick={() => handlePortfolioTradeSelect(trade)}
                onKeyDown={(event) => handleInteractiveKey(event, () => handlePortfolioTradeSelect(trade))}
              >
                <div className="tableCellStack">
                  <strong>{trade.ticker}</strong>
                  <small>
                    {trade.exitReason || trade.setup} Â·{" "}
                    {trade.executionMode === "live"
                      ? venueDetailLabel(providerLabel(trade.executionProvider), trade.executionPair)
                      : "Paper"}
                  </small>
                </div>
                <span>{trade.side}</span>
                <span>{trade.quantity}</span>
                <span>{trade.exitReason || "Closed"}</span>
                <span>{formatDateTime(trade.closedAt || trade.updatedAt, appSettings.timezone)}</span>
                <span>{formatTradePrice(trade, trade.exitPrice || trade.currentPrice)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No history yet"
            body="Closed trades will land here with their exit reason and timestamp."
          />
        )}
      </section>
    </>
  );
}

export function ReportsScreen({
  activeDesk,
  activePageSections,
  appSettings,
  closedTrades,
  health,
  jumpToPageSection,
  navigateToPage,
  openTrades,
  signalsResponse,
  totalOpenPnl,
}) {
  const allTrades = useMemo(
    () =>
      [...openTrades, ...closedTrades].sort(
        (left, right) =>
          new Date(left.closedAt || left.updatedAt || left.createdAt || 0).getTime() -
          new Date(right.closedAt || right.updatedAt || right.createdAt || 0).getTime(),
      ),
    [closedTrades, openTrades],
  );
  const allSignals = useMemo(() => signalsResponse.signals || [], [signalsResponse.signals]);
  const performancePoints = useMemo(() => buildPerformancePoints(allTrades), [allTrades]);
  const exposureItems = useMemo(
    () => buildDeskExposureItems(openTrades.length ? openTrades : allTrades),
    [allTrades, openTrades],
  );
  const signalDeskItems = useMemo(() => buildSignalDeskItems(allSignals), [allSignals]);
  const actionMixItems = useMemo(() => buildActionMixItems(allSignals), [allSignals]);
  const executionModeItems = useMemo(() => buildExecutionModeItems(allTrades), [allTrades]);
  const closedTradePnls = closedTrades.map((trade) => numberOrZero(trade.pnl));
  const winCount = closedTrades.filter((trade) => numberOrZero(trade.pnl) > 0).length;
  const winRate = closedTrades.length ? (winCount / closedTrades.length) * 100 : 0;
  const avgSignalConfidence = average(allSignals.map((signal) => signal.confidence));
  const avgSignalRsi = average(allSignals.map((signal) => signal.rsi));
  const strongestSignal =
    allSignals.slice().sort((left, right) => numberOrZero(right.confidence) - numberOrZero(left.confidence))[0] ||
    null;
  const reportActions = [
    {
      id: "performance",
      label: "Performance",
      meta: `${performancePoints.length}`,
      detail: "Review the recent cumulative book curve.",
      onClick: () => jumpToPageSection("reports", "reports-performance"),
    },
    {
      id: "exposure",
      label: "Exposure",
      meta: `${exposureItems.length}`,
      detail: "See how the book is distributed across desks.",
      onClick: () => jumpToPageSection("reports", "reports-exposure"),
    },
    {
      id: "signals",
      label: "Signal Pulse",
      meta: `${allSignals.length}`,
      detail: "Check confidence, RSI, and action mix across the desk stack.",
      onClick: () => jumpToPageSection("reports", "reports-signals"),
    },
    {
      id: "portfolio",
      label: "Open Portfolio",
      meta: `${openTrades.length}`,
      detail: "Jump back into the live book for trade-by-trade review.",
      onClick: () => navigateToPage("portfolio", false, activeDesk),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="reports"
        eyebrow="Reporting Suite"
        title="Reports"
        description="Performance curves, desk exposure, signal pressure, and execution analytics in one visual review workspace."
        statusLabel="Last engine tick"
        statusValue={formatDateTime(health.metrics?.lastEngineTickAt, appSettings.timezone)}
        metrics={[
          {
            label: "Tracked trades",
            value: allTrades.length,
            detail: "Open and closed positions",
          },
          {
            label: "Win rate",
            value: `${winRate.toFixed(0)}%`,
            detail: `${winCount} positive closes`,
          },
          {
            label: "Avg signal confidence",
            value: `${avgSignalConfidence.toFixed(1)}%`,
            detail: `${avgSignalRsi.toFixed(1)} RSI avg`,
          },
        ]}
        primaryAction={{
          label: "Open Portfolio",
          onClick: () => navigateToPage("portfolio", false, activeDesk),
        }}
        secondaryAction={{
          label: "Open Trade Desk",
          onClick: () => navigateToPage("signals", false, activeDesk),
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("reports", sectionId)}
      />
      <WorkspaceCommandBar
        tone="reports"
        title="Reporting Shortcuts"
        hint="Move between performance, exposure, signal analytics, and the live book without losing context."
        actions={reportActions}
      />

      <section className="summaryGrid" id="reports-overview">
        <div className="summaryCard">
          <span>Open book</span>
          <strong>{openTrades.length}</strong>
        </div>
        <div className="summaryCard">
          <span>Closed trades</span>
          <strong>{closedTrades.length}</strong>
        </div>
        <div className="summaryCard">
          <span>Live PnL</span>
          <strong className={positiveTone(totalOpenPnl)}>{formatSignedPercent(totalOpenPnl)}</strong>
        </div>
        <div className="summaryCard">
          <span>Strongest signal</span>
          <strong>{strongestSignal ? `${strongestSignal.action} ${strongestSignal.label}` : "Waiting"}</strong>
        </div>
      </section>

      <div className="splitGrid">
        <section className="panel" id="reports-performance">
          <div className="panelHeader">
            <div>
              <h2>Performance Curve</h2>
              <p>Cumulative trade movement from the latest book history, using the current saved portfolio state.</p>
            </div>
          </div>

          <ReportLineChart points={performancePoints} />

          <div className="reportMiniStats">
            <div className="reportMiniStat">
              <span>Best close</span>
              <strong className={positiveTone(Math.max(...closedTradePnls, 0))}>
                {closedTrades.length ? formatSignedPercent(Math.max(...closedTradePnls)) : "--"}
              </strong>
            </div>
            <div className="reportMiniStat">
              <span>Worst close</span>
              <strong className={positiveTone(Math.min(...closedTradePnls, 0))}>
                {closedTrades.length ? formatSignedPercent(Math.min(...closedTradePnls)) : "--"}
              </strong>
            </div>
            <div className="reportMiniStat">
              <span>Avg close</span>
              <strong className={positiveTone(average(closedTradePnls))}>
                {closedTrades.length ? formatSignedPercent(average(closedTradePnls)) : "--"}
              </strong>
            </div>
          </div>
        </section>

        <section className="panel" id="reports-exposure">
          <div className="panelHeader">
            <div>
              <h2>Desk Exposure</h2>
              <p>{openTrades.length ? "Open-book" : "Recent-book"} distribution across forex, ETFs, crypto, JSE, and collectibles.</p>
            </div>
          </div>

          {exposureItems.length ? (
            <ReportBarList items={exposureItems} valueFormatter={(value) => `${value} positions`} />
          ) : (
            <EmptyState
              title="No desk exposure yet"
              body="Once the book has a few positions, this panel will show how activity is distributed."
            />
          )}

          <div className="reportMiniStats">
            {executionModeItems.map((item) => (
              <div className="reportMiniStat" key={item.id}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.meta}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="splitGrid" id="reports-signals">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Signal Pressure by Desk</h2>
              <p>Average confidence by desk, with RSI context carried in the annotation line.</p>
            </div>
          </div>

          {signalDeskItems.length ? (
            <ReportBarList items={signalDeskItems} valueFormatter={(value) => `${value.toFixed(1)}%`} />
          ) : (
            <EmptyState
              title="No signal analytics yet"
              body="When signals are flowing again, this panel will show confidence and RSI pressure by desk."
            />
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Signal Mix</h2>
              <p>Quick read on whether the current stack is leaning buy, sell, or hold.</p>
            </div>
          </div>

          {actionMixItems.length ? (
            <ReportBarList items={actionMixItems} valueFormatter={(value) => `${value} setups`} />
          ) : (
            <EmptyState
              title="No signal mix yet"
              body="This panel will fill in as soon as the desk emits active setups."
            />
          )}

          <div className="reportMiniStats">
            <div className="reportMiniStat">
              <span>Feed mode</span>
              <strong>{marketModeLabel(signalsResponse.marketData?.mode)}</strong>
              <small>{signalsResponse.marketData?.provider || "Simulator"}</small>
            </div>
            <div className="reportMiniStat">
              <span>Lead signal</span>
              <strong>{signalsResponse.leadSignal?.label || "Waiting"}</strong>
              <small>{signalsResponse.leadSignal?.setup || "No setup selected yet."}</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export function ConnectionsScreen({
  activeDesk,
  activePageSections,
  appSettings,
  connectedProviderCount,
  connectorBusyKey,
  connectors,
  cryptoConnector,
  degradedSourceCount,
  disconnectConnector,
  handleValrFieldChange,
  health,
  jumpToPageSection,
  liveReadyDeskCount,
  newsResponse,
  refreshContext,
  refreshCore,
  saveValrConnector,
  settingsStatus,
  signalsResponse,
  syncConnectorBalances,
  testConnectorConnection,
  updateExecutionProfile,
  valrForm,
}) {
  const connectionActions = [
    {
      id: "brokers",
      label: "Broker Connections",
      meta: `${connectedProviderCount}`,
      detail: "Open credentials, tests, and live account sync controls.",
      onClick: () => jumpToPageSection("connections", "broker-connections", activeDesk),
    },
    {
      id: "feed",
      label: "Market Feed",
      meta: signalsResponse.marketData?.provider || "Simulator",
      detail: "Check candle source health and live data status.",
      onClick: () => jumpToPageSection("connections", "market-feed-status", activeDesk),
    },
    {
      id: "refresh",
      label: "Refresh Health",
      meta: `${degradedSourceCount} issues`,
      detail: "Pull source state and service health again.",
      onClick: () => {
        refreshCore();
        refreshContext();
      },
    },
    {
      id: "partner",
      label: "Partner Testing",
      meta: "Share lane",
      detail: "Jump to the share status and feedback handoff flow.",
      onClick: () => jumpToPageSection("settings", "partner-testing"),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="connections"
        eyebrow="Platform Routing"
        title="Connections"
        description="Broker routing, execution modes, market feed health, and live readiness in one operational screen."
        statusLabel="Market feed"
        statusValue={marketModeLabel(signalsResponse.marketData?.mode)}
        metrics={[
          {
            label: "Providers",
            value: connectedProviderCount,
            detail: "Configured connectors",
          },
          {
            label: "Live-ready desks",
            value: liveReadyDeskCount,
            detail: "Safe to route live",
          },
          {
            label: "Feed issues",
            value: degradedSourceCount,
            detail: "Sources needing attention",
          },
        ]}
        primaryAction={{
          label: "Review Brokers",
          onClick: () => jumpToPageSection("connections", "broker-connections", activeDesk),
        }}
        secondaryAction={{
          label: "Refresh Health",
          onClick: () => {
            refreshCore();
            refreshContext();
          },
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("connections", sectionId, activeDesk)}
      />
      <WorkspaceCommandBar
        tone="connections"
        title="Routing Shortcuts"
        hint="Stay close to feeds, brokers, and the partner handoff from one operational screen."
        actions={connectionActions}
      />

      {settingsStatus ? <div className="statusBanner">{settingsStatus}</div> : null}

      <section className="summaryGrid">
        <div className="summaryCard">
          <span>Configured providers</span>
          <strong>{connectedProviderCount}</strong>
        </div>
        <div className="summaryCard">
          <span>Live-ready desks</span>
          <strong>{liveReadyDeskCount}</strong>
        </div>
        <div className="summaryCard">
          <span>Feed issues</span>
          <strong>{degradedSourceCount}</strong>
        </div>
        <div className="summaryCard">
          <span>Candle provider</span>
          <strong>{signalsResponse.marketData?.provider || "Simulator"}</strong>
        </div>
      </section>

      <section className="panel" id="connections-overview">
        <div className="panelHeader">
          <div>
            <h2>Execution Modes</h2>
            <p>
              Keep every desk in paper mode by default. Crypto can route live through VALR once the
              connector is configured.
            </p>
          </div>
        </div>

        <div className="executionModeList">
          {MARKET_DESKS.map((desk) => {
            const profile =
              appSettings.executionProfiles?.[desk.id] ||
              DEFAULT_EXECUTION_PROFILES[desk.id];
            const liveCapable = desk.id === "crypto";
            const connectorStatus = liveCapable
              ? cryptoConnector?.status || "not_configured"
              : profile.providerId === "ibkr"
                ? "manual_setup"
                : profile.providerId === "saxo"
                  ? "manual_setup"
                  : "unsupported";

            return (
              <div className="executionModeRow" key={desk.id}>
                <div className="executionModeSummary">
                  <span className="connectorDesk">{desk.label}</span>
                  <strong>{providerLabel(profile.providerId)}</strong>
                  <small>
                    {liveCapable
                      ? profile.mode === "live"
                        ? `Live routing enabled through ${providerLabel(profile.providerId)} on ${
                            cryptoConnector?.config?.preferredPair || profile.pair
                          }.`
                        : "Paper mode keeps crypto orders inside Collecttrade until you deliberately switch."
                      : "This desk is still paper-first until its provider OAuth or gateway flow is completed."}
                  </small>
                </div>

                <div className="executionModeControls">
                  <div className="segmentedControl">
                    <button
                      type="button"
                      className={profile.mode === "paper" ? "active" : ""}
                      onClick={() => updateExecutionProfile(desk.id, { mode: "paper" })}
                    >
                      Paper
                    </button>
                    <button
                      type="button"
                      className={profile.mode === "live" ? "active" : ""}
                      onClick={() => updateExecutionProfile(desk.id, { mode: "live" })}
                      disabled={!liveCapable}
                    >
                      {liveCapable ? "Live" : "Planned"}
                    </button>
                  </div>

                  <div className={`connectorStatus ${statusTone(connectorStatus)}`}>
                    {humanizeStatus(connectorStatus)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {appSettings.executionProfiles?.crypto?.mode === "live" && !cryptoConnector?.configured ? (
          <div className="statusBanner warningBanner">
            <strong>Crypto live mode is armed, but VALR is not ready yet.</strong>
            <span>Save and test your VALR credentials below before sending a live BTC order.</span>
          </div>
        ) : null}
      </section>

      <section className="panel" id="broker-connections">
        <div className="panelHeader">
          <div>
            <h2>Broker and Venue Connections</h2>
            <p>Save credentials, test access, and sync live account state where the provider supports it.</p>
          </div>
        </div>

        <div className="connectorList">
          {connectors.map((provider) => (
            <ConnectorCard
              key={provider.id}
              provider={provider}
              timeZone={appSettings.timezone}
              valrForm={valrForm}
              busyKey={connectorBusyKey}
              onValrFieldChange={handleValrFieldChange}
              onSaveValr={saveValrConnector}
              onTest={testConnectorConnection}
              onSync={syncConnectorBalances}
              onDisconnect={disconnectConnector}
            />
          ))}
        </div>
      </section>

      <div className="splitGrid">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>System Health</h2>
              <p>Useful when you are checking if the desk is ready for a live session.</p>
            </div>
          </div>

          <div className="healthList">
            {Object.entries(health.services || {}).map(([service, status]) => (
              <div className="healthRow" key={service}>
                <span>{service}</span>
                <strong className={statusTone(status)}>{status}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" id="market-feed-status">
          <div className="panelHeader">
            <div>
              <h2>Market Feed Status</h2>
              <p>
                Twelve Data powers live candles when a key is configured. The simulator stays available as a
                fallback.
              </p>
            </div>
          </div>

          {signalsResponse.marketData?.mode === "simulated" ? (
            <div className="statusBanner">
              Add `TWELVE_DATA_API_KEY` in the server environment and restart the API to switch these markets
              from simulator candles to live provider data.
            </div>
          ) : null}

          <div className="tableShell">
            <div className="tableHeaderRow history">
              <span>Market</span>
              <span>Provider</span>
              <span>Status</span>
              <span>Points</span>
              <span>Detail</span>
            </div>

            {(signalsResponse.marketData?.sourceStatus || health.marketSources || []).map((source) => (
              <div className="tableRow history" key={source.ticker}>
                <span>{source.label}</span>
                <span>{source.provider}</span>
                <span className={statusTone(source.status)}>{source.status}</span>
                <span>{source.points ?? 0}</span>
                <span>{source.detail || "Healthy"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" id="strategy-state">
        <div className="panelHeader">
          <div>
            <h2>Source Status</h2>
            <p>Feed-level visibility so you can see what is loading and what is degraded.</p>
          </div>
        </div>

        <div className="tableShell">
          <div className="tableHeaderRow history">
            <span>Source</span>
            <span>Region</span>
            <span>Status</span>
            <span>Items</span>
            <span>Detail</span>
          </div>

          {(newsResponse.sourceStatus || health.sources || []).map((source) => (
            <div className="tableRow history" key={source.id}>
              <span>{source.name}</span>
              <span>{labelRegion(source.region)}</span>
              <span className={statusTone(source.status)}>{source.status}</span>
              <span>{source.items ?? 0}</span>
              <span>{source.detail || "Healthy"}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function SettingsScreen({
  activeDesk,
  activePageSections,
  addTarget,
  appSettings,
  connectedProviderCount,
  currentUser,
  feedbackBusyKey,
  feedbackForm,
  feedbackResponse,
  feedbackStatus,
  jumpToPageSection,
  liveReadyDeskCount,
  navigateToPage,
  setFeedbackForm,
  settingsStatus,
  shareStatus,
  setTargetInput,
  submitFeedback,
  targetInput,
  targets,
  updateFeedbackStatus,
  updateSettings,
}) {
  const feedbackItems = useMemo(() => feedbackResponse.items || [], [feedbackResponse.items]);
  const feedbackSummary = feedbackResponse.summary || {};
  const canManageFeedback = currentUser.role === "owner";
  const shareIsLive = shareStatus?.status === "live" && shareStatus?.publicUrl;
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("open");
  const [feedbackAreaFilter, setFeedbackAreaFilter] = useState("all");
  const openPartnerStep = (step) => {
    jumpToPageSection(step.page, step.sectionId, step.desk || activeDesk);
  };
  const feedbackAreaOptions = useMemo(
    () => ["all", ...new Set(feedbackItems.map((item) => item.area).filter(Boolean))],
    [feedbackItems],
  );
  const filteredFeedbackItems = useMemo(() => {
    return feedbackItems.filter((item) => {
      const matchesStatus =
        feedbackStatusFilter === "all"
          ? true
          : feedbackStatusFilter === "open"
            ? item.status !== "resolved"
            : item.status === feedbackStatusFilter;
      const matchesArea = feedbackAreaFilter === "all" ? true : item.area === feedbackAreaFilter;
      return matchesStatus && matchesArea;
    });
  }, [feedbackAreaFilter, feedbackItems, feedbackStatusFilter]);
  const partnerInviteMessage = [
    "Collecttrade partner test pass",
    "",
    `Access: ${shareIsLive ? shareStatus.publicUrl : shareStatus?.localUrl || "http://127.0.0.1:5000"}`,
    "",
    "Suggested pass:",
    ...PARTNER_TEST_FLOW.map((step) => `${step.ordinal}. ${step.title} - ${step.detail}`),
    "",
    "Please leave feedback inside the app under Settings -> Feedback Board.",
  ].join("\n");
  const copyPartnerInvite = async () => {
    if (!navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(partnerInviteMessage);
    } catch {
      // Ignore clipboard errors; the invite text still renders on screen.
    }
  };
  const settingsActions = [
    {
      id: "partner",
      label: "Partner Testing",
      meta: shareIsLive ? "Live" : "Private",
      detail: "Open the tester brief, share state, and partner checklist.",
      onClick: () => jumpToPageSection("settings", "partner-testing"),
    },
    {
      id: "feedback",
      label: "Feedback Board",
      meta: `${feedbackSummary.open || 0} open`,
      detail: "Review structured tester notes and triage them in the app.",
      onClick: () => jumpToPageSection("settings", "feedback-board"),
    },
    {
      id: "targets",
      label: "Saved Targets",
      meta: `${targets.length}`,
      detail: "Jump to the saved targets and monitoring preferences.",
      onClick: () => jumpToPageSection("settings", "saved-targets"),
    },
    {
      id: "connections",
      label: "Connections",
      meta: `${connectedProviderCount} linked`,
      detail: "Move into feeds and brokers when account setup needs attention.",
      onClick: () => navigateToPage("connections", false, activeDesk),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="settings"
        eyebrow="Workspace Setup"
        title="Settings"
        description="Account details, regional preferences, and saved desk targets for your daily workflow."
        statusLabel="Signed in"
        statusValue={currentUser.email}
        metrics={[
          {
            label: "Region",
            value: labelRegion(appSettings.preferredRegion),
            detail: appSettings.timezone,
          },
          {
            label: "Risk mode",
            value: appSettings.riskMode,
            detail: "Desk-wide default",
          },
          {
            label: "Partner board",
            value: feedbackSummary.total || 0,
            detail: canManageFeedback ? "Owner triage enabled" : "Shared testing lane",
          },
        ]}
        primaryAction={{
          label: "Open Connections",
          onClick: () => navigateToPage("connections", false, activeDesk),
        }}
        secondaryAction={{
          label: "Open News",
          onClick: () => jumpToPageSection("news", "macro-feed", activeDesk),
        }}
      />
      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("settings", sectionId, activeDesk)}
      />
      <WorkspaceCommandBar
        tone="settings"
        title="Workspace Shortcuts"
        hint="Keep account setup, partner feedback, and targets close at hand."
        actions={settingsActions}
      />

      {settingsStatus ? <div className="statusBanner">{settingsStatus}</div> : null}

      <div className="splitGrid">
        <section className="panel" id="account-settings">
          <div className="panelHeader">
            <div>
              <h2>Account</h2>
              <p>Signed in as {currentUser.email}</p>
            </div>
          </div>

          <div className="profileBlock">
            <div>
              <span>Name</span>
              <strong>{currentUser.name}</strong>
            </div>
            <div>
              <span>Last login</span>
              <strong>{formatDateTime(currentUser.lastLoginAt, appSettings.timezone)}</strong>
            </div>
            <div>
              <span>Timezone</span>
              <strong>{appSettings.timezone}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{canManageFeedback ? "Owner" : "Partner tester"}</strong>
            </div>
          </div>
        </section>

        <section className="panel" id="news-region">
          <div className="panelHeader">
            <div>
              <h2>News Region</h2>
              <p>Keep your dashboard focused on South Africa, global flow, or both.</p>
            </div>
          </div>

          <div className="segmentedControl">
            {["south-africa", "global", "all"].map((region) => (
              <button
                type="button"
                key={region}
                className={appSettings.preferredRegion === region ? "active" : ""}
                onClick={() => updateSettings({ preferredRegion: region })}
              >
                {labelRegion(region)}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" id="source-status">
        <div className="panelHeader">
          <div>
            <h2>Workspace Preferences</h2>
            <p>Keep your daily flow anchored to the right region, risk posture, and follow-up loop.</p>
          </div>
        </div>

        <div className="summaryGrid">
          <div className="summaryCard">
            <span>Preferred region</span>
            <strong>{labelRegion(appSettings.preferredRegion)}</strong>
          </div>
          <div className="summaryCard">
            <span>Risk mode</span>
            <strong>{appSettings.riskMode}</strong>
          </div>
          <div className="summaryCard">
            <span>Saved targets</span>
            <strong>{targets.length}</strong>
          </div>
          <button
            type="button"
            className="summaryCard summaryCardButton"
            onClick={() => navigateToPage("connections", false, activeDesk)}
          >
            <span>Connections</span>
            <strong>{connectedProviderCount} configured</strong>
          </button>
        </div>
      </section>

      <section className="panel" id="partner-testing">
        <div className="panelHeader">
          <div>
            <h2>Partner Testing</h2>
            <p>When your partners get access, this becomes the shared place to log, review, and close feedback.</p>
          </div>
        </div>

        <div className="summaryGrid">
          <div className="summaryCard">
            <span>Board items</span>
            <strong>{feedbackSummary.total || 0}</strong>
          </div>
          <div className="summaryCard">
            <span>Open items</span>
            <strong>{feedbackSummary.open || 0}</strong>
          </div>
          <div className="summaryCard">
            <span>High priority</span>
            <strong>{feedbackSummary.highSeverity || 0}</strong>
          </div>
          <button
            type="button"
            className="summaryCard summaryCardButton"
            onClick={() => navigateToPage("connections", false, activeDesk)}
          >
            <span>Live-ready desks</span>
            <strong>{liveReadyDeskCount}</strong>
          </button>
        </div>

        <div className="partnerTestingGrid">
          <div className="partnerTestingCard">
            <span>Partner access</span>
            <strong>{shareIsLive ? "Public share link is live" : "Local-only right now"}</strong>
            <small>
              {shareIsLive
                ? `Partners can use ${shareStatus.publicUrl} while the share helper stays open.`
                : "Run npm run partner:share after staging is live to open a temporary public link."}
            </small>
            <div className="panelActions">
              {shareIsLive ? (
                <>
                  <button
                    type="button"
                    className="primaryButton"
                    onClick={() => openExternal(shareStatus.publicUrl)}
                  >
                    Open Share Link
                  </button>
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => {
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(shareStatus.publicUrl);
                      }
                    }}
                  >
                    Copy Link
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => navigateToPage("connections", false, activeDesk)}
                  >
                    Review Readiness
                  </button>
                  <button type="button" className="ghostButton" onClick={copyPartnerInvite}>
                    Copy Test Brief
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="partnerTestingCard">
            <span>Suggested partner pass</span>
            <strong>Landing - News - Trade - Collectibles - Feedback</strong>
            <small>
              That route covers the front door, tape, execution flow, alternative-assets lane, and the
              final feedback handoff.
            </small>
          </div>
          <div className="partnerTestingCard">
            <span>Feedback path</span>
            <strong>Settings - Feedback Board</strong>
            <small>Ask partners to leave structured notes here instead of scattering feedback across WhatsApp.</small>
          </div>
          <div className="partnerTestingCard">
            <span>Shareable test brief</span>
            <strong>Copy a ready-to-send partner pass</strong>
            <small>
              Send one message with the current access link, suggested route, and the in-app feedback handoff.
            </small>
            <div className="panelActions">
              <button type="button" className="ghostButton" onClick={copyPartnerInvite}>
                Copy Test Brief
              </button>
            </div>
          </div>
          <div className="partnerTestingCard">
            <span>Owner controls</span>
            <strong>{canManageFeedback ? "Enabled on this account" : "Managed by owner account"}</strong>
            <small>
              {canManageFeedback
                ? "You can move items through New, Reviewing, Planned, and Resolved."
                : "Your notes land on the shared board. The owner account can then triage them."}
            </small>
          </div>
        </div>

        <div className="partnerChecklist">
          {PARTNER_TEST_FLOW.map((step) => (
            <div className="partnerChecklistItem" key={step.id}>
              <div className="partnerChecklistTop">
                <div className="partnerChecklistOrdinal">{step.ordinal}</div>
                <div className="partnerChecklistCopy">
                  <span>{step.title}</span>
                  <strong>{step.detail}</strong>
                </div>
              </div>
              <button
                type="button"
                className="ghostButton"
                onClick={() => openPartnerStep(step)}
              >
                Open {step.title}
              </button>
            </div>
          ))}
        </div>

        <div className="partnerInviteBlock">
          <span>Partner invite preview</span>
          <strong>Use this when you hand the app to partners</strong>
          <pre>{partnerInviteMessage}</pre>
        </div>

        <div className="summaryGrid partnerAccessMeta">
          <div className="summaryCard">
            <span>Local staging</span>
            <strong>{shareStatus?.localUrl || "http://127.0.0.1:5000"}</strong>
          </div>
          <div className="summaryCard">
            <span>Share provider</span>
            <strong>{shareStatus?.provider || "Not running"}</strong>
          </div>
          <div className="summaryCard">
            <span>Last heartbeat</span>
            <strong>{formatDateTime(shareStatus?.lastHeartbeatAt || shareStatus?.startedAt, appSettings.timezone)}</strong>
          </div>
          <div className="summaryCard">
            <span>Notes</span>
            <strong>{shareStatus?.notes || "No share session yet"}</strong>
          </div>
        </div>
      </section>

      <section className="panel" id="feedback-board">
        <div className="panelHeader">
          <div>
            <h2>Feedback Board</h2>
            <p>Structured partner notes with shared visibility, so we keep the test cycle tidy.</p>
          </div>
        </div>

        {feedbackStatus ? <div className="statusBanner subtleBanner">{feedbackStatus}</div> : null}

        <div className="feedbackToolbar">
          <div className="segmentedControl">
            <button
              type="button"
              className={feedbackStatusFilter === "open" ? "active" : ""}
              onClick={() => setFeedbackStatusFilter("open")}
            >
              Open
            </button>
            <button
              type="button"
              className={feedbackStatusFilter === "all" ? "active" : ""}
              onClick={() => setFeedbackStatusFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={feedbackStatusFilter === "resolved" ? "active" : ""}
              onClick={() => setFeedbackStatusFilter("resolved")}
            >
              Resolved
            </button>
          </div>

          <div className="feedbackToolbarAside">
            <select
              value={feedbackAreaFilter}
              onChange={(event) => setFeedbackAreaFilter(event.target.value)}
            >
              {feedbackAreaOptions.map((area) => (
                <option key={area} value={area}>
                  {area === "all" ? "All areas" : humanizeStatus(area)}
                </option>
              ))}
            </select>
            <div className="feedbackToolbarCount">
              <span>Visible items</span>
              <strong>{filteredFeedbackItems.length}</strong>
            </div>
          </div>
        </div>

        <div className="feedbackLayout">
          <div className="feedbackComposerCard">
            <div className="feedbackFormGrid">
              <input
                type="text"
                value={feedbackForm.title}
                onChange={(event) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Short title for the issue or idea"
              />
              <select
                value={feedbackForm.area}
                onChange={(event) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    area: event.target.value,
                  }))
                }
              >
                <option value="landing">Landing / Login</option>
                <option value="news">News</option>
                <option value="trade">Trade</option>
                <option value="collectibles">Collectibles</option>
                <option value="portfolio">Portfolio</option>
                <option value="tools">Tools</option>
                <option value="connections">Connections</option>
                <option value="settings">Settings</option>
              </select>
              <select
                value={feedbackForm.type}
                onChange={(event) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option value="bug">Bug</option>
                <option value="ux">UX</option>
                <option value="improvement">Improvement</option>
                <option value="content">Content</option>
              </select>
              <select
                value={feedbackForm.severity}
                onChange={(event) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    severity: event.target.value,
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <textarea
              value={feedbackForm.notes}
              onChange={(event) =>
                setFeedbackForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="What happened, what you expected, and any route or desk context that helps reproduce it."
            />

            <div className="panelActions">
              <button
                type="button"
                className="primaryButton"
                disabled={feedbackBusyKey === "submit"}
                onClick={submitFeedback}
              >
                {feedbackBusyKey === "submit" ? "Saving..." : "Send Feedback"}
              </button>
            </div>

            <small className="feedbackHint">
              This board is visible to signed-in partners. Keep titles short and the notes specific enough to reproduce.
            </small>
          </div>

          <div className="feedbackBoard">
            {filteredFeedbackItems.map((item) => (
              <article className="feedbackItemCard" key={item.id}>
                <div className="feedbackItemTop">
                  <div>
                    <span className="collectibleCategory">
                      {item.area} | {item.type}
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className="feedbackBadgeStack">
                    <span className={`feedbackSeverityBadge feedbackSeverity-${item.severity}`}>
                      {humanizeStatus(item.severity)}
                    </span>
                    <span className={`signalBadge ${statusTone(item.status)}`}>
                      {humanizeStatus(item.status)}
                    </span>
                  </div>
                </div>

                <p>{item.notes}</p>

                <div className="feedbackMetaRow">
                  <span>{item.authorName || item.authorEmail || "Collecttrade partner"}</span>
                  <span>{formatDateTime(item.updatedAt || item.createdAt, appSettings.timezone)}</span>
                </div>

                {canManageFeedback ? (
                  <div className="feedbackManageRow">
                    <span>Owner status</span>
                    <select
                      value={item.status}
                      disabled={feedbackBusyKey === `${item.id}:new` || feedbackBusyKey === `${item.id}:reviewing` || feedbackBusyKey === `${item.id}:planned` || feedbackBusyKey === `${item.id}:resolved`}
                      onChange={(event) => updateFeedbackStatus(item.id, event.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="planned">Planned</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                ) : null}
              </article>
            ))}

            {!filteredFeedbackItems.length ? (
              <EmptyState
                title={feedbackItems.length ? "No feedback matches this view" : "No partner feedback yet"}
                body={
                  feedbackItems.length
                    ? "Try a broader filter to see the rest of the feedback board."
                    : "Once your partners start testing, their notes will land here in one shared board."
                }
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel" id="web-targets">
        <div className="panelHeader">
          <div>
            <h2>Web Targets</h2>
            <p>Saved topics for your research loop and scanning agent.</p>
          </div>
        </div>

        <div className="targetComposer">
          <input
            type="text"
            value={targetInput}
            onChange={(event) => setTargetInput(event.target.value)}
            placeholder="Add a desk target"
          />
          <button type="button" className="primaryButton" onClick={addTarget}>
            Add
          </button>
        </div>

        <div className="targetList">
          {targets.map((target) => (
            <div className="targetChip" key={target}>
              {target}
            </div>
          ))}
          {!targets.length ? (
            <EmptyState
              title="No saved targets yet"
              body="Add recurring research topics, macro themes, or desk-specific prompts here."
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
