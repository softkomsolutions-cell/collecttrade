import { useMemo, useState } from "react";
import { formatCollectiblePrice, positiveTone } from "../appUtils";
import {
  COUNTDOWN_URGENCY_BUCKETS,
  RETIREMENT_DEMO_SOURCE,
  RETIREMENT_HEATMAP_BUCKETS,
  buildRetirementInsight,
  buildRetirementSummaryKpis,
  buildRetirementWatchlist,
  countdownUrgencyFor,
  groupWatchlistByBucket,
  monthsUntilRetirement,
  opportunityRankLabel,
  portfolioActionFor,
  portfolioStatusTone,
  scoreHeatTone,
  strongBuyBeforeRetirement,
  topOpportunities,
} from "../retirementIntelligenceData";
import { EmptyState } from "./appShell";
import { handleInteractiveKey } from "../appUtils";
import { MarketDataMeta } from "./marketDataMeta";

const TABLE_COLUMNS = [
  { key: "setNumber", label: "Set #" },
  { key: "name", label: "Set" },
  { key: "theme", label: "Theme" },
  { key: "brickAlphaScore", label: "Score" },
  { key: "investmentGrade", label: "Grade" },
  { key: "retirementProbability", label: "Ret. Prob." },
  { key: "expectedRetirementDate", label: "Ret. Date" },
  { key: "monthsToRetirement", label: "Months" },
  { key: "currentMarketValue", label: "Price" },
  { key: "expected12MonthRoi", label: "12M ROI" },
  { key: "recommendation", label: "Rec." },
  { key: "opportunityRank", label: "Rank" },
  { key: "portfolioStatus", label: "Portfolio" },
];

function formatScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}` : "--";
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

function formatCountdown(item) {
  const months = monthsUntilRetirement(item);
  if (months === null) {
    return "Timeline unknown";
  }
  if (months < 0) {
    return "Retirement overdue";
  }
  const rounded = Math.max(0, Math.round(months));
  if (rounded <= 1) {
    return "Retires ~now";
  }
  if (rounded < 12) {
    return `Retires in ${rounded} mo`;
  }
  return `Retires in ${Math.round(rounded / 12)} yr`;
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

function CountdownUrgencyBadge({ item }) {
  const urgency = countdownUrgencyFor(item);
  return (
    <span className={`riCountdown riCountdown-${urgency.tone}`} title={`${urgency.months ?? "?"} months to retirement`}>
      <span className="riCountdownEmoji" aria-hidden="true">
        {urgency.emoji}
      </span>
      <span>{urgency.label}</span>
      {urgency.months !== null ? <strong>{urgency.months} mo</strong> : null}
    </span>
  );
}

function PortfolioOverlapPill({ item }) {
  if (!item.portfolioStatus) {
    return null;
  }
  const prefix = item.portfolioStatus === "Owned" ? "✓ " : "";
  return (
    <span className={`riPortfolioPill riPortfolioPill-${portfolioStatusTone(item.portfolioStatus)}`}>
      {prefix}
      {item.portfolioStatus}
    </span>
  );
}

function OpportunityScanMetrics({ item, compact = false }) {
  const urgency = countdownUrgencyFor(item);
  return (
    <div className={`riOpportunityMetrics${compact ? " riOpportunityMetrics-compact" : ""}`} aria-label="Opportunity score summary">
      <div className="riOpportunityMetric">
        <span>{compact ? "Brick Alpha" : "Brick Alpha Score"}</span>
        <strong className={`riScorePill riScorePill-${scoreHeatTone(item.brickAlphaScore)}`}>
          {formatScore(item.brickAlphaScore)}
        </strong>
      </div>
      <div className="riOpportunityMetric">
        <span>{compact ? "Exp. ROI" : "Expected ROI"}</span>
        <strong className={positiveTone(item.expected12MonthRoi)}>{formatPercent(item.expected12MonthRoi)}</strong>
      </div>
      <div className="riOpportunityMetric">
        <span>{compact ? "Months" : "Months to Retirement"}</span>
        <strong>{urgency.months !== null ? urgency.months : "--"}</strong>
      </div>
      <div className="riOpportunityMetric">
        <span>{compact ? "Rec." : "Recommendation"}</span>
        <strong>
          <span className={`signalBadge ${recommendationTone(item.recommendation)}`}>{item.recommendation}</span>
        </strong>
      </div>
    </div>
  );
}

function compareRows(left, right, key, direction) {
  const multiplier = direction === "asc" ? 1 : -1;
  let leftValue = left[key];
  let rightValue = right[key];

  if (key === "monthsToRetirement") {
    leftValue = monthsUntilRetirement(left);
    rightValue = monthsUntilRetirement(right);
  }

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue || "").localeCompare(String(rightValue || "")) * multiplier;
}

function SetImageTile({ item, compact = false }) {
  return (
    <div
      className={`riSetImage riSetImage-${item.themeAccent || "other"}${compact ? " riSetImage-compact" : ""}`}
      aria-hidden="true"
    >
      <span className="riSetImageMark">LEGO</span>
      <strong>#{item.setNumber}</strong>
    </div>
  );
}

function RetirementTimeline({ selectedItem }) {
  const months = selectedItem ? monthsUntilRetirement(selectedItem) : null;
  const marker =
    months === null
      ? null
      : months < 0
        ? "retired"
        : months <= 3
          ? "3"
          : months <= 6
            ? "6"
            : months <= 12
              ? "12"
              : "later";

  const steps = [
    { id: "now", label: "Now" },
    { id: "3", label: "3 Months" },
    { id: "6", label: "6 Months" },
    { id: "12", label: "12 Months" },
    { id: "retired", label: "Retired" },
  ];

  return (
    <div className="riTimeline" aria-label="Retirement timeline">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`riTimelineStep${
            marker === step.id ? " riTimelineStep-active" : ""
          }`}
        >
          <span className="riTimelineDot" aria-hidden="true" />
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  );
}

export function RetirementIntelligenceWorkspace({
  brickAlphaPortfolio,
  collectibles,
  handleCollectibleSelect,
  jumpToPageSection,
  openCollectibleTicket,
  openTrades,
}) {
  const [sortKey, setSortKey] = useState("opportunityScore");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedId, setSelectedId] = useState(null);

  const watchlist = useMemo(
    () => buildRetirementWatchlist(collectibles, openTrades),
    [collectibles, openTrades],
  );

  const bucketGroups = useMemo(() => groupWatchlistByBucket(watchlist), [watchlist]);
  const topOpportunity = watchlist[0] || null;
  const selectedItem =
    watchlist.find((item) => item.id === selectedId) || topOpportunity;
  const insight = useMemo(() => buildRetirementInsight(selectedItem), [selectedItem]);
  const kpis = useMemo(
    () =>
      buildRetirementSummaryKpis(
        watchlist,
        openTrades,
        brickAlphaPortfolio?.netAssetValue || 0,
      ),
    [brickAlphaPortfolio?.netAssetValue, openTrades, watchlist],
  );
  const strongBuys = useMemo(() => strongBuyBeforeRetirement(watchlist), [watchlist]);
  const rankedOpportunities = useMemo(() => topOpportunities(watchlist, 3), [watchlist]);
  const demoCount = watchlist.filter((item) => item.dataSource === RETIREMENT_DEMO_SOURCE).length;
  const sortedRows = useMemo(() => {
    const rows = [...watchlist];
    rows.sort((left, right) => compareRows(left, right, sortKey, sortDirection));
    return rows;
  }, [sortDirection, sortKey, watchlist]);

  const heatmapColumns = useMemo(
    () =>
      RETIREMENT_HEATMAP_BUCKETS.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        urgency: COUNTDOWN_URGENCY_BUCKETS[bucket.id],
        items: bucketGroups[bucket.id] || [],
      })),
    [bucketGroups],
  );

  const portfolioImpactSummary = useMemo(() => {
    const owned = watchlist.filter((item) => Boolean(item.ownedTrade)).length;
    const missing = watchlist.length - owned;
    const buyMore = watchlist.filter((item) => item.portfolioStatus === "Consider Buying More").length;
    const targetReached = watchlist.filter((item) => item.portfolioStatus === "Target Allocation Reached").length;
    const watchOnly = watchlist.filter((item) => item.portfolioStatus === "Watch Only").length;
    const reduce = watchlist.filter((item) => item.portfolioStatus === "Sell").length;
    return { owned, missing, buyMore, targetReached, watchOnly, reduce };
  }, [watchlist]);

  const managerBrief = useMemo(() => {
    if (!watchlist.length) {
      return [];
    }
    const withinThree = watchlist.filter((item) => {
      const months = monthsUntilRetirement(item);
      return months !== null && months >= 0 && months <= 3;
    });
    const strongBuysInWindow = withinThree.filter(
      (item) => item.recommendation === "Strong Buy" || item.recommendation === "Buy",
    ).length;
    const topTheme = watchlist[0]?.theme;
    return [
      withinThree.length
        ? `The next three months contain ${strongBuysInWindow || "your highest-conviction"} buying window.`
        : "Your highest-conviction window sits beyond the next quarter—watch the heatmap for momentum shifts.",
      topTheme ? `Increase ${topTheme} exposure before retirement timelines compress.` : "Increase theme exposure before retirement timelines compress.",
      "Trim fully-valued positions once retirement probability crosses the next threshold.",
    ].slice(0, 3);
  }, [watchlist]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "theme" || key === "investmentGrade" ? "asc" : "desc");
  }

  function handleRowSelect(item) {
    setSelectedId(item.id);
    handleCollectibleSelect?.(item);
  }

  function handleAnalyze(item) {
    handleRowSelect(item);
    jumpToPageSection?.("collectibles", "investment-analysis");
  }

  return (
    <section className="riWorkspace" id="retirement-intelligence">
      <header className="riHeader">
        <div>
          <span className="executiveDashboardEyebrow">Premium Intelligence</span>
          <h2>Retirement Intelligence</h2>
          <p>
            What should you buy before retirement? Heatmap timing, conviction scores, and portfolio-aware guidance.
          </p>
        </div>
        {demoCount > 0 ? (
          <div className="riDemoBadge" title="Demo retirement timelines">
            <span>Demo Data</span>
            <strong>
              {demoCount} demo · {watchlist.length - demoCount} catalog
            </strong>
          </div>
        ) : null}
      </header>

      <section className="riHero" aria-label="Executive retirement summary">
        <div className="riHeroTop">
          <div className="riKpiStrip riKpiStrip-hero" aria-label="Retirement summary metrics">
            <article className="riKpiCard riKpiCard-primary">
              <span>Sets Retiring</span>
              <strong>{kpis.setsRetiringThisQuarter}</strong>
              <small>Within 0–3 month window</small>
            </article>
            <article className="riKpiCard">
              <span>Strong Buy Opportunities</span>
              <strong>{strongBuys.length}</strong>
              <small>Before retirement</small>
            </article>
            <article className="riKpiCard">
              <span>Average Brick Alpha Score</span>
              <strong>{formatScore(kpis.averageBrickAlphaScore)}</strong>
              <small>Across watchlist</small>
            </article>
            <article className="riKpiCard">
              <span>Expected ROI</span>
              <strong className={positiveTone(kpis.averageExpectedRoi)}>
                {formatPercent(kpis.averageExpectedRoi)}
              </strong>
              <small>12-month forecast</small>
            </article>
            <article className="riKpiCard">
              <span>Portfolio Exposure</span>
              <strong>{kpis.portfolioExposure.toFixed(1)}%</strong>
              <small>{formatCollectiblePrice(kpis.heldRetiringNav)} in retiring sets</small>
            </article>
          </div>
        </div>

        <article className="iaGlassCard riHeatmapCard riHeatmapCard-hero">
          <div className="iaSectionHeader iaSectionHeader-row">
            <div>
              <span className="executiveDashboardEyebrow">Heatmap</span>
              <h3>Which sets should I buy before retirement?</h3>
            </div>
            <div className="riHeatmapLegend" aria-label="Legend">
              <span className="riLegendItem riLegendItem-critical">🔴 0–3 mo</span>
              <span className="riLegendItem riLegendItem-warning">🟠 3–6 mo</span>
              <span className="riLegendItem riLegendItem-caution">🟡 6–12 mo</span>
              <span className="riLegendItem riLegendItem-calm">🟢 12+ mo</span>
            </div>
          </div>

          <div className="riHeatmap riHeatmap-hero">
            {heatmapColumns.map((column) => (
              <div className="riHeatmapColumn" key={column.id}>
                <header className={`riHeatmapColumnHeader riHeatmapColumnHeader-${column.urgency.tone}`}>
                  <span className="riHeatmapColumnTitle">
                    <span className="riHeatmapColumnEmoji" aria-hidden="true">
                      {column.urgency.emoji}
                    </span>
                    {column.label}
                  </span>
                  <span className="riHeatmapColumnCount">{column.items.length}</span>
                </header>
                <div className="riHeatmapCells">
                  {column.items.length ? (
                    column.items.map((item) => (
                      <article
                        key={item.id}
                        className={`riHeatmapCellCard riHeatmapCellCard-${scoreHeatTone(item.brickAlphaScore)}${
                          selectedItem?.id === item.id ? " riHeatmapCellCard-active" : ""
                        }`}
                      >
                        <div
                          className="riHeatmapCellMain"
                          onClick={() => handleRowSelect(item)}
                          onKeyDown={(event) => handleInteractiveKey(event, () => handleRowSelect(item))}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="riHeatmapCellTopRow">
                            {item.opportunityRank <= 3 ? (
                              <span className="riOpportunityRankBadge riOpportunityRankBadge-compact">
                                {opportunityRankLabel(item.opportunityRank, true)}
                              </span>
                            ) : null}
                            <PortfolioOverlapPill item={item} />
                          </div>
                          <div className="riHeatmapCellBody">
                            <SetImageTile item={item} compact />
                            <div className="riHeatmapCellIdentity">
                              <strong>{item.name}</strong>
                              <small>
                                #{item.setNumber} · {item.theme}
                              </small>
                              <CountdownUrgencyBadge item={item} />
                            </div>
                          </div>
                          <OpportunityScanMetrics item={item} compact />
                        </div>
                        <div className="riHeatmapCellActions">
                          <button type="button" className="primaryButton slimButton" onClick={() => handleAnalyze(item)}>
                            Open Analysis
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="riHeatmapEmpty">
                      <strong>No sets in this window</strong>
                      <small>Add LEGO sets to populate this retirement window.</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="riFeatureGrid" aria-label="Key opportunities and guidance">
        <article className="iaGlassCard riStrongBuyCard riStrongBuyCard-hero">
          <div className="iaSectionHeader iaSectionHeader-row">
            <div>
              <span className="executiveDashboardEyebrow">Opportunity Ranking (Demo)</span>
              <h3>Where is the biggest upside?</h3>
            </div>
            <div className="riSectionHint">
              <span>Ranked by</span>
              <strong>Opportunity Score</strong>
            </div>
          </div>

          {rankedOpportunities.length ? (
            <div className="riStrongBuyGrid riStrongBuyGrid-cards">
              {rankedOpportunities.map((item) => (
                <article
                  key={item.id}
                  className={`riStrongBuyCardItem riStrongBuyCardItem-${scoreHeatTone(item.brickAlphaScore)}${
                    selectedItem?.id === item.id ? " riStrongBuyCardItem-active" : ""
                  }`}
                >
                  <div className="riStrongBuyCardTop">
                    <span className="riStrongBuyRank">{opportunityRankLabel(item.opportunityRank)}</span>
                    <div className="riStrongBuyCardHeader">
                      <SetImageTile item={item} />
                      <div className="riStrongBuyIdentity">
                        <strong>{item.name}</strong>
                        <small>
                          #{item.setNumber} · {item.theme}
                        </small>
                        <div className="riStrongBuyBadges">
                          <CountdownUrgencyBadge item={item} />
                          <PortfolioOverlapPill item={item} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <OpportunityScanMetrics item={item} />

                  <div className="riStrongBuyActions">
                    <button type="button" className="primaryButton slimButton" onClick={() => handleAnalyze(item)}>
                      Open Analysis
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No opportunities ranked yet"
              body="Conviction picks appear once sets are tracked. Scan a set to generate Brick Alpha scores and retirement timing."
            />
          )}
        </article>

        <aside className="riSideStack">
          <article className="iaGlassCard riManagerCard">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">Retirement Manager (Demo)</span>
              <h3>Which opportunities am I missing?</h3>
            </div>
            {managerBrief.length ? (
              <div className="riManagerLines" aria-label="Retirement manager guidance">
                {managerBrief.map((line) => (
                  <div className="riManagerLine" key={line}>
                    <span className="riManagerDot" aria-hidden="true" />
                    <p>{line}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Retirement guidance loading"
                body="Track retiring sets to find opportunities. Add holdings to unlock timing intelligence."
              />
            )}
            <div className="riManagerExamples" aria-label="Examples">
              <span>Examples</span>
              <p>“The next three months contain your highest-conviction buying window.”</p>
              <p>“Increase Star Wars exposure before retirement.”</p>
              <p>“Marvel is currently fully valued.”</p>
            </div>
          </article>

          <article className="iaGlassCard riTimelineCard">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">Retirement Timeline</span>
              <h3>Now → Retired</h3>
            </div>
            <RetirementTimeline selectedItem={selectedItem} />
            {selectedItem ? (
              <div className="riTimelineDetail">
                <strong>{selectedItem.name}</strong>
                <span>{formatCountdown(selectedItem)}</span>
              </div>
            ) : null}
          </article>

          <article className="iaGlassCard riPortfolioImpactCard">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">Portfolio Impact</span>
              <h3>Owned vs missing coverage</h3>
            </div>
            <div className="riPortfolioImpactSummary" aria-label="Portfolio impact summary">
              <div>
                <span>Owned</span>
                <strong>{portfolioImpactSummary.owned}</strong>
              </div>
              <div>
                <span>Missing</span>
                <strong>{portfolioImpactSummary.missing}</strong>
              </div>
              <div>
                <span>Buy more</span>
                <strong>{portfolioImpactSummary.buyMore}</strong>
              </div>
              <div>
                <span>At target</span>
                <strong>{portfolioImpactSummary.targetReached}</strong>
              </div>
              <div>
                <span>Watch only</span>
                <strong>{portfolioImpactSummary.watchOnly}</strong>
              </div>
              <div>
                <span>Reduce</span>
                <strong>{portfolioImpactSummary.reduce}</strong>
              </div>
            </div>

            {selectedItem ? (
              <div className="riPortfolioImpact">
                <div className="riPortfolioImpactStatus">
                  <span>Selected set</span>
                  <strong>
                    {selectedItem.portfolioStatus
                      ? `${selectedItem.portfolioStatus === "Owned" ? "✓ " : ""}${selectedItem.portfolioStatus}`
                      : selectedItem.ownedTrade
                        ? "Owned"
                        : "Not in portfolio"}
                  </strong>
                </div>
                <div className="riPortfolioImpactAction">
                  <span>Guidance</span>
                  <strong className={`riActionBadge riActionBadge-${portfolioStatusTone(selectedItem.portfolioStatus)}`}>
                    {portfolioActionFor(selectedItem)}
                  </strong>
                </div>
                {selectedItem.ownedTrade ? (
                  <div className="riPortfolioImpactGrid">
                    <div>
                      <span>Quantity</span>
                      <strong>{selectedItem.ownedTrade.quantity || 1}</strong>
                    </div>
                    <div>
                      <span>Position value</span>
                      <strong>{formatCollectiblePrice(selectedItem.ownedTrade.currentValue)}</strong>
                    </div>
                    <div>
                      <span>Return</span>
                      <strong className={positiveTone(selectedItem.ownedTrade.pnl)}>
                        {Number(selectedItem.ownedTrade.pnl || 0).toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      <span>Months to retirement</span>
                      <strong>
                        {monthsUntilRetirement(selectedItem) === null
                          ? "--"
                          : Math.max(0, Math.round(monthsUntilRetirement(selectedItem)))}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="riPortfolioImpactNote">
                    This set is not in your portfolio. Brick Alpha recommends{" "}
                    <strong>{selectedItem.recommendation}</strong> ahead of retirement.
                  </p>
                )}
                <div className="riPortfolioImpactActions">
                  {selectedItem.ownedTrade ? (
                    <button
                      type="button"
                      className="ghostButton slimButton"
                      onClick={() => jumpToPageSection("portfolio", "position-detail")}
                    >
                      View position
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="primaryButton slimButton"
                    onClick={() => openCollectibleTicket(selectedItem, "BUY")}
                  >
                    Add to Portfolio
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        </aside>
      </section>

      <article className="iaGlassCard riTableCard">
        <div className="iaSectionHeader">
          <span className="executiveDashboardEyebrow">Investment Radar</span>
          <h3>Retirement opportunity table</h3>
        </div>
        {sortedRows.length ? (
          <div className="riTableWrap">
            <table className="riTable">
              <thead>
                <tr>
                  <th aria-label="Set image" />
                  {TABLE_COLUMNS.map((column) => (
                    <th key={column.key}>
                      <button
                        type="button"
                        className={`riSortButton${sortKey === column.key ? " riSortButton-active" : ""}`}
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {sortKey === column.key ? (
                          <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((item) => (
                  <tr
                    key={item.id}
                    className={selectedItem?.id === item.id ? "riTableRow-active" : ""}
                    onClick={() => handleRowSelect(item)}
                  >
                    <td>
                      <SetImageTile item={item} compact />
                    </td>
                    <td>#{item.setNumber}</td>
                    <td>
                      <strong>{item.name}</strong>
                      {item.dataSource === RETIREMENT_DEMO_SOURCE ? (
                        <small className="riDemoTag">Demo</small>
                      ) : null}
                    </td>
                    <td>{item.theme}</td>
                    <td>
                      <span className={`riScorePill riScorePill-${scoreHeatTone(item.brickAlphaScore)}`}>
                        {formatScore(item.brickAlphaScore)}
                      </span>
                    </td>
                    <td>{item.investmentGrade}</td>
                    <td>{Math.round(item.retirementProbability)}%</td>
                    <td>{item.expectedRetirementDate || "--"}</td>
                    <td>
                      {monthsUntilRetirement(item) === null
                        ? "--"
                        : Math.max(0, Math.round(monthsUntilRetirement(item)))}
                    </td>
                    <td>
                      {formatCollectiblePrice(item.currentMarketValue)}
                      <MarketDataMeta
                        setNumber={item.setNumber || item.sku}
                        source={item.marketDataSource || item.dataSource}
                        lastUpdated={item.marketDataLastUpdated}
                      />
                    </td>
                    <td className={positiveTone(item.expected12MonthRoi)}>
                      {formatPercent(item.expected12MonthRoi)}
                    </td>
                    <td>
                      <span className={`signalBadge ${recommendationTone(item.recommendation)}`}>
                        {item.recommendation}
                      </span>
                    </td>
                    <td>
                      {item.opportunityRank <= 3 ? (
                        <span className="riOpportunityRankBadge riOpportunityRankBadge-compact">
                          {opportunityRankLabel(item.opportunityRank)}
                        </span>
                      ) : (
                        `#${item.opportunityRank}`
                      )}
                    </td>
                    <td>
                      {item.portfolioStatus ? (
                        <span
                          className={`riPortfolioPill riPortfolioPill-${portfolioStatusTone(item.portfolioStatus)}`}
                        >
                          {item.portfolioStatus === "Owned" ? "✓ " : ""}
                          {item.portfolioStatus}
                        </span>
                      ) : (
                        <span className="riPortfolioPill riPortfolioPill-neutral">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No retirement candidates"
            body="Track retiring sets to find opportunities. Scan a set or add holdings to populate this radar."
          />
        )}
      </article>
    </section>
  );
}
