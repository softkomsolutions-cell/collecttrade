import { useCallback, useEffect, useMemo, useState } from "react";
import Chart from "./Chart";
import "./App.css";

const TOKEN_KEY = "collecttrade_token";
const DEFAULT_SETTINGS = {
  preferredRegion: "south-africa",
  timezone: "Africa/Johannesburg",
  riskMode: "balanced",
};

const NAV_ITEMS = [
  { id: "signals", label: "Alpha Signals" },
  { id: "collectibles", label: "Collectibles" },
  { id: "portfolio", label: "Portfolio" },
  { id: "settings", label: "Settings" },
];

const SCREEN_PREVIEWS = {
  signals: "Live 8/21 EMA setups with market context and execution tickets.",
  collectibles: "LEGO, Pokemon, and sealed inventory with dedicated trade flow.",
  portfolio: "Tracked positions, close workflow, and execution history.",
  settings: "Desk controls, health status, sources, and account preferences.",
};

const DEFAULT_PAGE = NAV_ITEMS[0].id;

const RAILS = [
  "IBKR (Global)",
  "Saxo (Wealth)",
  "VALR (Crypto)",
  "EasyEquities (JSE)",
];

function normalizePage(page) {
  const candidate = String(page || "").trim().toLowerCase();
  return NAV_ITEMS.some((item) => item.id === candidate) ? candidate : DEFAULT_PAGE;
}

function pageFromHash(hashValue) {
  const rawValue = String(hashValue || "")
    .replace(/^#\/?/, "")
    .split(/[/?]/)[0];

  return normalizePage(rawValue);
}

function formatDateTime(value, timeZone) {
  if (!value) {
    return "Waiting for data";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function formatTickerPrice(ticker, value) {
  if (typeof value !== "number") {
    return "--";
  }

  if (ticker === "BTCUSD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (ticker === "JSE40") {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (ticker === "USDZAR") {
    return `R${value.toFixed(4)}`;
  }

  return value.toFixed(5);
}

function formatCollectiblePrice(value) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function labelRegion(region) {
  if (region === "south-africa") {
    return "South Africa";
  }

  if (region === "global") {
    return "Global";
  }

  return "All Regions";
}

function actionTone(action) {
  if (action === "BUY") {
    return "buy";
  }

  if (action === "SELL") {
    return "sell";
  }

  return "hold";
}

function positiveTone(value) {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "muted";
}

function statusTone(status) {
  if (["online", "ok", "live"].includes(status)) {
    return "positive";
  }

  if (["simulated", "pending"].includes(status)) {
    return "muted";
  }

  return "negative";
}

function marketModeLabel(mode) {
  if (mode === "live") {
    return "Live";
  }

  if (mode === "hybrid") {
    return "Live + Fallback";
  }

  return "Simulated";
}

function handleInteractiveKey(event, action) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function openExternal(url) {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function formatTradePrice(trade, value) {
  if (typeof value !== "number") {
    return "--";
  }

  if (trade?.assetClass === "collectible") {
    return formatCollectiblePrice(value);
  }

  return formatTickerPrice(trade?.marketTicker, value);
}

function formatQuantity(value, unitLabel = "units") {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) {
    return `1 ${unitLabel}`;
  }

  const singular =
    unitLabel === "items" ? "item" : unitLabel === "units" ? "unit" : unitLabel;
  return `${quantity} ${quantity === 1 ? singular : unitLabel}`;
}

function EmptyState({ title, body }) {
  return (
    <div className="emptyState">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function SplashScreen({ ready, activePage, onEnter, onSelectPage }) {
  return (
    <div className="splashShell">
      <div className="splashPanel">
        <div className="authBrand">COLLECTRADE</div>
        <div className="splashEyebrow">TRADER WORKSPACE</div>
        <h1>Open the desk cleanly.</h1>
        <p className="authBlurb">
          A sharper start screen, clearer destinations, and dedicated app screens for signals,
          collectibles, portfolio, and settings.
        </p>

        <div className="splashGrid">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`splashCard ${activePage === item.id ? "active" : ""}`}
              onClick={() => onSelectPage(item.id)}
            >
              <span>{item.label}</span>
              <strong>/{item.id}</strong>
              <small>{SCREEN_PREVIEWS[item.id]}</small>
            </button>
          ))}
        </div>

        <div className="panelActions">
          <button
            type="button"
            className="primaryButton"
            onClick={onEnter}
            disabled={!ready}
          >
            {ready ? `Enter ${NAV_ITEMS.find((item) => item.id === activePage)?.label || "Workspace"}` : "Booting Workspace..."}
          </button>
          <div className="splashHint">
            {ready ? "Each option now has its own addressable screen." : "Restoring session and desk state..."}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthShell({
  authMode,
  authForm,
  authStatus,
  onModeChange,
  onSubmit,
  onFieldChange,
}) {
  return (
    <div className="authShell">
      <div className="authPanel">
        <div className="authBrand">COLLECTRADE</div>
        <h1>Trade the 8/21 setup with a cleaner desk.</h1>
        <p className="authBlurb">
          South Africa-aware news, collectible inventory, portfolio tracking, and a live EMA engine in one
          workspace.
        </p>

        <div className="segmentedControl authModeSwitch">
          <button
            type="button"
            className={authMode === "login" ? "active" : ""}
            onClick={() => onModeChange("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === "register" ? "active" : ""}
            onClick={() => onModeChange("register")}
          >
            Create account
          </button>
        </div>

        <form className="authForm" onSubmit={onSubmit}>
          {authMode === "register" ? (
            <label>
              <span>Name</span>
              <input
                type="text"
                value={authForm.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                placeholder="Darren"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => onFieldChange("password", event.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {authStatus ? <div className="statusBanner">{authStatus}</div> : null}

          <button className="primaryButton" type="submit">
            {authMode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SignalCard({ signal, isActive, onSelect, onFastTrade }) {
  return (
    <article
      className={`signalCard interactiveCard ${isActive ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(signal)}
      onKeyDown={(event) => handleInteractiveKey(event, () => onSelect(signal))}
    >
      <div className="signalCardTop">
        <span className={`signalBadge ${actionTone(signal.action)}`}>{signal.action}</span>
        <span className="signalMeta">{signal.rsi} RSI</span>
      </div>

      <div className="signalKicker">
        {signal.region === "south-africa" ? "SA macro intelligence" : "Global market intelligence"}
      </div>

      <h3>{signal.headline}</h3>
      <p>{signal.thesis}</p>

      <div className="confidenceRow">
        <div>
          <span>AI confidence</span>
          <strong>{signal.confidence}%</strong>
        </div>
        <div className="confidenceTrack">
          <div className="confidenceFill" style={{ width: `${signal.confidence}%` }} />
        </div>
      </div>

      <div className="signalFoot">
        <div>
          <strong>{signal.label}</strong>
          <span>
            {signal.setup} | {signal.gapState}
          </span>
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

function CollectibleCard({ item, isActive, onSelect, onTrade }) {
  return (
    <article
      className={`collectibleCard interactiveCard ${isActive ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => handleInteractiveKey(event, () => onSelect(item))}
    >
      <div className="collectibleTop">
        <span className="collectibleCategory">{item.category}</span>
        <span className={`signalBadge ${item.status === "Buy" ? "buy" : "hold"}`}>
          {item.status.toUpperCase()}
        </span>
      </div>

      <h3>{item.name}</h3>
      <p>{item.note}</p>

      <div className="collectibleStats">
        <div>
          <span>Market</span>
          <strong>{item.market}</strong>
        </div>
        <div>
          <span>Venue</span>
          <strong>{item.venue}</strong>
        </div>
        <div>
          <span>Indicative</span>
          <strong>{formatCollectiblePrice(item.price)}</strong>
        </div>
        <div>
          <span>Move</span>
          <strong className={positiveTone(item.changePercent)}>{item.changePercent.toFixed(1)}%</strong>
        </div>
      </div>

      <div className="signalFoot">
        <div>
          <strong>{item.confidence}% confidence</strong>
          <span>{item.status} collector flow</span>
        </div>
        <button
          className="tradeButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTrade(item);
          }}
        >
          Open Ticket
        </button>
      </div>
    </article>
  );
}

function OrderTicketModal({ ticket, busy, onClose, onFieldChange, onSubmit }) {
  if (!ticket) {
    return null;
  }

  const quantity = Math.max(1, Number(ticket.quantity || 1));
  const notional = Number((ticket.price * quantity).toFixed(2));
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
              min="1"
              max="1000"
              value={ticket.quantity}
              onChange={(event) => onFieldChange("quantity", event.target.value)}
            />
          </label>

          <label className="formField">
            <span>Desk Note</span>
            <textarea
              rows="4"
              value={ticket.orderNote}
              onChange={(event) => onFieldChange("orderNote", event.target.value)}
              placeholder="Why this entry makes sense right now."
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

        <div className="panelActions">
          <button type="button" className="ghostButton" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primaryButton" onClick={onSubmit} disabled={busy}>
            {busy ? "Submitting..." : `${ticket.side} ${ticket.kind === "collectible" ? "Collectible" : "Position"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseTradeModal({ trade, busy, onClose, onFieldChange, onSubmit }) {
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

function PositionDetailCard({ trade, timeZone, onNavigate, onCloseTrade }) {
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
      </div>

      {trade.orderNote ? (
        <div className="positionNote">
          <span>Desk note</span>
          <p>{trade.orderNote}</p>
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

export default function App() {
  const [page, setPage] = useState(() => pageFromHash(window.location.hash));
  const [selectedSignalTicker, setSelectedSignalTicker] = useState("");
  const [selectedCollectibleId, setSelectedCollectibleId] = useState("");
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authStatus, setAuthStatus] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [signalsResponse, setSignalsResponse] = useState({
    generatedAt: null,
    leadSignal: null,
    signals: [],
    marketData: {
      provider: "Simulator",
      mode: "simulated",
      interval: "1h",
      lastSuccessAt: null,
      sourceStatus: [],
    },
    strategyRules: [],
  });
  const [newsResponse, setNewsResponse] = useState({
    refreshedAt: null,
    items: [],
    sources: [],
    sourceStatus: [],
  });
  const [collectibles, setCollectibles] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [targets, setTargets] = useState([]);
  const [targetInput, setTargetInput] = useState("");
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [tradeStatus, setTradeStatus] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [orderTicket, setOrderTicket] = useState(null);
  const [closeTicket, setCloseTicket] = useState(null);
  const [tradeActionBusy, setTradeActionBusy] = useState(false);
  const [health, setHealth] = useState({
    services: {},
    metrics: {},
    sources: [],
  });

  const navigateToPage = useCallback((nextPage, replace = false) => {
    const normalizedPage = normalizePage(nextPage);
    setPage(normalizedPage);

    const nextHash = `#/${normalizedPage}`;
    if (window.location.hash === nextHash) {
      return normalizedPage;
    }

    if (replace) {
      window.history.replaceState(null, "", nextHash);
    } else {
      window.history.pushState(null, "", nextHash);
    }

    return normalizedPage;
  }, []);

  const jumpToPageSection = useCallback((nextPage, sectionId) => {
    navigateToPage(nextPage);
    if (!sectionId) {
      return;
    }

    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, [navigateToPage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSplashVisible(false);
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setPage(pageFromHash(window.location.hash));
    };

    if (!window.location.hash) {
      window.history.replaceState(null, "", `#/${DEFAULT_PAGE}`);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    const activeScreen = NAV_ITEMS.find((item) => item.id === page);
    document.title = `Collecttrade | ${activeScreen?.label || "Workspace"}`;
  }, [page]);

  const clearAuth = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setAuthToken("");
    setCurrentUser(null);
    setAuthChecked(true);
    setPortfolio([]);
    setTargets([]);
    setSelectedTradeId("");
    setOrderTicket(null);
    setCloseTicket(null);
    setTradeStatus("");
  }, []);

  const apiJson = useCallback(
    async (url, options = {}, requiresAuth = false) => {
      const headers = new Headers(options.headers || {});
      const config = {
        ...options,
        headers,
      };

      if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
        config.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }

      if (requiresAuth) {
        if (!authToken) {
          throw new Error("unauthorized");
        }
        headers.set("Authorization", `Bearer ${authToken}`);
      }

      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "request_failed");
      }

      return data;
    },
    [authToken],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!authToken) {
        setAuthChecked(true);
        return;
      }

      try {
        const data = await apiJson("/api/auth/me", {}, true);
        if (cancelled) {
          return;
        }
        setCurrentUser(data.user);
        setAppSettings(data.settings || DEFAULT_SETTINGS);
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [authToken, apiJson, clearAuth]);

  const refreshCore = useCallback(async () => {
    const [signalData, healthData, portfolioData] = await Promise.all([
      apiJson("/api/signals"),
      apiJson("/api/health"),
      apiJson("/api/portfolio", {}, true),
    ]);

    setSignalsResponse(signalData);
    setHealth(healthData);
    setPortfolio(portfolioData);
  }, [apiJson]);

  const refreshContext = useCallback(async () => {
    const [newsData, collectiblesData, settingsData, targetsData] = await Promise.all([
      apiJson(`/api/news?region=${encodeURIComponent(appSettings.preferredRegion)}`),
      apiJson("/api/collectibles"),
      apiJson("/api/settings", {}, true),
      apiJson("/api/news/targets", {}, true),
    ]);

    setNewsResponse(newsData);
    setCollectibles(collectiblesData.items || []);
    setAppSettings(settingsData.settings || DEFAULT_SETTINGS);
    setTargets(targetsData.items || []);
  }, [apiJson, appSettings.preferredRegion]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await refreshCore();
      } catch (error) {
        if (!cancelled) {
          if (error.message === "unauthorized") {
            clearAuth();
            return;
          }
          setTradeStatus("Core trading data is taking a moment to refresh.");
        }
      }
    };

    run();
    const intervalId = window.setInterval(run, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser, refreshCore, clearAuth]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await refreshContext();
      } catch (error) {
        if (!cancelled) {
          if (error.message === "unauthorized") {
            clearAuth();
            return;
          }
          setSettingsStatus("Context data is refreshing. Try again in a moment.");
        }
      }
    };

    run();
    const intervalId = window.setInterval(run, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser, refreshContext, clearAuth]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthStatus("");

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = {
        email: authForm.email.trim(),
        password: authForm.password,
      };

      if (authMode === "register") {
        payload.name = authForm.name.trim();
      }

      const data = await apiJson(endpoint, {
        method: "POST",
        body: payload,
      });

      window.localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setAppSettings(data.settings || DEFAULT_SETTINGS);
      setAuthForm({ name: "", email: "", password: "" });
      setAuthStatus(authMode === "login" ? "Welcome back." : "Account created.");
    } catch (error) {
      const messages = {
        invalid_credentials: "That email/password pair does not match our records.",
        email_in_use: "That email is already in use.",
        password_too_short: "Use at least 8 characters for the password.",
        name_too_short: "Add the account name you want to trade under.",
        invalid_email: "Use a valid email address.",
      };

      setAuthStatus(messages[error.message] || "We could not complete that request.");
    }
  };

  const handleLogout = () => {
    clearAuth();
    setAuthStatus("");
    setSettingsStatus("");
    setTradeStatus("");
  };

  const handleSignalSelect = useCallback(
    (signal) => {
      setSelectedSignalTicker(signal.ticker);
      jumpToPageSection("signals", "chart-panel");
    },
    [jumpToPageSection],
  );

  const openMarketTicket = useCallback((signal, side = signal.action === "SELL" ? "SELL" : "BUY") => {
    setSelectedSignalTicker(signal.ticker);
    setOrderTicket({
      kind: "market",
      marketTicker: signal.ticker,
      label: signal.label,
      side,
      quantity: "1",
      orderNote: "",
      price: signal.price,
      setup: signal.setup,
      summary: signal.thesis,
      meta: `${signal.headline} | ${signal.gapState}`,
      unitLabel: "units",
    });
  }, []);

  const openCollectibleTicket = useCallback((item, side = "BUY") => {
    setSelectedCollectibleId(item.id);
    setOrderTicket({
      kind: "collectible",
      collectibleId: item.id,
      label: item.name,
      side,
      quantity: "1",
      orderNote: "",
      price: item.price,
      setup: `${item.category} collector flow`,
      summary: item.note,
      meta: `${item.category} | ${item.market}`,
      unitLabel: "items",
    });
  }, []);

  const handleFastTrade = useCallback(
    (signal) => {
      setTradeStatus("");
      openMarketTicket(signal);
    },
    [openMarketTicket],
  );

  const handleCollectibleTrade = useCallback(
    (item, side = "BUY") => {
      setTradeStatus("");
      openCollectibleTicket(item, side);
    },
    [openCollectibleTicket],
  );

  const handleCollectibleSelect = useCallback(
    (item) => {
      setSelectedCollectibleId(item.id);
      jumpToPageSection("collectibles", "collectibles-focus");
    },
    [jumpToPageSection],
  );

  const handleOrderTicketChange = useCallback((field, value) => {
    setOrderTicket((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]:
          field === "quantity"
            ? String(value).replace(/[^\d]/g, "").slice(0, 4) || "1"
            : value.slice(0, 240),
      };
    });
  }, []);

  const submitOrderTicket = async () => {
    if (!orderTicket) {
      return;
    }

    const quantity = Number(orderTicket.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setTradeStatus("Use a quantity of at least 1.");
      return;
    }

    setTradeActionBusy(true);
    setTradeStatus("");

    try {
      const url =
        orderTicket.kind === "collectible" ? "/api/collectibles/trades" : "/api/trades";
      const body =
        orderTicket.kind === "collectible"
          ? {
              collectibleId: orderTicket.collectibleId,
              side: orderTicket.side,
              quantity,
              orderNote: orderTicket.orderNote,
            }
          : {
              marketTicker: orderTicket.marketTicker,
              side: orderTicket.side,
              quantity,
              orderNote: orderTicket.orderNote,
            };

      const data = await apiJson(
        url,
        {
          method: "POST",
          body,
        },
        true,
      );

      setPortfolio(data.portfolio || []);
      setSelectedTradeId(String(data.trade?.id || ""));
      setOrderTicket(null);
      setTradeStatus(`${orderTicket.side} order opened on ${orderTicket.label}.`);
      jumpToPageSection("portfolio", "position-detail");
    } catch (error) {
      const messages = {
        unknown_market: "That market is not available right now.",
        unknown_collectible: "That collectible is not available right now.",
        invalid_quantity: "Quantity needs to be between 1 and 1000.",
      };
      setTradeStatus(messages[error.message] || "Trade could not be placed yet.");
    } finally {
      setTradeActionBusy(false);
    }
  };

  const handleCloseTrade = useCallback((trade) => {
    setSelectedTradeId(String(trade.id));
    setCloseTicket({
      tradeId: trade.id,
      ticker: trade.ticker,
      assetClass: trade.assetClass,
      currentPrice: trade.currentPrice,
      currentValue: trade.currentValue,
      quantity: trade.quantity,
      unitLabel: trade.unitLabel,
      side: trade.side,
      setup: trade.setup,
      pnl: Number(trade.pnl || 0),
      orderNote: "",
    });
  }, []);

  const submitCloseTrade = async () => {
    if (!closeTicket) {
      return;
    }

    setTradeActionBusy(true);
    setTradeStatus("");

    try {
      const data = await apiJson(
        `/api/trades/${closeTicket.tradeId}/close`,
        {
          method: "POST",
          body: {
            orderNote: closeTicket.orderNote,
          },
        },
        true,
      );

      setPortfolio(data.portfolio || []);
      setSelectedTradeId(String(closeTicket.tradeId));
      setCloseTicket(null);
      setTradeStatus(`Position closed on ${closeTicket.ticker}.`);
      jumpToPageSection("portfolio", "order-history");
    } catch (error) {
      const messages = {
        unknown_trade: "That position no longer exists.",
        trade_already_closed: "That position is already closed.",
      };
      setTradeStatus(messages[error.message] || "Position could not be closed yet.");
    } finally {
      setTradeActionBusy(false);
    }
  };

  const updateSettings = async (patch) => {
    setSettingsStatus("");
    try {
      const data = await apiJson(
        "/api/settings",
        {
          method: "PUT",
          body: patch,
        },
        true,
      );
      setAppSettings(data.settings || DEFAULT_SETTINGS);
      setSettingsStatus("Preferences saved.");
    } catch {
      setSettingsStatus("We could not save those settings just yet.");
    }
  };

  const addTarget = async () => {
    const target = targetInput.trim();
    if (!target) {
      return;
    }

    setSettingsStatus("");

    try {
      const data = await apiJson(
        "/api/news/targets",
        {
          method: "POST",
          body: { target },
        },
        true,
      );
      setTargets(data.items || []);
      setTargetInput("");
      setSettingsStatus("Web target saved.");
    } catch {
      setSettingsStatus("We could not save that target.");
    }
  };

  const leadSignal = signalsResponse.leadSignal || signalsResponse.signals[0] || null;
  const activeSignal =
    signalsResponse.signals.find((signal) => signal.ticker === selectedSignalTicker) || leadSignal;
  const activeCollectible =
    collectibles.find((item) => item.id === selectedCollectibleId) || collectibles[0] || null;
  const newsSourceMap = useMemo(
    () => Object.fromEntries((newsResponse.sources || []).map((source) => [source.id, source.url])),
    [newsResponse.sources],
  );
  const openTrades = useMemo(
    () => portfolio.filter((trade) => trade.status === "open"),
    [portfolio],
  );
  const closedTrades = useMemo(
    () => portfolio.filter((trade) => trade.status === "closed"),
    [portfolio],
  );
  const totalOpenPnl = useMemo(
    () => openTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0),
    [openTrades],
  );
  const activePortfolioTrade = useMemo(
    () =>
      portfolio.find((trade) => String(trade.id) === String(selectedTradeId)) ||
      openTrades[0] ||
      closedTrades[0] ||
      null,
    [portfolio, selectedTradeId, openTrades, closedTrades],
  );

  const handlePortfolioTradeSelect = useCallback(
    (trade) => {
      setSelectedTradeId(String(trade.id));
      jumpToPageSection("portfolio", "position-detail");
    },
    [jumpToPageSection],
  );

  const handlePortfolioTradeNavigate = useCallback(
    (trade) => {
      if (trade.assetClass === "collectible" && trade.collectibleId) {
        setSelectedCollectibleId(trade.collectibleId);
        jumpToPageSection("collectibles", "collectibles-focus");
        return;
      }

      if (trade.marketTicker) {
        setSelectedSignalTicker(trade.marketTicker);
        jumpToPageSection("signals", "chart-panel");
      }
    },
    [jumpToPageSection],
  );

  if (splashVisible || !authChecked) {
    return (
      <SplashScreen
        ready={authChecked}
        activePage={page}
        onEnter={() => setSplashVisible(false)}
        onSelectPage={(nextPage) => {
          navigateToPage(nextPage);
          if (authChecked) {
            setSplashVisible(false);
          }
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthShell
        authMode={authMode}
        authForm={authForm}
        authStatus={authStatus}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthStatus("");
        }}
        onSubmit={handleAuthSubmit}
        onFieldChange={(field, value) =>
          setAuthForm((current) => ({
            ...current,
            [field]: value,
          }))
        }
      />
    );
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <button
          type="button"
          className="brandLockup brandButton"
          onClick={() => setSplashVisible(true)}
        >
          <div className="brandMark">CT</div>
          <div>
            <div className="brandWordmark">COLLECTRADE</div>
            <div className="brandSub">Trader workspace</div>
          </div>
        </button>

        <nav className="sideNav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={page === item.id ? "active" : ""}
              onClick={() => navigateToPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="sidebarCard sidebarCardButton"
          onClick={() => jumpToPageSection("settings", "system-health")}
        >
          <span>AI status</span>
          <strong>Deep scanning active</strong>
          <small>Engine tick: {formatDateTime(health.metrics?.lastEngineTickAt, appSettings.timezone)}</small>
        </button>
      </aside>

      <div className="workspaceShell">
        <header className="topbar">
          <div className="metricStrip">
            <button
              type="button"
              className="metricBlock metricButton"
              onClick={() => {
                if (leadSignal) {
                  setSelectedSignalTicker(leadSignal.ticker);
                }
                jumpToPageSection("signals", "chart-panel");
              }}
            >
              <span>Lead market</span>
              <strong>{leadSignal?.label || "Waiting"}</strong>
            </button>
            <button
              type="button"
              className="metricBlock metricButton"
              onClick={() => {
                if (leadSignal) {
                  setSelectedSignalTicker(leadSignal.ticker);
                }
                jumpToPageSection("signals", "signals-grid");
              }}
            >
              <span>Signal</span>
              <strong>{leadSignal ? `${leadSignal.action} ${leadSignal.setup}` : "No setup yet"}</strong>
            </button>
            <button
              type="button"
              className="metricBlock metricButton"
              onClick={() => jumpToPageSection("portfolio", "open-positions")}
            >
              <span>Open positions</span>
              <strong>{openTrades.length}</strong>
            </button>
            <button
              type="button"
              className="metricBlock metricButton"
              onClick={() => jumpToPageSection("settings", "news-region")}
            >
              <span>Region</span>
              <strong>{labelRegion(appSettings.preferredRegion)}</strong>
            </button>
            <button
              type="button"
              className="metricBlock metricButton"
              onClick={() => jumpToPageSection("settings", "market-feed-status")}
            >
              <span>Feed</span>
              <strong>
                {signalsResponse.marketData?.provider || "Simulator"} |{" "}
                {marketModeLabel(signalsResponse.marketData?.mode)}
              </strong>
            </button>
          </div>

          <div className="topbarTools">
            <span className="livePill">API LIVE</span>
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                refreshCore();
                refreshContext();
              }}
            >
              Refresh
            </button>
            <div className="avatarCircle">{currentUser.name.charAt(0).toUpperCase()}</div>
            <button type="button" className="ghostButton" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        <main className="workspace">
          {tradeStatus ? <div className="statusBanner">{tradeStatus}</div> : null}

          {page === "signals" ? (
            <>
              <section className="pageHeader">
                <div>
                  <h1>Alpha Signals</h1>
                  <p>Live 8/21 EMA workflow with South Africa-aware macro context and disciplined exits.</p>
                </div>
                <div className="headerStatus">
                  <span>Market refresh</span>
                  <strong>
                    {formatDateTime(
                      signalsResponse.marketData?.lastSuccessAt || signalsResponse.generatedAt,
                      appSettings.timezone,
                    )}
                  </strong>
                </div>
              </section>

              <section className="panel chartPanel" id="chart-panel">
                <div className="panelHeader">
                  <div>
                    <h2>{activeSignal?.headline || "Waiting for the next setup"}</h2>
                    <p>{activeSignal?.thesis || "The engine is building its first live state."}</p>
                  </div>
                  <div className="priceCluster">
                    <span>{formatTickerPrice(activeSignal?.ticker, activeSignal?.price)}</span>
                    <small>
                      EMA8 {formatTickerPrice(activeSignal?.ticker, activeSignal?.ema8)} | EMA21{" "}
                      {formatTickerPrice(activeSignal?.ticker, activeSignal?.ema21)}
                    </small>
                  </div>
                </div>

                {activeSignal ? (
                  <Chart
                    priceSeries={activeSignal.chart.price}
                    ema8Series={activeSignal.chart.ema8}
                    ema21Series={activeSignal.chart.ema21}
                  />
                ) : (
                  <EmptyState
                    title="No chart yet"
                    body="The engine will render once it has enough market points."
                  />
                )}

                {activeSignal ? (
                  <div className="panelActions">
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={() => openMarketTicket(activeSignal, "BUY")}
                    >
                      Buy Ticket
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      onClick={() => openMarketTicket(activeSignal, "SELL")}
                    >
                      Sell Ticket
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      onClick={() => jumpToPageSection("portfolio", "position-detail")}
                    >
                      Review Portfolio
                    </button>
                  </div>
                ) : null}
              </section>

              <div className="splitGrid">
                <section className="panel">
                  <div className="panelHeader">
                    <div>
                      <h2>Strategy State</h2>
                      <p>Rules taken from your 8 and 21 EMA guide.</p>
                    </div>
                  </div>

                  <div className="ruleList">
                    {signalsResponse.strategyRules.map((rule) => (
                      <div className="ruleRow" key={rule}>
                        {rule}
                      </div>
                    ))}
                  </div>

                  {activeSignal ? (
                    <div className="stateGrid">
                      <div>
                        <span>Anchor trend</span>
                        <strong>{activeSignal.anchorTrend}</strong>
                      </div>
                      <div>
                        <span>Gap state</span>
                        <strong>{activeSignal.gapState}</strong>
                      </div>
                      <div>
                        <span>Retest</span>
                        <strong>{activeSignal.retest ? "Active" : "Not active"}</strong>
                      </div>
                      <div>
                        <span>Chop filter</span>
                        <strong>{activeSignal.chop ? "Avoid" : "Clear"}</strong>
                      </div>
                    </div>
                  ) : null}

                  {signalsResponse.marketData?.sourceStatus?.length ? (
                    <div className="healthList">
                      {signalsResponse.marketData.sourceStatus.map((source) => (
                        <div className="healthRow" key={source.ticker}>
                          <span>{source.label}</span>
                          <strong className={statusTone(source.status)}>
                            {source.status} | {source.provider}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="panel">
                  <div className="panelHeader">
                    <div>
                      <h2>Macro Feed</h2>
                      <p>{labelRegion(appSettings.preferredRegion)} headlines with honest timestamps.</p>
                    </div>
                  </div>

                  <div className="newsList">
                    {newsResponse.items.slice(0, 4).map((item) => {
                      const targetUrl = item.link || newsSourceMap[item.sourceId];
                      const interactiveProps = targetUrl
                        ? {
                            role: "button",
                            tabIndex: 0,
                            onClick: () => openExternal(targetUrl),
                            onKeyDown: (event) =>
                              handleInteractiveKey(event, () => openExternal(targetUrl)),
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
              </div>

              <section className="signalGrid" id="signals-grid">
                {signalsResponse.signals.map((signal) => (
                  <SignalCard
                    key={signal.ticker}
                    signal={signal}
                    isActive={activeSignal?.ticker === signal.ticker}
                    onSelect={handleSignalSelect}
                    onFastTrade={handleFastTrade}
                  />
                ))}
              </section>
            </>
          ) : null}

          {page === "collectibles" ? (
            <>
              <section className="pageHeader">
                <div>
                  <h1>Collectibles</h1>
                  <p>Real collectible flow: LEGO, Pokemon, sealed product, and graded inventory.</p>
                </div>
              </section>

              {activeCollectible ? (
                <section className="panel" id="collectibles-focus">
                  <div className="panelHeader">
                    <div>
                      <h2>{activeCollectible.name}</h2>
                      <p>{activeCollectible.note}</p>
                    </div>
                    <div className="priceCluster">
                      <span>{formatCollectiblePrice(activeCollectible.price)}</span>
                      <small>
                        {activeCollectible.category} | {activeCollectible.market}
                      </small>
                    </div>
                  </div>

                  <div className="stateGrid">
                    <div>
                      <span>Venue</span>
                      <strong>{activeCollectible.venue}</strong>
                    </div>
                    <div>
                      <span>Move</span>
                      <strong className={positiveTone(activeCollectible.changePercent)}>
                        {activeCollectible.changePercent.toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      <span>Confidence</span>
                      <strong>{activeCollectible.confidence}%</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{activeCollectible.status}</strong>
                    </div>
                  </div>

                  <div className="panelActions">
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={() => handleCollectibleTrade(activeCollectible, "BUY")}
                    >
                      Buy Ticket
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      onClick={() => handleCollectibleTrade(activeCollectible, "SELL")}
                    >
                      Sell Ticket
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      onClick={() => jumpToPageSection("portfolio", "open-positions")}
                    >
                      View Portfolio
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="collectibleGrid">
                {collectibles.map((item) => (
                  <CollectibleCard
                    key={item.id}
                    item={item}
                    isActive={activeCollectible?.id === item.id}
                    onSelect={handleCollectibleSelect}
                    onTrade={handleCollectibleTrade}
                  />
                ))}
              </section>
            </>
          ) : null}

          {page === "portfolio" ? (
            <>
              <section className="pageHeader">
                <div>
                  <h1>My Portfolio</h1>
                  <p>User-scoped order tracking, EMA-managed exits, and saved execution history.</p>
                </div>
              </section>

              <PositionDetailCard
                trade={activePortfolioTrade}
                timeZone={appSettings.timezone}
                onNavigate={handlePortfolioTradeNavigate}
                onCloseTrade={handleCloseTrade}
              />

              <section className="summaryGrid">
                <button type="button" className="summaryCard summaryCardButton" onClick={() => jumpToPageSection("portfolio", "open-positions")}>
                  <span>Open positions</span>
                  <strong>{openTrades.length}</strong>
                </button>
                <button type="button" className="summaryCard summaryCardButton" onClick={() => jumpToPageSection("portfolio", "order-history")}>
                  <span>Closed trades</span>
                  <strong>{closedTrades.length}</strong>
                </button>
                <button type="button" className="summaryCard summaryCardButton" onClick={() => jumpToPageSection("portfolio", "open-positions")}>
                  <span>Live PnL</span>
                  <strong className={positiveTone(totalOpenPnl)}>{totalOpenPnl.toFixed(2)}%</strong>
                </button>
                <button type="button" className="summaryCard summaryCardButton" onClick={() => jumpToPageSection("signals", "chart-panel")}>
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
                            <small>{trade.assetClass === "collectible" ? trade.category : trade.setup}</small>
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
                      body="Use Fast Trade from the Alpha Signals page to seed your portfolio."
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
                          <small>{trade.exitReason || trade.setup}</small>
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
          ) : null}

          {page === "settings" ? (
            <>
              <section className="pageHeader">
                <div>
                  <h1>Settings</h1>
                  <p>Account controls, news coverage, system health, and saved desk targets.</p>
                </div>
              </section>

              {settingsStatus ? <div className="statusBanner">{settingsStatus}</div> : null}

              <div className="splitGrid">
                <section className="panel" id="news-region">
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
                  </div>
                </section>

                <section className="panel" id="system-health">
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

              <div className="splitGrid">
                <section className="panel">
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
                  </div>
                </section>

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
              </div>

              <section className="panel" id="market-feed-status">
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

              <section className="panel">
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
            </>
          ) : null}
        </main>

        <OrderTicketModal
          ticket={orderTicket}
          busy={tradeActionBusy}
          onClose={() => setOrderTicket(null)}
          onFieldChange={handleOrderTicketChange}
          onSubmit={submitOrderTicket}
        />

        <CloseTradeModal
          trade={closeTicket}
          busy={tradeActionBusy}
          onClose={() => setCloseTicket(null)}
          onFieldChange={(value) =>
            setCloseTicket((current) => (current ? { ...current, orderNote: value.slice(0, 240) } : current))
          }
          onSubmit={submitCloseTrade}
        />
      </div>
    </div>
  );
}
