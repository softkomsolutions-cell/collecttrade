import { EmptyState } from "./appShell";
import { formatCollectiblePrice, formatDateTime, positiveTone } from "../appUtils";

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

function timeOfDayGreeting(isoTime, timezone) {
  try {
    const date = new Date(isoTime);
    const hourString = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone || undefined,
    }).format(date);
    const hour = Number(hourString);
    if (Number.isFinite(hour)) {
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    }
  } catch {
    // Fall through to default greeting.
  }
  return "Welcome back";
}

function topThemes(themeAllocation = {}, maxItems = 3) {
  const breakdown = themeAllocation?.breakdown || [];
  return breakdown
    .slice()
    .sort((a, b) => Number(b?.actual || 0) - Number(a?.actual || 0))
    .slice(0, maxItems);
}

export function HomeExecutiveDashboard({
  aiSummary,
  appSettings,
  brickAlphaPortfolio,
  isDemoMode = false,
  jumpToPageSection,
  marketIntelligence,
  portfolioHoldings,
  retirementAlerts,
  strongBuyOpportunities,
  unrealizedGainPercent,
}) {
  const hasPortfolioData = isDemoMode || (portfolioHoldings || []).length > 0;
  const nowIso = new Date().toISOString();
  const greeting = timeOfDayGreeting(nowIso, appSettings?.timezone);
  const displayName = appSettings?.userName || "Darren";
  const aiConfidenceScore = brickAlphaPortfolio?.confidenceScore;
  const themeRows = topThemes(brickAlphaPortfolio?.themeAllocation, 3);
  const retirementImmediate = retirementAlerts.filter((item) =>
    ["Overdue", "Imminent"].includes(item.retirementStatus),
  );
  const retirementThreeMonths = retirementAlerts.filter((item) => item.retirementStatus === "Approaching");
  return (
    <section className="executiveDashboardCompact" id="home-dashboard">
      <header className="executiveDashboardCompactHeader">
        <div className="executiveDashboardHeroCopy">
          <span className="executiveDashboardEyebrow">Executive command centre</span>
          <h1>
            {greeting} {displayName}
          </h1>
          <p className="executiveDashboardHeroSub">
            Portfolio value, performance, opportunities, and investment brief — all above the fold.
          </p>
        </div>
        {isDemoMode ? (
          <div className="executiveDashboardStatus">
            <span className="demoBadge subtleDemoBadge">Demo Data</span>
          </div>
        ) : null}
        <div className="executiveDashboardStatus">
          <span>As of</span>
          <strong>{formatDateTime(nowIso, appSettings.timezone)}</strong>
        </div>
      </header>

      <div className="executiveKpiStrip" aria-label="Portfolio key metrics">
        <button
          type="button"
          className="executiveKpiStripCard executiveKpiStripCard-primary"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Portfolio Value</span>
          <strong>{hasPortfolioData ? formatCollectiblePrice(brickAlphaPortfolio.netAssetValue) : "--"}</strong>
          <small>
            {hasPortfolioData
              ? `${portfolioHoldings.length} holding${portfolioHoldings.length === 1 ? "" : "s"}${isDemoMode ? " · demo" : ""}`
              : "Add LEGO positions to personalise"}
          </small>
        </button>
        <button
          type="button"
          className="executiveKpiStripCard"
          onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
        >
          <span>Today&apos;s Growth</span>
          <strong className={positiveTone(hasPortfolioData ? brickAlphaPortfolio.unrealizedGain : 0)}>
            {hasPortfolioData && unrealizedGainPercent != null
              ? `${unrealizedGainPercent >= 0 ? "+" : ""}${unrealizedGainPercent.toFixed(1)}%`
              : "--"}
          </strong>
          <small>
            {hasPortfolioData
              ? `${formatCollectiblePrice(brickAlphaPortfolio.unrealizedGain)} unrealised`
              : "Trend appears once holdings are added"}
          </small>
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
          <span>Brick Alpha Score</span>
          <strong>{hasPortfolioData ? formatScore(aiConfidenceScore) : "--"}</strong>
          <small>{hasPortfolioData ? "Model confidence in portfolio posture" : "Appears once holdings are added"}</small>
        </button>
      </div>

      <div className="executiveDashboardCompactGrid">
        <section className="executiveCompactPanel executiveCompactPanel-ai executiveCompactPanel-aiHero">
          <div className="executivePanelHeader">
            <div>
              <span className="executiveDashboardEyebrow">Portfolio Brief{isDemoMode ? " (Demo)" : ""}</span>
              <h3>Investment Summary</h3>
            </div>
          </div>
          <p className="executiveAiSummary executiveAiSummary-premium">{aiSummary}</p>
          <button
            type="button"
            className="ghostButton slimButton executiveAiCta"
            onClick={() => jumpToPageSection("collectibles", "investment-analysis")}
          >
            Open Analysis
          </button>
        </section>

        <section className="executiveCompactPanel executiveCompactPanel-alerts">
          <div className="executivePanelHeader">
            <div>
              <h3>Retirement Alerts</h3>
              <p>What requires attention — ordered by urgency.</p>
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
          <div className="executiveRetirementBuckets" aria-label="Retirement urgency buckets">
            <button
              type="button"
              className={`executiveRetirementBucket ${retirementImmediate.length ? "urgent" : ""}`}
              onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}
            >
              <span>Immediate</span>
              <strong>{retirementImmediate.length}</strong>
              <small>Overdue / Imminent</small>
            </button>
            <button
              type="button"
              className={`executiveRetirementBucket ${retirementThreeMonths.length ? "warning" : ""}`}
              onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}
            >
              <span>3 Months</span>
              <strong>{retirementThreeMonths.length}</strong>
              <small>Approaching</small>
            </button>
            <button
              type="button"
              className="executiveRetirementBucket"
              onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}
            >
              <span>6 Months</span>
              <strong>0</strong>
              <small>Tracking</small>
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
              title="No retirement alerts yet"
              body="No holdings are near retirement. Add your first LEGO position to unlock timeline alerts and exit guidance."
            />
          )}
        </section>

        <section className="executiveCompactPanel executiveCompactPanel-opportunities">
          <div className="executivePanelHeader">
            <div>
              <h3>Opportunity Ranking{isDemoMode ? " (Demo)" : ""}</h3>
              <p>Top conviction picks ranked by opportunity score.</p>
            </div>
          </div>
          {strongBuyOpportunities.length ? (
            <div className="executiveOpportunityGrid" aria-label="Opportunity ranking cards">
              {strongBuyOpportunities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="executiveOpportunityCard"
                  onClick={() =>
                    jumpToPageSection(
                      item.source === "portfolio" ? "portfolio" : "collectibles",
                      item.source === "portfolio" ? "portfolio-holdings" : "retirement-intelligence",
                    )
                  }
                >
                  <div className="executiveOpportunityCardTop">
                    <span className="executiveOpportunityRank">
                      {item.opportunityRank <= 3
                        ? ["🥇 #1", "🥈 #2", "🥉 #3"][item.opportunityRank - 1]
                        : `#${item.opportunityRank}`}
                    </span>
                    {item.portfolioStatus ? (
                      <span className="executiveOpportunitySource">
                        {item.portfolioStatus === "Owned" ? "✓ " : ""}
                        {item.portfolioStatus}
                      </span>
                    ) : (
                      <span className="executiveOpportunitySource">New opportunity</span>
                    )}
                  </div>
                  <div className="executiveOpportunityMetrics">
                    <div>
                      <span>Score</span>
                      <strong>{formatScore(item.brickAlphaScore)}</strong>
                    </div>
                    <div>
                      <span>ROI</span>
                      <strong className={positiveTone(item.expected12MonthRoi)}>
                        {formatPercent(item.expected12MonthRoi)}
                      </strong>
                    </div>
                    <div>
                      <span>Months</span>
                      <strong>
                        {item.monthsToRetirement === null
                          ? "--"
                          : Math.max(0, Math.round(item.monthsToRetirement))}
                      </strong>
                    </div>
                  </div>
                  <div className="executiveOpportunityCopy">
                    <strong>{item.label}</strong>
                    <small>
                      {item.urgency?.emoji} {item.urgency?.label} · {item.recommendation}
                    </small>
                  </div>
                  <div className="executiveOpportunityCta">
                    <span>Open Analysis</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <EmptyState
                title="No strong buys highlighted yet"
                body="Start by scanning your first LEGO set, then open Investment Analysis to surface high‑conviction opportunities."
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

        <section className="executiveCompactPanel executiveCompactPanel-snapshot">
          <div className="executivePanelHeader">
            <div>
              <h3>Portfolio Snapshot</h3>
              <p>Diversification, themes, and grade at a glance.</p>
            </div>
            <button
              type="button"
              className="ghostButton slimButton"
              onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}
            >
              Open Portfolio
            </button>
          </div>
          <div className="executiveSnapshotGrid">
            <div className="executiveSnapshotMetric">
              <span>Collection grade</span>
              <strong>{brickAlphaPortfolio.collectionGrade || "--"}</strong>
              <small>{brickAlphaPortfolio.riskLevel || "Balanced"} profile</small>
            </div>
            <div className="executiveSnapshotMetric">
              <span>Diversification</span>
              <strong>{formatScore(brickAlphaPortfolio.diversificationScore)}</strong>
              <small>Theme spread</small>
            </div>
            <div className="executiveSnapshotThemes">
              <span>Top themes</span>
              {themeRows.length ? (
                <div className="executiveSnapshotThemeRow">
                  {themeRows.map((row) => (
                    <div className="executiveSnapshotTheme" key={row.theme}>
                      <strong>{row.theme}</strong>
                      <small>{Number(row.actual || 0).toFixed(0)}%</small>
                    </div>
                  ))}
                </div>
              ) : (
                <small className="executiveSnapshotMuted">Theme allocation appears once holdings are added.</small>
              )}
            </div>
          </div>
        </section>

        <section className="executiveCompactPanel executiveCompactPanel-intel">
          <div className="executivePanelHeader">
            <div>
              <h3>Market Intelligence</h3>
              <p>LEGO investment news — latest updates.</p>
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
              {marketIntelligence.slice(0, 3).map((item) => (
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
              title="Market intelligence loading"
              body="LEGO investment headlines appear here as the feed refreshes. Scan a set to generate a fresh Brick Alpha verdict in the meantime."
            />
          )}
        </section>
      </div>

      <nav className="executiveDashboardQuickNav" aria-label="Workspace shortcuts">
        <button type="button" onClick={() => jumpToPageSection("scan-evaluate", "scan-evaluate")}>
          Scan Set
        </button>
        <button type="button" onClick={() => jumpToPageSection("collectibles", "investment-analysis")}>
          Investment Analysis
        </button>
        <button type="button" onClick={() => jumpToPageSection("portfolio", "portfolio-dashboard")}>
          Portfolio
        </button>
        <button type="button" onClick={() => jumpToPageSection("collectibles", "retirement-intelligence")}>
          Retirement
        </button>
      </nav>
    </section>
  );
}
