import { useState } from "react";
import { VALR_PAIR_OPTIONS } from "../appConfig";
import {
  actionTone,
  formatCollectiblePrice,
  formatConnectorAmount,
  formatDateTime,
  formatQuantity,
  formatTickerPrice,
  formatTradePrice,
  handleInteractiveKey,
  humanizeStatus,
  labelDesk,
  marketFeedLabel,
  openExternal,
  positiveTone,
  providerLabel,
  rsiToneFromValue,
  rsiZoneLabel,
  signalActionToneClass,
  signalRegionLabel,
  signalTrendTone,
  statusTone,
  technicalTone,
  venueDetailLabel,
} from "../appUtils";
import { EmptyState } from "./appShell";

export function SignalCard({ signal, executionPlan, marketSource, isActive, onSelect, onFastTrade }) {
  const routeLabel =
    executionPlan?.mode === "live"
      ? venueDetailLabel(executionPlan.providerLabel, executionPlan.pair)
      : "Paper desk";
  const anchorTone = signalTrendTone(signal.anchorTrend);
  const retestLabel = signal.retest ? "Retest active" : "Waiting";
  const retestTone = signal.retest ? signalActionToneClass(signal.action) : "muted";
  const rsiTone = rsiToneFromValue(signal.rsi);
  const rsiZone = rsiZoneLabel(signal.rsi);

  return (
    <article
      className={`signalCard interactiveCard ${isActive ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(signal)}
      onKeyDown={(event) => handleInteractiveKey(event, () => onSelect(signal))}
    >
      <div className="signalCardTop">
        <div className="signalPillRow">
          <span className={`signalBadge ${actionTone(signal.action)}`}>{signal.action}</span>
          <span className="signalMiniTag">{signal.setup}</span>
        </div>
        <div className="signalPriceBlock">
          <strong>{formatTickerPrice(signal.ticker, signal.price)}</strong>
          <div className={`signalRsiBadge ${rsiTone}`}>
            <span>RSI</span>
            <strong>{signal.rsi}</strong>
            <small>{rsiZone}</small>
          </div>
        </div>
      </div>

      <div className="signalKicker">
        {labelDesk(signal.desk)} desk | {signalRegionLabel(signal.region)}
      </div>

      <h3>{signal.headline}</h3>
      <p>{signal.thesis}</p>

      <div className="signalStatGrid">
        <div className="signalStatCell">
          <span>Trend</span>
          <strong className={anchorTone}>{humanizeStatus(signal.anchorTrend)}</strong>
        </div>
        <div className="signalStatCell">
          <span>Gap</span>
          <strong>{humanizeStatus(signal.gapState)}</strong>
        </div>
        <div className="signalStatCell">
          <span>Retest</span>
          <strong className={retestTone}>{retestLabel}</strong>
        </div>
        <div className="signalStatCell">
          <span>EMA 8 / 21</span>
          <strong>
            {formatTickerPrice(signal.ticker, signal.ema8)} / {formatTickerPrice(signal.ticker, signal.ema21)}
          </strong>
        </div>
      </div>

      <div className="confidenceRow">
        <div>
          <span>AI confidence</span>
          <strong>{signal.confidence}%</strong>
        </div>
        <div className="confidenceTrack">
          <div className="confidenceFill" style={{ width: `${signal.confidence}%` }} />
        </div>
      </div>

      <div className="signalContextRow">
        <div className="signalContextCell">
          <span>Route</span>
          <strong>{routeLabel}</strong>
        </div>
        <div className="signalContextCell">
          <span>Feed</span>
          <strong>{marketFeedLabel(marketSource)}</strong>
        </div>
      </div>

      <div className="signalFoot">
        <div>
          <strong>{signal.label}</strong>
          <span>{signal.exitRule}</span>
        </div>
        <button
          className="tradeButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFastTrade(signal);
          }}
        >
          Open Ticket
        </button>
      </div>
    </article>
  );
}

export function TradeCollectibleCard({ item, isActive, onSelect, onTrade }) {
  return (
    <article
      className={`collectibleCard interactiveCard ${isActive ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => handleInteractiveKey(event, () => onSelect(item))}
    >
      <div className="collectibleTop">
        <span className="collectibleCategory">{item.brand}</span>
        <span className={`signalBadge ${item.changePercent >= 0 ? "buy" : "sell"}`}>
          {item.category}
        </span>
      </div>

      <h3>{item.name}</h3>
      <p>{item.thesis || item.description}</p>

      <div className="collectibleStats">
        <div>
          <span>Price</span>
          <strong>{formatCollectiblePrice(item.price)}</strong>
        </div>
        <div>
          <span>Move</span>
          <strong className={positiveTone(item.changePercent)}>{item.changePercent}%</strong>
        </div>
        <div>
          <span>Liquidity</span>
          <strong>{item.liquidity}</strong>
        </div>
        <div>
          <span>Venue</span>
          <strong>{item.venue}</strong>
        </div>
      </div>

      <div className="panelActions">
        <button
          className="primaryButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTrade(item, "BUY");
          }}
        >
          Buy Ticket
        </button>
        <button
          className="ghostButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTrade(item, "SELL");
          }}
        >
          Sell Ticket
        </button>
      </div>
    </article>
  );
}

export function TechnicalSummaryPanel({ signal }) {
  const technical = signal?.technicalSummary;
  const [selectedTimeframeId, setSelectedTimeframeId] = useState("1h");

  if (!technical) {
    return null;
  }

  const timeframes = technical.timeframes?.length
    ? technical.timeframes
    : [{ id: "base", label: technical.interval, ...technical }];
  const activeTimeframe =
    timeframes.find((entry) => entry.id === selectedTimeframeId) || timeframes[0];
  const fibonacci = technical.fibonacci || null;
  const volumeProfile = activeTimeframe.volumeProfile || technical.volumeProfile || null;
  const rsiTone = technicalTone(activeTimeframe.rsi.signal);
  const rsiZone = rsiZoneLabel(activeTimeframe.rsi.value);
  const bannerClass =
    volumeProfile?.tone === "warning" || volumeProfile?.tone === "negative"
      ? "statusBanner warningBanner"
      : "statusBanner subtleBanner";

  return (
    <section className="panel technicalPanel">
      <div className="panelHeader">
        <div>
          <h2>Technical Pulse</h2>
          <p>Momentum summary for the active crypto setup, built from our own market series.</p>
        </div>
        <div className="headerStatus">
          <span>Timeframe</span>
          <strong>{activeTimeframe.label}</strong>
        </div>
      </div>

      <div className="technicalTabs" role="tablist" aria-label="Crypto technical timeframes">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe.id}
            type="button"
            className={`technicalTab ${activeTimeframe.id === timeframe.id ? "active" : ""}`}
            onClick={() => setSelectedTimeframeId(timeframe.id)}
          >
            <span className="technicalTabText">{timeframe.label}</span>
            <strong className={`technicalTabSignal ${technicalTone(timeframe.summary)}`}>
              {timeframe.summary}
            </strong>
          </button>
        ))}
      </div>

      {volumeProfile ? (
        <div className={bannerClass}>
          <strong>{volumeProfile.stance}</strong>
          <span>{volumeProfile.recommendation}</span>
        </div>
      ) : null}

      <div className="technicalHero">
        <div className="technicalHeadline">
          <span>From a technical analysis perspective</span>
          <h3>{signal.label}: {activeTimeframe.summary}</h3>
          <p>{activeTimeframe.narrative}</p>
        </div>

        <div className="technicalSnapshot">
          <div className={`technicalRsiHero ${rsiTone}`}>
            <div className="technicalRsiHeroTop">
              <span>RSI indicator</span>
              <strong>{activeTimeframe.rsi.value}</strong>
            </div>
            <div className="technicalRsiHeroMeta">
              <strong>{activeTimeframe.rsi.signal}</strong>
              <small>{rsiZone} zone on the active {activeTimeframe.label} chart.</small>
            </div>
            <div className="technicalRsiTrack">
              <div
                className={`technicalRsiFill ${rsiTone}`}
                style={{ width: `${Math.max(0, Math.min(100, activeTimeframe.rsi.value))}%` }}
              />
            </div>
            <div className="technicalScale">
              <span>0</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>100</span>
            </div>
          </div>

          <div className="technicalStat">
            <span>Moving averages</span>
            <strong className={technicalTone(activeTimeframe.summary)}>
              {activeTimeframe.buyCount} Buy | {activeTimeframe.sellCount} Sell
            </strong>
          </div>
          <div className="technicalStat">
            <span>RSI ({activeTimeframe.rsi.period})</span>
            <strong className={rsiTone}>
              {activeTimeframe.rsi.value} | {activeTimeframe.rsi.signal}
            </strong>
          </div>
          {volumeProfile?.mfi ? (
            <div className="technicalStat">
              <span>MFI ({volumeProfile.mfi.period})</span>
              <strong className={technicalTone(volumeProfile.mfi.signal)}>
                {volumeProfile.mfi.value} | {volumeProfile.mfi.signal}
              </strong>
            </div>
          ) : null}
        </div>
      </div>

      <div className="technicalGrid">
        <article className="technicalCard">
          <div className="technicalCardHeader">
            <h3>How do the moving averages currently stand?</h3>
            <span>
              {activeTimeframe.buyCount + activeTimeframe.sellCount + activeTimeframe.neutralCount} tracked
            </span>
          </div>
          <p>
            The moving averages for {signal.label} currently show {activeTimeframe.buyCount} buy signals,
            {` ${activeTimeframe.sellCount} sell signals, and ${activeTimeframe.neutralCount} neutral readings.`}
          </p>

          <div className="technicalRows">
            {activeTimeframe.movingAverages.map((entry) => (
              <div className="technicalRow" key={entry.label}>
                <span>{entry.label}</span>
                <strong>{entry.value == null ? "Waiting" : formatTickerPrice(signal.ticker, entry.value)}</strong>
                <em className={technicalTone(entry.signal)}>{entry.signal}</em>
              </div>
            ))}
          </div>
        </article>

        {volumeProfile ? (
          <article className="technicalCard">
            <div className="technicalCardHeader">
              <h3>How does the volume profile look?</h3>
              <span>{volumeProfile.dataQuality === "price-and-volume" ? "Price + volume" : "Price-first"}</span>
            </div>
            <p>{volumeProfile.narrative}</p>

            <div className="technicalRows">
              <div className="technicalRow">
                <span>Stance</span>
                <strong>{volumeProfile.stance}</strong>
                <em className={technicalTone(volumeProfile.stance)}>
                  {volumeProfile.tone === "positive"
                    ? "Trend healthy"
                    : volumeProfile.tone === "negative"
                      ? "Breakdown watch"
                      : volumeProfile.tone === "warning"
                        ? "Protect profit"
                        : "Wait for confirmation"}
                </em>
              </div>
              <div className="technicalRow">
                <span>Rally</span>
                <strong>{volumeProfile.rallyParticipation}</strong>
                <em className={technicalTone(volumeProfile.rallyParticipation)}>
                  {volumeProfile.volumeChangePercent == null ? "Volume unavailable" : `${volumeProfile.volumeChangePercent}% vs prior window`}
                </em>
              </div>
              <div className="technicalRow">
                <span>Flow</span>
                <strong>{volumeProfile.followThrough}</strong>
                <em className={technicalTone(volumeProfile.followThrough)}>
                  {volumeProfile.mfi.value} MFI
                </em>
              </div>
              <div className="technicalRow">
                <span>Levels</span>
                <strong>
                  {volumeProfile.supportLevel == null || volumeProfile.resistanceLevel == null
                    ? "Waiting"
                    : `${formatTickerPrice(signal.ticker, volumeProfile.supportLevel)} / ${formatTickerPrice(signal.ticker, volumeProfile.resistanceLevel)}`}
                </strong>
                <em>Support / Resistance</em>
              </div>
            </div>
          </article>
        ) : null}

        {fibonacci ? (
          <article className="technicalCard">
            <div className="technicalCardHeader">
              <h3>Where are the Fibonacci pivots?</h3>
              <span>Report dated {fibonacci.reportDate}</span>
            </div>
            <p>{fibonacci.currentContext}</p>

            <div className="technicalRows">
              <div className="technicalRow">
                <span>61.8%</span>
                <strong>{formatTickerPrice(signal.ticker, fibonacci.retracement618.price)}</strong>
                <em>Immediate resistance</em>
              </div>
              <div className="technicalRow">
                <span>80k</span>
                <strong>{formatTickerPrice(signal.ticker, fibonacci.psychologicalBarrier.price)}</strong>
                <em>Psychological wall</em>
              </div>
              <div className="technicalRow">
                <span>Pivot</span>
                <strong>{formatTickerPrice(signal.ticker, fibonacci.technicalPivot.price)}</strong>
                <em>Primary take-profit zone</em>
              </div>
              <div className="technicalRow">
                <span>Support</span>
                <strong>
                  {formatTickerPrice(signal.ticker, fibonacci.correctionZone.low)} / {formatTickerPrice(signal.ticker, fibonacci.correctionZone.high)}
                </strong>
                <em>Correction band</em>
              </div>
              <div className="technicalRow">
                <span>Ext 1</span>
                <strong>{formatTickerPrice(signal.ticker, fibonacci.extensions[0].price)}</strong>
                <em>127.2%</em>
              </div>
              <div className="technicalRow">
                <span>Ext 2</span>
                <strong>{formatTickerPrice(signal.ticker, fibonacci.extensions[1].price)}</strong>
                <em>161.8%</em>
              </div>
            </div>
          </article>
        ) : null}

        <article className="technicalCard">
          <div className="technicalCardHeader">
            <h3>What is the current RSI picture?</h3>
            <span>Relative strength</span>
          </div>
          <p>
            The current RSI for {signal.label} is {activeTimeframe.rsi.value}, which reads as{" "}
            {activeTimeframe.rsi.signal.toLowerCase()} on the active {activeTimeframe.label} chart.
          </p>

          <div className="technicalRsiMeter">
            <div className="technicalRsiTrack">
              <div
                className={`technicalRsiFill ${technicalTone(activeTimeframe.rsi.signal)}`}
                style={{ width: `${Math.max(0, Math.min(100, activeTimeframe.rsi.value))}%` }}
              />
            </div>
            <div className="technicalScale">
              <span>0</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>100</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export function ConnectorCard({
  provider,
  timeZone,
  valrForm,
  busyKey,
  onValrFieldChange,
  onSaveValr,
  onTest,
  onSync,
  onDisconnect,
}) {
  const isValr = provider.id === "valr";
  const fundedBalances = (provider.accountSnapshot?.balances || []).filter(
    (entry) => Math.abs(entry.total) > 0,
  );

  return (
    <article className="connectorCard">
      <div className="connectorCardHeader">
        <div>
          <span className="connectorDesk">{labelDesk(provider.desk)}</span>
          <h3>{provider.name}</h3>
        </div>
        <div className={`connectorStatus ${statusTone(provider.status)}`}>
          {humanizeStatus(provider.status)}
        </div>
      </div>

      <p className="connectorNotes">{provider.notes}</p>

      <div className="connectorMetaGrid">
        <div>
          <span>Auth</span>
          <strong>{humanizeStatus(provider.authType)}</strong>
        </div>
        <div>
          <span>Configured</span>
          <strong>{provider.configured ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Last test</span>
          <strong>{formatDateTime(provider.lastTestAt, timeZone)}</strong>
        </div>
        <div>
          <span>Last sync</span>
          <strong>{formatDateTime(provider.lastSyncAt, timeZone)}</strong>
        </div>
      </div>

      {provider.lastError ? <div className="statusBanner">{provider.lastError}</div> : null}

      {isValr ? (
        <div className="connectorForm">
          <div className="connectorSavedState">
            <span>Saved API key</span>
            <strong>{provider.config.apiKeyMasked || "None saved yet"}</strong>
            <small>
              {provider.config.hasSecret ? "Secret stored on the server." : "No secret stored yet."}
            </small>
          </div>

          <div className="connectorFieldGrid">
            <label className="formField">
              <span>API Key</span>
              <input
                type="text"
                value={valrForm.apiKey}
                onChange={(event) => onValrFieldChange("apiKey", event.target.value)}
                placeholder="Paste VALR API key"
              />
            </label>

            <label className="formField">
              <span>API Secret</span>
              <input
                type="password"
                value={valrForm.apiSecret}
                onChange={(event) => onValrFieldChange("apiSecret", event.target.value)}
                placeholder="Paste VALR API secret"
              />
            </label>
          </div>

          <label className="formField">
            <span>Preferred BTC Pair</span>
            <select
              value={valrForm.preferredPair}
              onChange={(event) => onValrFieldChange("preferredPair", event.target.value)}
            >
              {VALR_PAIR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="formField">
            <span>Subaccount ID (optional)</span>
            <input
              type="text"
              value={valrForm.subAccountId}
              onChange={(event) => onValrFieldChange("subAccountId", event.target.value)}
              placeholder="Primary account by default"
            />
          </label>
        </div>
      ) : (
        <div className="connectorPlaceholder">
          {provider.availability === "unsupported"
            ? "This provider is tracked here so the desk stays visible, but live API sync is not available yet."
            : "This provider is mapped into the connector architecture, but it still needs its dedicated OAuth or gateway flow before live testing and sync can run here."}
        </div>
      )}

      <div className="panelActions">
        {isValr ? (
          <button
            type="button"
            className="primaryButton"
            onClick={onSaveValr}
            disabled={busyKey === `${provider.id}:save`}
          >
            {busyKey === `${provider.id}:save` ? "Saving..." : "Save Credentials"}
          </button>
        ) : null}
        <button
          type="button"
          className="ghostButton"
          onClick={() => onTest(provider.id)}
          disabled={busyKey === `${provider.id}:test`}
        >
          {busyKey === `${provider.id}:test` ? "Testing..." : "Test Connection"}
        </button>
        <button
          type="button"
          className="ghostButton"
          onClick={() => onSync(provider.id)}
          disabled={busyKey === `${provider.id}:sync`}
        >
          {busyKey === `${provider.id}:sync` ? "Syncing..." : "Sync Balances"}
        </button>
        {isValr ? (
          <button
            type="button"
            className="ghostButton"
            onClick={() => onDisconnect(provider.id)}
            disabled={busyKey === `${provider.id}:disconnect`}
          >
            {busyKey === `${provider.id}:disconnect` ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : null}
        <button
          type="button"
          className="ghostButton"
          onClick={() => openExternal(provider.docsUrl)}
        >
          Open Docs
        </button>
      </div>

      {provider.accountSnapshot ? (
        <div className="connectorSnapshot">
          <div className="connectorSnapshotStats">
            <div>
              <span>Funded assets</span>
              <strong>{provider.accountSnapshot.fundedAssets}</strong>
            </div>
            <div>
              <span>Total balances</span>
              <strong>{provider.accountSnapshot.totalAssets}</strong>
            </div>
          </div>

          {fundedBalances.length ? (
            <div className="tableShell">
              <div className="tableHeaderRow history">
                <span>Asset</span>
                <span>Available</span>
                <span>Reserved</span>
                <span>Total</span>
                <span>Fetched</span>
              </div>

              {fundedBalances.slice(0, 8).map((entry) => (
                <div className="tableRow history" key={`${provider.id}-${entry.currency}`}>
                  <span>{entry.currency}</span>
                  <span>{formatConnectorAmount(entry.available)}</span>
                  <span>{formatConnectorAmount(entry.reserved)}</span>
                  <span>{formatConnectorAmount(entry.total)}</span>
                  <span>{formatDateTime(provider.accountSnapshot.fetchedAt, timeZone)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="connectorPlaceholder">
              The account synced successfully, but there are no funded balances to show yet.
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function OrderTicketModal({
  ticket,
  executionPlan,
  busy,
  onClose,
  onFieldChange,
  onPlanAction,
  onSubmit,
}) {
  if (!ticket) {
    return null;
  }

  const quantity = Math.max(0, Number(ticket.quantity || 0));
  const notional = Number((ticket.price * quantity).toFixed(2));
  const stopPrice = Number(ticket.stopPrice);
  const targetPrice = Number(ticket.targetPrice);
  const riskBudget = Number(ticket.riskBudget);
  const isCounterSignal =
    ticket.kind === "market" &&
    ticket.signalAction &&
    ticket.signalAction !== "NO TRADE" &&
    ticket.side !== ticket.signalAction;
  const validStopPrice = Number.isFinite(stopPrice) && stopPrice > 0 ? stopPrice : null;
  const validTargetPrice = Number.isFinite(targetPrice) && targetPrice > 0 ? targetPrice : null;
  const riskPerUnit = validStopPrice ? Math.abs(ticket.price - validStopPrice) : null;
  const rewardPerUnit = validTargetPrice ? Math.abs(validTargetPrice - ticket.price) : null;
  const riskAmount =
    Number.isFinite(riskPerUnit) && quantity > 0 ? Number((riskPerUnit * quantity).toFixed(2)) : null;
  const rewardAmount =
    Number.isFinite(rewardPerUnit) && quantity > 0 ? Number((rewardPerUnit * quantity).toFixed(2)) : null;
  const riskRewardRatio =
    Number.isFinite(riskPerUnit) &&
    riskPerUnit > 0 &&
    Number.isFinite(rewardPerUnit) &&
    rewardPerUnit > 0
      ? Number((rewardPerUnit / riskPerUnit).toFixed(2))
      : null;
  const suggestedQuantity =
    Number.isFinite(riskBudget) &&
    riskBudget > 0 &&
    Number.isFinite(riskPerUnit) &&
    riskPerUnit > 0
      ? Number((riskBudget / riskPerUnit).toFixed(ticket.kind === "collectible" ? 0 : 4))
      : null;
  const invalidPlan =
    validStopPrice &&
    validTargetPrice &&
    ((ticket.side === "BUY" && (validStopPrice >= ticket.price || validTargetPrice <= ticket.price)) ||
      (ticket.side === "SELL" && (validStopPrice <= ticket.price || validTargetPrice >= ticket.price)));
  const hasStructuredPlan = ticket.kind === "market" && Boolean(ticket.structuredPlans?.[ticket.side]);
  const isPlanOverride = ticket.planSource === "Ticket override";
  const priceLabel =
    ticket.kind === "collectible"
      ? formatCollectiblePrice(ticket.price)
      : formatTickerPrice(ticket.marketTicker, ticket.price);

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-ticket-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panelHeader">
          <div>
            <h2 id="order-ticket-title">Order Ticket</h2>
            <p>{ticket.summary}</p>
          </div>
          <button type="button" className="ghostButton" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="ticketHero">
          <div>
            <span className="collectibleCategory">
              {ticket.kind === "collectible" ? "Collectible order" : "Market order"}
            </span>
            <h3>{ticket.label}</h3>
          </div>
          <div className="priceCluster">
            <span>{priceLabel}</span>
            <small>{ticket.meta}</small>
          </div>
        </div>

        {executionPlan ? (
          <div className={`statusBanner ${executionPlan.mode === "live" ? "warningBanner" : "subtleBanner"}`}>
            <strong>{executionPlan.providerLabel}</strong>
            <span>
              {executionPlan.detail}
              {executionPlan.pair ? ` Pair: ${executionPlan.pair}.` : ""}
            </span>
          </div>
        ) : null}

        <div className="ticketBriefGrid">
          <div className="ticketBriefCard">
            <span>Desk</span>
            <strong>{ticket.deskLabel || (ticket.kind === "collectible" ? "Collectibles" : "Signals desk")}</strong>
            <small>{ticket.executionCue || "Use the desk rules to stay selective."}</small>
          </div>
          <div className="ticketBriefCard">
            <span>Timing</span>
            <strong>{ticket.kind === "collectible" ? "Longer hold" : "Execution window"}</strong>
            <small>{ticket.timingHint || "Wait for structure before committing capital."}</small>
          </div>
          <div className="ticketBriefCard">
            <span>Bias</span>
            <strong>{ticket.kind === "market" ? ticket.signalAction || ticket.side : ticket.side}</strong>
            <small>
              {isCounterSignal
                ? "You are trading against the current signal bias."
                : "This ticket is aligned with the currently selected workflow."}
            </small>
          </div>
          <div className="ticketBriefCard">
            <span>Note focus</span>
            <strong>{ticket.kind === "collectible" ? "Inventory thesis" : "Entry thesis"}</strong>
            <small>{ticket.notePlaceholder}</small>
          </div>
        </div>

        {ticket.planSource || ticket.planRationale ? (
          <div className="statusBanner subtleBanner">
            <strong>{ticket.planSource || "Trade plan source"}</strong>
            <span>{ticket.planRationale || "Using the desk plan defaults for this ticket."}</span>
          </div>
        ) : null}

        <div className="ticketPlanActions">
          {hasStructuredPlan ? (
            <button type="button" className="ghostButton" onClick={() => onPlanAction("structure")}>
              Use structure
            </button>
          ) : null}
          <button type="button" className="ghostButton" onClick={() => onPlanAction("preset")}>
            Use desk preset
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() => onPlanAction("base")}
            disabled={!isPlanOverride}
          >
            Reset edited levels
          </button>
        </div>

        {isCounterSignal ? (
          <div className="statusBanner warningBanner">
            <strong>Counter-signal trade</strong>
            <span>
              The live signal is currently {ticket.signalAction}. If you keep this side, make sure the note
              explains why you are fading the primary setup.
            </span>
          </div>
        ) : null}

        {invalidPlan ? (
          <div className="statusBanner warningBanner">
            <strong>Plan levels need a sanity check</strong>
            <span>
              For a {ticket.side} trade, the stop should sit on the risk side of entry and the target
              should sit on the reward side.
            </span>
          </div>
        ) : null}

        {ticket.warnings?.length ? (
          <div className="ticketChecklistBlock">
            <span>Desk cautions</span>
            <div className="ticketChecklist">
              {ticket.warnings.map((warning) => (
                <div key={warning} className="ticketChecklistRow">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="segmentedControl">
          {["BUY", "SELL"].map((side) => (
            <button
              type="button"
              key={side}
              className={ticket.side === side ? "active" : ""}
              onClick={() => onFieldChange("side", side)}
            >
              {side}
            </button>
          ))}
        </div>

        <div className="ticketForm">
          <label className="formField">
            <span>Quantity</span>
            <input
              type="number"
              min={ticket.kind === "collectible" ? "1" : ticket.minQuantity || "0.00000001"}
              max={ticket.kind === "collectible" ? "1000" : "100"}
              step={ticket.kind === "collectible" ? "1" : ticket.quantityStep || "0.00000001"}
              value={ticket.quantity}
              onChange={(event) => onFieldChange("quantity", event.target.value)}
            />
          </label>

          <div className="ticketPlanGrid">
            <label className="formField">
              <span>Stop</span>
              <input
                type="number"
                min="0"
                step={ticket.kind === "collectible" ? "0.01" : "0.0001"}
                value={ticket.stopPrice}
                onChange={(event) => onFieldChange("stopPrice", event.target.value)}
              />
            </label>

            <label className="formField">
              <span>Target</span>
              <input
                type="number"
                min="0"
                step={ticket.kind === "collectible" ? "0.01" : "0.0001"}
                value={ticket.targetPrice}
                onChange={(event) => onFieldChange("targetPrice", event.target.value)}
              />
            </label>

            <label className="formField">
              <span>Risk budget</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ticket.riskBudget}
                onChange={(event) => onFieldChange("riskBudget", event.target.value)}
              />
            </label>
          </div>

          <label className="formField">
            <span>Desk Note</span>
            <textarea
              rows="4"
              value={ticket.orderNote}
              onChange={(event) => onFieldChange("orderNote", event.target.value)}
              placeholder={ticket.notePlaceholder || "Why this entry makes sense right now."}
            />
          </label>
        </div>

        <div className="ticketMetaGrid">
          <div>
            <span>Setup</span>
            <strong>{ticket.setup}</strong>
          </div>
          <div>
            <span>Indicative Notional</span>
            <strong>
              {ticket.kind === "collectible"
                ? formatCollectiblePrice(notional)
                : formatTickerPrice(ticket.marketTicker, notional)}
            </strong>
          </div>
          <div>
            <span>Order Size</span>
            <strong>{formatQuantity(quantity, ticket.unitLabel)}</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>{ticket.side}</strong>
          </div>
        </div>

        <div className="ticketMetaGrid">
          <div>
            <span>Stop</span>
            <strong>{formatTradePrice(ticket, validStopPrice)}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{formatTradePrice(ticket, validTargetPrice)}</strong>
          </div>
          <div>
            <span>Risk amount</span>
            <strong>{formatTradePrice(ticket, riskAmount)}</strong>
          </div>
          <div>
            <span>Reward amount</span>
            <strong>{formatTradePrice(ticket, rewardAmount)}</strong>
          </div>
          <div>
            <span>R:R</span>
            <strong>{riskRewardRatio ? `${riskRewardRatio}R` : "--"}</strong>
          </div>
          <div>
            <span>Suggested size</span>
            <strong>
              {Number.isFinite(suggestedQuantity)
                ? formatQuantity(suggestedQuantity, ticket.unitLabel)
                : "--"}
            </strong>
          </div>
        </div>

        {ticket.checklist?.length ? (
          <div className="ticketChecklistBlock">
            <span>Pre-submit checklist</span>
            <div className="ticketChecklist">
              {ticket.checklist.map((item) => (
                <div key={item} className="ticketChecklistRow">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="panelActions">
          <button type="button" className="ghostButton" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={onSubmit}
            disabled={busy || invalidPlan || (executionPlan?.mode === "live" && !executionPlan.ready)}
          >
            {busy ? "Submitting..." : `${ticket.side} ${ticket.kind === "collectible" ? "Collectible" : "Position"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CloseTradeModal({ trade, busy, onClose, onFieldChange, onSubmit }) {
  if (!trade) {
    return null;
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-trade-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panelHeader">
          <div>
            <h2 id="close-trade-title">Close Position</h2>
            <p>Confirm the exit and add an optional note for the blotter.</p>
          </div>
          <button type="button" className="ghostButton" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="ticketHero">
          <div>
            <span className="collectibleCategory">
              {trade.assetClass === "collectible" ? "Collectible position" : "Market position"}
            </span>
            <h3>{trade.ticker}</h3>
          </div>
          <div className="priceCluster">
            <span>{formatTradePrice(trade, trade.currentPrice)}</span>
            <small>{formatQuantity(trade.quantity, trade.unitLabel)}</small>
          </div>
        </div>

        {trade.executionMode === "live" ? (
          <div className="statusBanner warningBanner">
            <strong>{providerLabel(trade.executionProvider)} live close</strong>
            <span>
              This exit will send a real closing market order
              {trade.executionPair ? ` on ${trade.executionPair}` : ""}.
            </span>
          </div>
        ) : (
          <div className="statusBanner subtleBanner">
            <strong>Paper close</strong>
            <span>This closes the position inside BrickAlpha only.</span>
          </div>
        )}

        <div className="ticketMetaGrid">
          <div>
            <span>Side</span>
            <strong>{trade.side}</strong>
          </div>
          <div>
            <span>PnL</span>
            <strong className={positiveTone(trade.pnl)}>{trade.pnl.toFixed(2)}%</strong>
          </div>
          <div>
            <span>Current Value</span>
            <strong>{formatTradePrice(trade, trade.currentValue)}</strong>
          </div>
          <div>
            <span>Setup</span>
            <strong>{trade.setup}</strong>
          </div>
        </div>

        <div className="ticketForm">
          <label className="formField">
            <span>Close Note</span>
            <textarea
              rows="4"
              value={trade.orderNote}
              onChange={(event) => onFieldChange(event.target.value)}
              placeholder="Locking gains, reducing risk, or rotating capital."
            />
          </label>
        </div>

        <div className="panelActions">
          <button type="button" className="ghostButton" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primaryButton" onClick={onSubmit} disabled={busy}>
            {busy ? "Closing..." : "Confirm Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PositionDetailCard({ trade, timeZone, onNavigate, onCloseTrade }) {
  if (!trade) {
    return (
      <EmptyState
        title="No position selected"
        body="Open a trade or click any portfolio row to inspect the full position detail."
      />
    );
  }

  const referencePrice =
    trade.status === "closed" ? trade.exitPrice || trade.currentPrice : trade.currentPrice;

  return (
    <section className="panel" id="position-detail">
      <div className="panelHeader">
        <div>
          <h2>{trade.ticker}</h2>
          <p>{trade.assetClass === "collectible" ? trade.note : trade.setup}</p>
        </div>
        <div className="priceCluster">
          <span>{formatTradePrice(trade, referencePrice)}</span>
          <small>{formatQuantity(trade.quantity, trade.unitLabel)}</small>
        </div>
      </div>

      <div className="stateGrid">
        <div>
          <span>Status</span>
          <strong>{trade.status}</strong>
        </div>
        <div>
          <span>Side</span>
          <strong>{trade.side}</strong>
        </div>
        <div>
          <span>Entry</span>
          <strong>{formatTradePrice(trade, trade.entryPrice)}</strong>
        </div>
        <div>
          <span>Current Value</span>
          <strong>{formatTradePrice(trade, trade.currentValue)}</strong>
        </div>
        <div>
          <span>PnL</span>
          <strong className={positiveTone(trade.pnl)}>{trade.pnl.toFixed(2)}%</strong>
        </div>
        <div>
          <span>PnL Amount</span>
          <strong className={positiveTone(trade.pnlAmount)}>{formatTradePrice(trade, trade.pnlAmount)}</strong>
        </div>
        <div>
          <span>Execution</span>
          <strong>
            {trade.executionMode === "live"
              ? venueDetailLabel(providerLabel(trade.executionProvider), trade.executionPair)
              : "BrickAlpha Paper"}
          </strong>
        </div>
        <div>
          <span>Remote Status</span>
          <strong>{trade.remoteStatus || (trade.executionMode === "live" ? "Submitted" : "Paper")}</strong>
        </div>
        <div>
          <span>Stop</span>
          <strong>{formatTradePrice(trade, trade.stopPrice)}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{formatTradePrice(trade, trade.targetPrice)}</strong>
        </div>
        <div>
          <span>R:R</span>
          <strong>{trade.riskRewardRatio ? `${trade.riskRewardRatio}R` : "--"}</strong>
        </div>
        <div>
          <span>Risk Budget</span>
          <strong>{formatTradePrice(trade, trade.riskBudget)}</strong>
        </div>
      </div>

      {trade.orderNote ? (
        <div className="positionNote">
          <span>Desk note</span>
          <p>{trade.orderNote}</p>
        </div>
      ) : null}

      {trade.executionMode === "live" && trade.exitAlert ? (
        <div className="positionNote">
          <span>Live exit alert</span>
          <p>
            {trade.exitAlert}
            {trade.exitAlertAt ? ` Triggered ${formatDateTime(trade.exitAlertAt, timeZone)}.` : ""}
          </p>
        </div>
      ) : null}

      {trade.status === "closed" ? (
        <div className="positionNote">
          <span>Exit</span>
          <p>
            {trade.exitReason || "Closed"} on{" "}
            {formatDateTime(trade.closedAt || trade.updatedAt, timeZone)}
          </p>
        </div>
      ) : null}

      <div className="panelActions">
        <button type="button" className="ghostButton" onClick={() => onNavigate(trade)}>
          Open Underlying
        </button>
        {trade.status === "open" ? (
          <button type="button" className="primaryButton" onClick={() => onCloseTrade(trade)}>
            Close Position
          </button>
        ) : null}
      </div>
    </section>
  );
}

