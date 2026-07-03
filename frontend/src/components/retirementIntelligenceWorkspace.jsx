import { useMemo, useState } from "react";
import { formatCollectiblePrice, positiveTone } from "../appUtils";
import {
  RETIREMENT_DEMO_SOURCE,
  RETIREMENT_HEATMAP_BUCKETS,
  buildRetirementInsight,
  buildRetirementSummaryKpis,
  buildRetirementWatchlist,
  groupWatchlistByBucket,
  monthsUntilRetirement,
  portfolioActionFor,
  scoreHeatTone,
  strongBuyBeforeRetirement,
} from "../retirementIntelligenceData";
import { EmptyState } from "./appShell";

const TABLE_COLUMNS = [
  { key: "setNumber", label: "Set #" },
  { key: "name", label: "Set" },
  { key: "theme", label: "Theme" },
  { key: "brickAlphaScore", label: "Score" },
  { key: "investmentGrade", label: "Grade" },
  { key: "retirementProbability", label: "Ret. Prob." },
  { key: "expectedRetirementDate", label: "Ret. Date" },
  { key: "currentMarketValue", label: "Price" },
  { key: "expected12MonthRoi", label: "12M ROI" },
  { key: "recommendation", label: "Rec." },
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

function recommendationTone(recommendation) {
  if (recommendation === "Strong Buy" || recommendation === "Buy") {
    return "buy";
  }
  if (recommendation === "Sell" || recommendation === "Avoid") {
    return "sell";
  }
  return "hold";
}

function portfolioStatusTone(status) {
  if (status === "Buy More") {
    return "buy";
  }
  if (status === "Sell") {
    return "sell";
  }
  if (status === "Not Owned") {
    return "neutral";
  }
  return "hold";
}

function compareRows(left, right, key, direction) {
  const multiplier = direction === "asc" ? 1 : -1;
  const leftValue = left[key];
  const rightValue = right[key];

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
  const demoCount = watchlist.filter((item) => item.dataSource === RETIREMENT_DEMO_SOURCE).length;
  const sortedRows = useMemo(() => {
    const rows = [...watchlist];
    rows.sort((left, right) => compareRows(left, right, sortKey, sortDirection));
    return rows;
  }, [sortDirection, sortKey, watchlist]);

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

  return (
    <section className="riWorkspace" id="retirement-intelligence">
      <header className="riHeader">
        <div>
          <span className="executiveDashboardEyebrow">Premium Intelligence</span>
          <h2>Retirement Intelligence</h2>
          <p>
            AI-driven retirement radar — heatmap timing, conviction scores, and portfolio-aware
            buy/hold/sell guidance.
          </p>
        </div>
        {demoCount > 0 ? (
          <div className="riDemoBadge" title="Demo retirement timelines until BrickEconomy API is connected">
            <span>Data source</span>
            <strong>
              {demoCount} demo · {watchlist.length - demoCount} live
            </strong>
          </div>
        ) : null}
      </header>

      <div className="riKpiStrip" aria-label="Retirement summary metrics">
        <article className="riKpiCard riKpiCard-primary">
          <span>Sets Retiring This Quarter</span>
          <strong>{kpis.setsRetiringThisQuarter}</strong>
          <small>Within 0–3 month window</small>
        </article>
        <article className="riKpiCard">
          <span>Avg Brick Alpha Score</span>
          <strong>{formatScore(kpis.averageBrickAlphaScore)}</strong>
          <small>Across retirement watchlist</small>
        </article>
        <article className="riKpiCard">
          <span>Avg Expected ROI</span>
          <strong className={positiveTone(kpis.averageExpectedRoi)}>
            {formatPercent(kpis.averageExpectedRoi)}
          </strong>
          <small>12-month forecast</small>
        </article>
        <article className="riKpiCard">
          <span>Portfolio Exposure</span>
          <strong>{kpis.portfolioExposure.toFixed(1)}%</strong>
          <small>
            {formatCollectiblePrice(kpis.heldRetiringNav)} in retiring sets
          </small>
        </article>
      </div>

      <div className="riMainGrid">
        <article className="iaGlassCard riHeatmapCard">
          <div className="iaSectionHeader">
            <span className="executiveDashboardEyebrow">Timing Radar</span>
            <h3>Retirement Heatmap</h3>
          </div>
          <div className="riHeatmap">
            {RETIREMENT_HEATMAP_BUCKETS.map((bucket) => (
              <div className="riHeatmapColumn" key={bucket.id}>
                <header className="riHeatmapColumnHeader">
                  <span>{bucket.label}</span>
                  <strong>{bucketGroups[bucket.id]?.length || 0}</strong>
                </header>
                <div className="riHeatmapCells">
                  {bucketGroups[bucket.id]?.length ? (
                    bucketGroups[bucket.id].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`riHeatmapCell riHeatmapCell-${scoreHeatTone(item.brickAlphaScore)}${
                          selectedItem?.id === item.id ? " riHeatmapCell-active" : ""
                        }`}
                        onClick={() => handleRowSelect(item)}
                        title={`${item.name} · Score ${formatScore(item.brickAlphaScore)}`}
                      >
                        <SetImageTile item={item} compact />
                        <strong>{item.name}</strong>
                        <small>#{item.setNumber}</small>
                        <span>{formatScore(item.brickAlphaScore)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="riHeatmapEmpty">No sets</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="riSideStack">
          <article className="iaGlassCard riInsightCard">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">AI Insight</span>
              <h3>Why this ranks #1</h3>
            </div>
            {selectedItem ? (
              <>
                <div className="riInsightLead">
                  <SetImageTile item={selectedItem} />
                  <div>
                    <strong>{insight.headline}</strong>
                    <span className={`signalBadge ${recommendationTone(insight.recommendation)}`}>
                      {insight.recommendation}
                    </span>
                  </div>
                </div>
                <p className="riInsightBody">{insight.body}</p>
                <ul className="riInsightDrivers">
                  {insight.drivers.map((driver) => (
                    <li key={driver}>{driver}</li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                title="No ranked opportunities"
                body="Retirement intelligence will populate as LEGO sets are tracked."
              />
            )}
          </article>

          <article className="iaGlassCard riPortfolioImpactCard">
            <div className="iaSectionHeader">
              <span className="executiveDashboardEyebrow">Portfolio Impact</span>
              <h3>Position guidance</h3>
            </div>
            {selectedItem ? (
              <div className="riPortfolioImpact">
                <div className="riPortfolioImpactStatus">
                  <span>Ownership</span>
                  <strong>{selectedItem.ownedTrade ? "In portfolio" : "Not owned"}</strong>
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
                    {selectedItem.ownedTrade ? "Buy more" : "Add to portfolio"}
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        </aside>
      </div>

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
                    <td>{formatCollectiblePrice(item.currentMarketValue)}</td>
                    <td className={positiveTone(item.expected12MonthRoi)}>
                      {formatPercent(item.expected12MonthRoi)}
                    </td>
                    <td>
                      <span className={`signalBadge ${recommendationTone(item.recommendation)}`}>
                        {item.recommendation}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`riPortfolioPill riPortfolioPill-${portfolioStatusTone(item.portfolioStatus)}`}
                      >
                        {item.portfolioStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No retirement candidates"
            body="Track LEGO sets to populate the retirement intelligence dashboard."
          />
        )}
      </article>

      <article className="iaGlassCard riStrongBuyCard">
        <div className="iaSectionHeader">
          <span className="executiveDashboardEyebrow">Conviction Picks</span>
          <h3>Strong Buy Before Retirement</h3>
        </div>
        {strongBuys.length ? (
          <div className="riStrongBuyGrid">
            {strongBuys.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className="riStrongBuyTile"
                onClick={() => handleRowSelect(item)}
              >
                <span className="riStrongBuyRank">#{index + 1}</span>
                <SetImageTile item={item} compact />
                <strong>{item.name}</strong>
                <small>
                  #{item.setNumber} · {item.theme}
                </small>
                <div className="riStrongBuyMetrics">
                  <span>Score {formatScore(item.brickAlphaScore)}</span>
                  <span className={positiveTone(item.expected12MonthRoi)}>
                    {formatPercent(item.expected12MonthRoi)}
                  </span>
                </div>
                <span className="signalBadge buy">{item.recommendation}</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No strong buys flagged"
            body="Conviction picks appear when sets score highly ahead of retirement windows."
          />
        )}
      </article>
    </section>
  );
}
