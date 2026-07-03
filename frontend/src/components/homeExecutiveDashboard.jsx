import { EmptyState } from "./appShell";
import { formatCollectiblePrice, formatDateTime, positiveTone } from "../appUtils";

function formatScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}/100` : "--";
}

export function HomeExecutiveDashboard({
  aiSummary,
  appSettings,
  brickAlphaPortfolio,
  jumpToPageSection,
  marketIntelligence,
  portfolioHoldings,
  retirementAlerts,
  strongBuyOpportunities,
  unrealizedGainPercent,
}) {
  return (
    <section className="executiveDashboardCompact" id="home-dashboard">
      <header className="executiveDashboardCompactHeader">
        <div>
          <span className="executiveDashboardEyebrow">Executive Summary</span>
          <h1>Dashboard</h1>
        </div>
        <div className="executiveDashboardStatus">
          <span>As of today</span>
          <strong>{formatDateTime(new Date().toISOString(), appSettings.timezone)}</strong>
        </div>
      </header>

      <div className="executiveKpiStrip" aria-label="Portfolio key metrics">
        <button
          type="button"
          className="executiveKpiStripCard executiveKpiStripCard-primary"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Portfolio Value</span>
          <strong>{formatCollectiblePrice(brickAlphaPortfolio.netAssetValue)}</strong>
          <small>
            {portfolioHoldings.length} holding{portfolioHoldings.length === 1 ? "" : "s"}
          </small>
        </button>
        <button
          type="button"
          className="executiveKpiStripCard"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Portfolio Growth</span>
          <strong className={positiveTone(brickAlphaPortfolio.unrealizedGain)}>
            {unrealizedGainPercent != null
              ? `${unrealizedGainPercent >= 0 ? "+" : ""}${unrealizedGainPercent.toFixed(1)}%`
              : "--"}
          </strong>
          <small>{formatCollectiblePrice(brickAlphaPortfolio.unrealizedGain)} unrealised</small>
        </button>
        <button
          type="button"
          className="executiveKpiStripCard"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Brick Alpha Score</span>
          <strong>{formatScore(brickAlphaPortfolio.averageBrickAlphaScore)}</strong>
          <small>Portfolio average</small>
        </button>
        <button
          type="button"
          className="executiveKpiStripCard"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Collection Grade</span>
          <strong>{brickAlphaPortfolio.collectionGrade || "--"}</strong>
          <small>{brickAlphaPortfolio.riskLevel || "Balanced"} profile</small>
        </button>
        <button
          type="button"
          className="executiveKpiStripCard"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Diversification</span>
          <strong>{formatScore(brickAlphaPortfolio.diversificationScore)}</strong>
          <small>Theme spread</small>
        </button>
      </div>

      <div className="executiveDashboardCompactGrid">
        <section className="executiveCompactPanel executiveCompactPanel-ai">
          <div className="executivePanelHeader">
            <div>
              <span className="executiveDashboardEyebrow">AI Copilot</span>
              <h3>Today&apos;s AI Summary</h3>
            </div>
          </div>
          <p className="executiveAiSummary">{aiSummary}</p>
          <button
            type="button"
            className="ghostButton slimButton"
            onClick={() => jumpToPageSection("collectibles", "investment-analysis")}
          >
            Ask more in Investment Analysis
          </button>
        </section>

        <section className="executiveCompactPanel executiveCompactPanel-alerts">
          <div className="executivePanelHeader">
            <div>
              <h3>Retirement Alerts</h3>
              <p>Sets needing attention in your portfolio.</p>
            </div>
            <div className="headerStatus">
              <span>Active</span>
              <strong>{retirementAlerts.length}</strong>
            </div>
            <button
              type="button"
              className="ghostButton slimButton"
              onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}
            >
              View all
            </button>
          </div>
          {retirementAlerts.length ? (
            <div className="executiveRetirementChips executiveRetirementChips-compact">
              {retirementAlerts.slice(0, 4).map((holding) => (
                <button
                  key={holding.id}
                  type="button"
                  className={`executiveRetirementChip executiveRetirementChip-${holding.retirementStatus.toLowerCase()}`}
                  onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}
                >
                  <span>{holding.retirementStatus}</span>
                  <strong>{holding.label || holding.name}</strong>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No retirement alerts"
              body="Your holdings are not approaching retirement windows."
            />
          )}
        </section>

        <section className="executiveCompactPanel executiveCompactPanel-opportunities">
          <div className="executivePanelHeader">
            <div>
              <h3>Strong Buy Opportunities</h3>
              <p>What to buy next — portfolio and catalog picks.</p>
            </div>
          </div>
          {strongBuyOpportunities.length ? (
            <div className="executiveOpportunityList">
              {strongBuyOpportunities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="executiveOpportunityItem"
                  onClick={() =>
                    jumpToPageSection(
                      item.source === "portfolio" ? "portfolio" : "collectibles",
                      item.source === "portfolio" ? "open-positions" : "investment-analysis",
                    )
                  }
                >
                  <span className="signalBadge buy">Strong Buy</span>
                  <strong>{item.label}</strong>
                  <small>
                    Score {formatScore(item.brickAlphaScore)} · {item.theme || item.investmentGrade || "LEGO"}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <>
              <EmptyState
                title="No strong buys flagged"
                body="Open LEGO Investments to research catalog opportunities."
              />
              <button
                type="button"
                className="ghostButton slimButton"
                onClick={() => jumpToPageSection("collectibles", "collectibles-grid")}
              >
                Browse catalog
              </button>
            </>
          )}
        </section>

        <section className="executiveCompactPanel executiveCompactPanel-intel">
          <div className="executivePanelHeader">
            <div>
              <h3>Recent Market Intelligence</h3>
              <p>Latest LEGO and macro context.</p>
            </div>
            <button
              type="button"
              className="ghostButton slimButton"
              onClick={() => jumpToPageSection("news", "macro-feed")}
            >
              View all
            </button>
          </div>
          {marketIntelligence.length ? (
            <div className="executiveIntelList">
              {marketIntelligence.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="executiveIntelItem"
                  onClick={() => jumpToPageSection("news", "news-lead")}
                >
                  <span>{item.sourceName || "Market"}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Intelligence warming up"
              body="Market headlines will appear here as the feed refreshes."
            />
          )}
        </section>
      </div>

      <nav className="executiveDashboardQuickNav" aria-label="Workspace shortcuts">
        <button type="button" onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}>
          Portfolio
        </button>
        <button type="button" onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}>
          Retirement Intelligence
        </button>
        <button type="button" onClick={() => jumpToPageSection("collectibles", "investment-analysis")}>
          Investment Analysis
        </button>
        <button type="button" onClick={() => jumpToPageSection("collectibles", "collectibles-grid")}>
          Watchlist
        </button>
        <button type="button" onClick={() => jumpToPageSection("news", "macro-feed")}>
          Market Intelligence
        </button>
        <button type="button" onClick={() => jumpToPageSection("reports", "reports-overview")}>
          Reports
        </button>
      </nav>
    </section>
  );
}
