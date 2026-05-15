import Chart from "../Chart";
import { DESK_FILTERS, DESK_PLAYBOOKS } from "../appConfig";
import {
  findDeskMeta,
  formatDateTime,
  formatTickerPrice,
  labelDesk,
  marketModeLabel,
  openExternal,
} from "../appUtils";
import {
  EmptyState,
  WorkspaceCommandBar,
  WorkspaceHero,
  WorkspaceSectionBar,
} from "./appShell";
import {
  SignalCard,
  TechnicalSummaryPanel,
} from "./workspaceCards";

export default function TradeScreen({
  activeChartPlan,
  activeDesk,
  activePageSections,
  activeSignalExecutionPlan,
  appSettings,
  applyChartLevelToTicket,
  effectiveDeskKey,
  executionPlanForCard,
  filteredSignals,
  handleDeskRoute,
  handleSelectSignal,
  jumpToPageSection,
  leadSignal,
  marketSourceMap,
  newsItemsForDesk,
  newsSourceMap,
  openMarketTicket,
  openTrades,
  orderTicket,
  signalsResponse,
  tradeStatus,
}) {
  if (!leadSignal) {
    return (
      <>
        <WorkspaceHero
          tone="trade"
          eyebrow="Execution Desk"
          title="Trade"
          description="Charts, structure plans, tickets, and the live desk in one place."
          statusLabel="Desk state"
          statusValue="Waiting for setup"
          metrics={[
            { label: "Desk", value: labelDesk(activeDesk), detail: "Current focus" },
            { label: "Open positions", value: openTrades.length, detail: "Live book" },
            {
              label: "Feed",
              value: marketModeLabel(signalsResponse.marketData?.mode),
              detail: signalsResponse.marketData?.provider || "Simulator",
            },
          ]}
          primaryAction={{
            label: "Open News",
            onClick: () => jumpToPageSection("news", "macro-feed", activeDesk),
          }}
          secondaryAction={{
            label: "Open Home",
            onClick: () => jumpToPageSection("home", "home-overview", activeDesk),
          }}
        />
        <WorkspaceSectionBar
          sections={activePageSections}
          onSelect={(sectionId) => jumpToPageSection("signals", sectionId, activeDesk)}
        />
        <section className="panel">
          <EmptyState
            title="The trade desk is warming up"
            body="Signals, chart structure, and the ticket workflow will appear here once the engine promotes a lead setup."
          />
        </section>
      </>
    );
  }

  const deskMeta = findDeskMeta(effectiveDeskKey);
  const deskPlaybook = DESK_PLAYBOOKS[effectiveDeskKey] || DESK_PLAYBOOKS.all;
  const macroTape = newsItemsForDesk.slice(0, 6);
  const tradeActions = [
    {
      id: "ticket",
      label: "Open Ticket",
      meta: leadSignal.label,
      detail: "Move straight into the current lead setup with the structure plan ready.",
      onClick: () => openMarketTicket(leadSignal),
    },
    {
      id: "macro",
      label: "Macro Tape",
      meta: `${macroTape.length}`,
      detail: "Keep the desk beside the headlines driving it.",
      onClick: () => jumpToPageSection("signals", "macro-feed", effectiveDeskKey),
    },
    {
      id: "strategy",
      label: "Desk Brief",
      meta: deskPlaybook.watchlist,
      detail: "Recenter on the desk watchlist, cadence, and risk rail.",
      onClick: () => jumpToPageSection("signals", "strategy-state", effectiveDeskKey),
    },
    {
      id: "setups",
      label: "Signal Grid",
      meta: `${filteredSignals.length}`,
      detail: "Browse all visible setups without losing the active signal context.",
      onClick: () => jumpToPageSection("signals", "signals-grid", effectiveDeskKey),
    },
  ];

  return (
    <>
      <WorkspaceHero
        tone="trade"
        eyebrow="Execution Desk"
        title={activeDesk === "all" ? "Trade" : deskMeta.heading}
        description="Dedicated execution workspace with chart structure, live signal context, desk rules, and route-aware tickets."
        statusLabel="Execution route"
        statusValue={
          activeSignalExecutionPlan.mode === "live"
            ? `${activeSignalExecutionPlan.providerLabel}${activeSignalExecutionPlan.pair ? ` | ${activeSignalExecutionPlan.pair}` : ""}`
            : "Collecttrade Paper"
        }
        metrics={[
          {
            label: "Lead setup",
            value: `${leadSignal.action} ${leadSignal.label}`,
            detail: leadSignal.setup,
          },
          {
            label: "Confidence",
            value: `${leadSignal.confidence}%`,
            detail: leadSignal.anchorTrend,
          },
          {
            label: "Open positions",
            value: openTrades.length,
            detail: "Across desks",
          },
        ]}
        primaryAction={{
          label: "Open Ticket",
          onClick: () => openMarketTicket(leadSignal),
        }}
        secondaryAction={{
          label: "Open News",
          onClick: () => jumpToPageSection("news", "macro-feed", effectiveDeskKey),
        }}
      />

      <WorkspaceSectionBar
        sections={activePageSections}
        onSelect={(sectionId) => jumpToPageSection("signals", sectionId, activeDesk)}
      />
      <WorkspaceCommandBar
        tone="trade"
        title="Desk Shortcuts"
        hint="Move between setup, chart, macro tape, and execution without losing the lane."
        actions={tradeActions}
      />

      {tradeStatus ? <div className="statusBanner subtleBanner">{tradeStatus}</div> : null}

      <section className="panel deskPanel" id="desk-selector">
        <div className="panelHeader">
          <div>
            <h2>Choose a desk</h2>
            <p>Keep the active setup, chart, and ticket flow anchored to the market lane you actually want to trade.</p>
          </div>
          <div className="headerStatus">
            <span>Current desk</span>
            <strong>{labelDesk(activeDesk)}</strong>
          </div>
        </div>

        <div className="deskToolbar">
          <div className="segmentedControl deskFilters" role="tablist" aria-label="Trade desks">
            {DESK_FILTERS.map((desk) => (
              <button
                key={desk.id}
                type="button"
                className={activeDesk === desk.id ? "active" : ""}
                onClick={() => handleDeskRoute("signals", desk.id)}
              >
                {desk.label}
              </button>
            ))}
          </div>

          <div className="deskStats">
            <div className="deskStat">
              <span>Watchlist</span>
              <strong>{deskPlaybook.watchlist}</strong>
            </div>
            <div className="deskStat">
              <span>Route</span>
              <strong>
                {activeSignalExecutionPlan.mode === "live"
                  ? `${activeSignalExecutionPlan.providerLabel}${activeSignalExecutionPlan.pair ? ` | ${activeSignalExecutionPlan.pair}` : ""}`
                  : "Paper desk"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="summaryGrid">
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("signals", "chart-panel", effectiveDeskKey)}
        >
          <span>Lead setup</span>
          <strong>{leadSignal.setup}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("signals", "signals-grid", effectiveDeskKey)}
        >
          <span>Visible setups</span>
          <strong>{filteredSignals.length}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("news", "macro-feed", effectiveDeskKey)}
        >
          <span>Desk headlines</span>
          <strong>{macroTape.length}</strong>
        </button>
        <button
          type="button"
          className="summaryCard summaryCardButton"
          onClick={() => jumpToPageSection("portfolio", "open-positions")}
        >
          <span>Open book</span>
          <strong>{openTrades.length}</strong>
        </button>
      </section>

      <div className="splitGrid">
        <section className="panel chartPanel" id="chart-panel">
          <div className="panelHeader">
            <div>
              <h2>Active Signal</h2>
              <p>The selected trade gets a command view first: structure, route, chart, and the ticket plan in one place.</p>
            </div>
            <div className="headerStatus">
              <span>Lead instrument</span>
              <strong>{leadSignal.label}</strong>
            </div>
          </div>

          <div className="signalCommandShell">
            <div className="signalCommandHero">
              <div className="signalCommandPrimary">
                <div className="signalPillRow">
                  <span className={`signalBadge ${leadSignal.action === "BUY" ? "buy" : leadSignal.action === "SELL" ? "sell" : "hold"}`}>
                    {leadSignal.action}
                  </span>
                  <span className="signalMiniTag">{leadSignal.setup}</span>
                  <span className="signalMiniTag">{leadSignal.retest ? "Retest active" : "Waiting"}</span>
                </div>
                <div className="signalCommandCopy">
                  <strong>{leadSignal.headline}</strong>
                  <span>{leadSignal.exitRule}</span>
                </div>
              </div>

              <div className="signalCommandSnapshot">
                <span>Execution snapshot</span>
                <strong>{formatTickerPrice(leadSignal.ticker, leadSignal.price)}</strong>
                <small>
                  {activeSignalExecutionPlan.mode === "live"
                    ? `${activeSignalExecutionPlan.providerLabel}${activeSignalExecutionPlan.pair ? ` | ${activeSignalExecutionPlan.pair}` : ""}`
                    : "Collecttrade Paper"}
                </small>
              </div>
            </div>

            <div className="signalCommandGrid">
              <div className="signalCommandMetric">
                <span>Anchor trend</span>
                <strong>{leadSignal.anchorTrend}</strong>
              </div>
              <div className="signalCommandMetric">
                <span>Gap state</span>
                <strong>{leadSignal.gapState}</strong>
              </div>
              <div className="signalCommandMetric">
                <span>Confidence</span>
                <strong>{leadSignal.confidence}%</strong>
              </div>
              <div className="signalCommandMetric">
                <span>Route</span>
                <strong>
                  {activeSignalExecutionPlan.mode === "live"
                    ? `${activeSignalExecutionPlan.providerLabel}${activeSignalExecutionPlan.pair ? ` | ${activeSignalExecutionPlan.pair}` : ""}`
                    : "Paper desk"}
                </strong>
              </div>
              <div className="signalCommandMetric">
                <span>Support</span>
                <strong>{formatTickerPrice(leadSignal.ticker, activeChartPlan?.support ?? null)}</strong>
              </div>
              <div className="signalCommandMetric">
                <span>Resistance</span>
                <strong>{formatTickerPrice(leadSignal.ticker, activeChartPlan?.resistance ?? null)}</strong>
              </div>
            </div>
          </div>

          <Chart
            priceSeries={leadSignal.chart?.price || []}
            ema8Series={leadSignal.chart?.ema8 || []}
            ema21Series={leadSignal.chart?.ema21 || []}
            plan={activeChartPlan}
          />

          <div className="chartPlanGrid">
            <div className="chartPlanCard">
              <span>Support</span>
              <strong>{formatTickerPrice(leadSignal.ticker, activeChartPlan?.support ?? null)}</strong>
              <small>Recent structure support from the active plan.</small>
              <button type="button" className="ghostButton chartPlanButton" onClick={() => applyChartLevelToTicket("support")}>
                Use level
              </button>
            </div>
            <div className="chartPlanCard">
              <span>Resistance</span>
              <strong>{formatTickerPrice(leadSignal.ticker, activeChartPlan?.resistance ?? null)}</strong>
              <small>Recent structure resistance from the active plan.</small>
              <button type="button" className="ghostButton chartPlanButton" onClick={() => applyChartLevelToTicket("resistance")}>
                Use level
              </button>
            </div>
            <div className="chartPlanCard">
              <span>Stop</span>
              <strong>{formatTickerPrice(leadSignal.ticker, activeChartPlan?.stopPrice ?? null)}</strong>
              <small>{activeChartPlan?.source || "Current ticket stop"}</small>
              <button type="button" className="ghostButton chartPlanButton" onClick={() => applyChartLevelToTicket("stop")}>
                Use level
              </button>
            </div>
            <div className="chartPlanCard">
              <span>Target</span>
              <strong>{formatTickerPrice(leadSignal.ticker, activeChartPlan?.targetPrice ?? null)}</strong>
              <small>{activeChartPlan?.rationale || "Current ticket target"}</small>
              <button type="button" className="ghostButton chartPlanButton" onClick={() => applyChartLevelToTicket("target")}>
                Use level
              </button>
            </div>
          </div>

          <div className="chartPlanHint">
            {orderTicket?.kind === "market" && orderTicket.marketTicker === leadSignal.ticker
              ? "The current ticket is linked to this chart. Click any level card to push it into the ticket."
              : "Open a ticket on this signal if you want to push support, resistance, stop, or target levels straight into the plan."}
          </div>
        </section>

        <section className="panel" id="macro-feed">
          <div className="panelHeader">
            <div>
              <h2>Macro Tape</h2>
              <p>Keep the selected trade beside the headline flow that is shaping the desk.</p>
            </div>
          </div>

          <div className="newsList">
            {macroTape.map((item) => (
              <article className="newsItem interactiveCard" key={item.id}>
                <div className="signalPillRow">
                  <span className="signalMiniTag">{item.sourceName}</span>
                  <span className="signalMiniTag">
                    {formatDateTime(item.publishedAt || item.seenAt, appSettings.timezone)}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="panelActions">
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={() => openExternal(item.link || newsSourceMap[item.sourceId])}
                  >
                    Read Source
                  </button>
                </div>
              </article>
            ))}
            {!macroTape.length ? (
              <EmptyState
                title="No macro tape yet"
                body="The desk-aligned news feed will appear here once the sources finish loading."
              />
            ) : null}
          </div>
        </section>
      </div>

      {leadSignal.technicalSummary ? <TechnicalSummaryPanel signal={leadSignal} /> : null}

      <section className="panel" id="strategy-state">
        <div className="panelHeader">
          <div>
            <h2>Desk Brief</h2>
            <p>Keep the desk behaving like a real lane with its own watchlist, route, cadence, and risk rail.</p>
          </div>
        </div>

        <div className="deskBriefGrid">
          <div className="deskBriefCard">
            <span>Watchlist</span>
            <strong>{deskPlaybook.watchlist}</strong>
            <small>{deskMeta.blurb}</small>
          </div>
          <div className="deskBriefCard">
            <span>Routing</span>
            <strong>{deskPlaybook.venue}</strong>
            <small>
              {activeSignalExecutionPlan.mode === "live"
                ? `${activeSignalExecutionPlan.providerLabel}${activeSignalExecutionPlan.pair ? ` on ${activeSignalExecutionPlan.pair}` : ""} is ready to route this desk.`
                : "This desk stays in paper mode until its live connector is ready."}
            </small>
          </div>
          <div className="deskBriefCard">
            <span>Cadence</span>
            <strong>{deskPlaybook.cadence}</strong>
            <small>{leadSignal.exitRule}</small>
          </div>
          <div className="deskBriefCard">
            <span>Risk rail</span>
            <strong>{deskPlaybook.risk}</strong>
            <small>{signalsResponse.strategyRules?.[0] || "Follow the desk rules before you size up."}</small>
          </div>
        </div>
      </section>

      <section className="panel" id="signals-grid">
        <div className="panelHeader">
          <div>
            <h2>Signal Grid</h2>
            <p>Compact trading tiles with route, feed, momentum, and structure context built in.</p>
          </div>
          <div className="headerStatus">
            <span>Visible setups</span>
            <strong>{filteredSignals.length}</strong>
          </div>
        </div>

        <div className="signalGrid">
          {filteredSignals.map((signal) => (
            <SignalCard
              key={signal.ticker}
              signal={signal}
              executionPlan={executionPlanForCard(signal)}
              marketSource={marketSourceMap[signal.ticker]}
              isActive={signal.ticker === leadSignal.ticker}
              onSelect={handleSelectSignal}
              onFastTrade={openMarketTicket}
            />
          ))}
        </div>
      </section>
    </>
  );
}
