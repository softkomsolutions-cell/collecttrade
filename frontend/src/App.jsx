import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  DEFAULT_DESK,
  DEFAULT_EXECUTION_PROFILES,
  DEFAULT_PAGE,
  DEFAULT_SETTINGS,
  MARKET_DESKS,
  NAV_GROUPS,
  NAV_ITEMS,
  PAGE_SECTION_LINKS,
  RESEARCH_REPORTS,
  SCREEN_PREVIEWS,
  TOKEN_KEY,
} from "./appConfig";
import {
  buildHash,
  buildTicketPlanDefaults,
  defaultIntroIdForPage,
  executionPlanForSignal,
  formatTicketPlanInput,
  labelDesk,
  marketModeLabel,
  normalizeAppSettings,
  normalizeDesk,
  normalizePage,
  orderTicketPresetForDesk,
  parseHashState,
  providerLabel,
  readLaunchPreference,
  resolveTicketPlanMeta,
  statusTone,
  writeLaunchPreference,
  workspaceLabel,
} from "./appUtils";
import {
  AuthShell,
  BootSplash,
  EmptyState,
  LandingShell,
  SplashScreen,
} from "./components/appShell";

function lazyNamedExport(factory, exportName) {
  return lazy(() =>
    factory().then((module) => ({
      default: module[exportName],
    })),
  );
}

const TradeScreen = lazy(() => import("./components/tradeScreen"));
const HomeScreen = lazyNamedExport(() => import("./components/workspaceScreens"), "HomeScreen");
const NewsScreen = lazyNamedExport(() => import("./components/workspaceScreens"), "NewsScreen");
const ToolsScreen = lazyNamedExport(() => import("./components/workspaceScreens"), "ToolsScreen");
const CollectiblesScreen = lazyNamedExport(
  () => import("./components/workspaceScreens"),
  "CollectiblesScreen",
);
const PortfolioScreen = lazyNamedExport(
  () => import("./components/workspaceScreens"),
  "PortfolioScreen",
);
const ReportsScreen = lazyNamedExport(
  () => import("./components/workspaceScreens"),
  "ReportsScreen",
);
const ConnectionsScreen = lazyNamedExport(
  () => import("./components/workspaceScreens"),
  "ConnectionsScreen",
);
const SettingsScreen = lazyNamedExport(
  () => import("./components/workspaceScreens"),
  "SettingsScreen",
);
const OrderTicketModal = lazyNamedExport(
  () => import("./components/workspaceCards"),
  "OrderTicketModal",
);
const CloseTradeModal = lazyNamedExport(
  () => import("./components/workspaceCards"),
  "CloseTradeModal",
);

const EMPTY_SIGNALS_RESPONSE = {
  generatedAt: null,
  leadSignal: null,
  signals: [],
  marketData: {
    provider: "Simulator",
    mode: "simulated",
    interval: "1h",
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    sourceStatus: [],
  },
  strategyRules: [],
};

const EMPTY_NEWS_RESPONSE = {
  region: DEFAULT_SETTINGS.preferredRegion,
  refreshedAt: null,
  items: [],
  sources: [],
  sourceStatus: [],
};

const EMPTY_COLLECTIBLES_RESPONSE = {
  updatedAt: null,
  categories: [],
  brands: [],
  items: [],
  referenceShelves: [],
  partnerSources: [],
};

const EMPTY_COLLECTIBLE_PORTFOLIO = {
  items: [],
  transactions: [],
  summary: {},
};

const EMPTY_FEEDBACK_RESPONSE = {
  items: [],
  summary: {},
  permissions: { canManage: false },
};

const EMPTY_HEALTH = {
  ok: true,
  services: {},
  metrics: {},
  sources: [],
  marketSources: [],
  connectors: [],
};

const EMPTY_SHARE_STATUS = {
  status: "idle",
  provider: null,
  publicUrl: "",
  localUrl: "http://127.0.0.1:5000",
  startedAt: null,
  lastHeartbeatAt: null,
  notes: "No public share session yet.",
};

const INITIAL_AUTH_FORM = {
  name: "",
  email: "",
  password: "",
};

const INITIAL_VALR_FORM = {
  apiKey: "",
  apiSecret: "",
  preferredPair: DEFAULT_EXECUTION_PROFILES.crypto.pair,
  subAccountId: "",
};

const INITIAL_FEEDBACK_FORM = {
  title: "",
  area: "landing",
  type: "ux",
  severity: "medium",
  notes: "",
};

function deskForTicker(ticker) {
  const normalized = String(ticker || "").toUpperCase();
  if (["USDZAR", "EURUSD"].includes(normalized)) {
    return "forex";
  }
  if (["SPY", "QQQ", "GLD"].includes(normalized)) {
    return "etfs";
  }
  if (["BTCUSD", "BTCZAR", "BTCUSDT", "BTCUSDC"].includes(normalized)) {
    return "crypto";
  }
  if (["JSE40", "JTOPI"].includes(normalized)) {
    return "jse";
  }
  return "forex";
}

function filterSignalsByDesk(signals, desk) {
  if (desk === "all") {
    return signals;
  }
  return signals.filter((signal) => signal.desk === desk);
}

function filterNewsItemsByDesk(items, desk) {
  if (desk === "all") {
    return items;
  }

  return items.filter((item) => {
    const itemDesk = item.marketTicker ? deskForTicker(item.marketTicker) : null;
    if (itemDesk === desk) {
      return true;
    }

    if (desk === "jse") {
      return item.region === "south-africa";
    }

    if (desk === "forex") {
      return item.region === "south-africa" || item.sourceId === "fxstreet";
    }

    if (desk === "crypto") {
      return item.sourceId === "coindesk";
    }

    if (desk === "etfs") {
      return item.region === "global";
    }

    return false;
  });
}

function buildSourceMap(sources) {
  return Object.fromEntries(
    (sources || []).map((source) => [source.id, source.url]),
  );
}

function toPlanNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function buildMarketPlanSet(signal, side) {
  const preset = orderTicketPresetForDesk(signal.desk, "market");
  const skeleton = {
    kind: "market",
    desk: signal.desk,
    marketTicker: signal.ticker,
    price: Number(signal.price || 0),
  };
  const presetDefaults = buildTicketPlanDefaults(skeleton, preset, side);
  const presetPlan = {
    stopPrice: presetDefaults.stopPrice,
    targetPrice: presetDefaults.targetPrice,
    riskBudget: presetDefaults.riskBudget || preset.defaultRiskBudget || "",
    source: "Desk preset",
    rationale: "Using desk-default risk and reward spacing.",
  };
  const structuredEntry = side === "SELL" ? signal.tradePlan?.sell : signal.tradePlan?.buy;
  const structuredPlan = structuredEntry
    ? {
        stopPrice: formatTicketPlanInput(skeleton, structuredEntry.stopPrice),
        targetPrice: formatTicketPlanInput(skeleton, structuredEntry.targetPrice),
        riskBudget: preset.defaultRiskBudget || "",
        source: structuredEntry.source || "Signal structure",
        rationale:
          structuredEntry.rationale ||
          "Recent swing structure and the 21 EMA are framing this plan.",
      }
    : null;

  return {
    presetPlan,
    structuredPlan,
    support: signal.tradePlan?.support ?? signal.tradePlan?.recentLow ?? null,
    resistance: signal.tradePlan?.resistance ?? signal.tradePlan?.recentHigh ?? null,
  };
}

function applyTicketPlan(ticket, mode, side = ticket.side) {
  const structuredPlan = ticket.structuredPlans?.[side] || null;
  const presetPlan = ticket.presetPlans?.[side] || null;
  const basePlan =
    mode === "structure" ? structuredPlan || presetPlan : presetPlan || structuredPlan;

  if (!basePlan) {
    return ticket;
  }

  const nextTicket = {
    ...ticket,
    side,
    planMode: mode,
    stopPrice: basePlan.stopPrice,
    targetPrice: basePlan.targetPrice,
    riskBudget: basePlan.riskBudget || ticket.riskBudget,
    baseStopPrice: basePlan.stopPrice,
    baseTargetPrice: basePlan.targetPrice,
    basePlanSource: basePlan.source,
    basePlanRationale: basePlan.rationale,
  };

  return {
    ...nextTicket,
    ...resolveTicketPlanMeta(nextTicket, nextTicket.stopPrice, nextTicket.targetPrice),
  };
}

function buildMarketTicket(signal, side) {
  const preset = orderTicketPresetForDesk(signal.desk, "market");
  const buyPlanSet = buildMarketPlanSet(signal, "BUY");
  const sellPlanSet = buildMarketPlanSet(signal, "SELL");
  const structuredPlans = {
    BUY: buyPlanSet.structuredPlan,
    SELL: sellPlanSet.structuredPlan,
  };
  const presetPlans = {
    BUY: buyPlanSet.presetPlan,
    SELL: sellPlanSet.presetPlan,
  };
  const defaultMode = structuredPlans[side] ? "structure" : "preset";
  const basePlan = defaultMode === "structure" ? structuredPlans[side] : presetPlans[side];

  const ticket = {
    kind: "market",
    marketTicker: signal.ticker,
    label: signal.label,
    summary: signal.headline,
    meta: signal.exitRule,
    price: Number(signal.price || 0),
    desk: signal.desk,
    deskLabel: preset.deskLabel,
    side,
    signalAction: signal.action,
    setup: signal.setup,
    quantity: preset.defaultQuantity,
    unitLabel: preset.unitLabel,
    quantityStep: preset.quantityStep,
    minQuantity: preset.minQuantity,
    timingHint: preset.timingHint,
    notePlaceholder: preset.notePlaceholder,
    executionCue: preset.executionCue,
    warnings: preset.warnings,
    checklist: preset.checklist,
    orderNote: "",
    structuredPlans,
    presetPlans,
    support: signal.tradePlan?.support ?? null,
    resistance: signal.tradePlan?.resistance ?? null,
    planMode: defaultMode,
    stopPrice: basePlan?.stopPrice || "",
    targetPrice: basePlan?.targetPrice || "",
    riskBudget: basePlan?.riskBudget || preset.defaultRiskBudget || "",
    baseStopPrice: basePlan?.stopPrice || "",
    baseTargetPrice: basePlan?.targetPrice || "",
    basePlanSource: basePlan?.source || "Desk preset",
    basePlanRationale: basePlan?.rationale || "Using desk-default risk and reward spacing.",
  };

  return {
    ...ticket,
    ...resolveTicketPlanMeta(ticket, ticket.stopPrice, ticket.targetPrice),
  };
}

function buildCollectibleTicket(item, side) {
  const preset = orderTicketPresetForDesk("collectible", "collectible");
  const skeleton = {
    kind: "collectible",
    desk: "collectibles",
    marketTicker: item.id,
    price: Number(item.price || 0),
  };
  const buyPlan = buildTicketPlanDefaults(skeleton, preset, "BUY");
  const sellPlan = buildTicketPlanDefaults(skeleton, preset, "SELL");
  const presetPlans = {
    BUY: {
      ...buyPlan,
      source: "Inventory preset",
      rationale: "Using the slower collectible inventory risk template.",
    },
    SELL: {
      ...sellPlan,
      source: "Inventory preset",
      rationale: "Using the slower collectible inventory risk template.",
    },
  };
  const basePlan = presetPlans[side];
  const ticket = {
    kind: "collectible",
    collectibleId: item.id,
    label: item.name,
    summary: item.description,
    meta: item.category,
    price: Number(item.price || 0),
    desk: "collectibles",
    deskLabel: preset.deskLabel,
    side,
    signalAction: side,
    setup: item.category,
    quantity: preset.defaultQuantity,
    unitLabel: preset.unitLabel,
    quantityStep: preset.quantityStep,
    minQuantity: preset.minQuantity,
    timingHint: preset.timingHint,
    notePlaceholder: preset.notePlaceholder,
    executionCue: preset.executionCue,
    warnings: preset.warnings,
    checklist: preset.checklist,
    orderNote: "",
    structuredPlans: null,
    presetPlans,
    support: null,
    resistance: null,
    planMode: "preset",
    stopPrice: basePlan.stopPrice,
    targetPrice: basePlan.targetPrice,
    riskBudget: basePlan.riskBudget || preset.defaultRiskBudget || "",
    baseStopPrice: basePlan.stopPrice,
    baseTargetPrice: basePlan.targetPrice,
    basePlanSource: basePlan.source,
    basePlanRationale: basePlan.rationale,
  };

  return {
    ...ticket,
    ...resolveTicketPlanMeta(ticket, ticket.stopPrice, ticket.targetPrice),
  };
}

function buildMentorSummary(signal, leadNewsItem) {
  if (!signal) {
    return {
      action: "Stand by",
      setup: "No lead setup yet",
      rationale: "The desk is waiting for a cleaner signal before it promotes a trade idea.",
      invalidation: "No structure yet.",
    };
  }

  return {
    action: `${signal.action} ${signal.label}`,
    setup: signal.setup,
    rationale: leadNewsItem
      ? `${signal.thesis} Macro tape lead: ${leadNewsItem.sourceName}.`
      : signal.thesis,
    invalidation: signal.exitRule,
  };
}

function buildMentorChecklist(signal, leadNewsItem) {
  if (!signal) {
    return [
      "Wait for the desk to promote a clean lead setup.",
      "Check the macro tape before moving into the ticket.",
      "Keep the next trade small until the state is clearer.",
    ];
  }

  return [
    `Anchor trend is ${signal.anchorTrend}; avoid fighting the higher-level structure without a reason.`,
    signal.retest
      ? "A retest is active; confirm the hold before submitting the ticket."
      : "No retest yet; patience may improve the entry.",
    leadNewsItem
      ? `Macro tape lead: ${leadNewsItem.title}`
      : "Read the macro tape so the desk is not blind to the current story.",
    signal.exitRule,
  ];
}

function buildChartPlan(activeSignal, orderTicket) {
  if (!activeSignal) {
    return null;
  }

  const signalSupport = activeSignal.tradePlan?.support ?? null;
  const signalResistance = activeSignal.tradePlan?.resistance ?? null;

  if (
    orderTicket &&
    orderTicket.kind === "market" &&
    orderTicket.marketTicker === activeSignal.ticker
  ) {
    return {
      side: orderTicket.side,
      support: signalSupport,
      resistance: signalResistance,
      stopPrice: toPlanNumber(orderTicket.stopPrice),
      targetPrice: toPlanNumber(orderTicket.targetPrice),
      source: orderTicket.planSource,
      rationale: orderTicket.planRationale,
    };
  }

  const preferredSide =
    activeSignal.action === "SELL"
      ? "SELL"
      : activeSignal.action === "BUY"
        ? "BUY"
        : "BUY";
  const structuredEntry =
    preferredSide === "SELL" ? activeSignal.tradePlan?.sell : activeSignal.tradePlan?.buy;

  return {
    side: preferredSide,
    support: signalSupport,
    resistance: signalResistance,
    stopPrice: structuredEntry?.stopPrice ?? null,
    targetPrice: structuredEntry?.targetPrice ?? null,
    source: structuredEntry?.source || "Signal structure",
    rationale:
      structuredEntry?.rationale ||
      "The signal structure is framing the first stop and target idea.",
  };
}

function createRequestHeaders(token, hasBody) {
  const headers = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function requestJson(path, options = {}) {
  const { method = "GET", body, token } = options;
  const response = await fetch(path, {
    method,
    headers: createRequestHeaders(token, body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || response.statusText);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function LoadingShell({ message }) {
  return (
    <div className="authShell">
      <div className="authShellInner">
        <section className="authStage">
          <div className="authBrand">COLLECTRADE</div>
          <div className="splashEyebrow">RESTORING WORKSPACE</div>
          <h1>Opening the session cleanly.</h1>
          <p className="authBlurb">{message}</p>
        </section>
      </div>
    </div>
  );
}

function WorkspaceLoadingState({ label }) {
  return (
    <section className="panel">
      <EmptyState
        title={`Opening ${label}`}
        body="Loading this workspace on demand so the app shell stays lighter for the session."
      />
    </section>
  );
}

export default function App() {
  const initialHashState = useMemo(() => parseHashState(window.location.hash), []);
  const initialLaunchPreference = useMemo(() => readLaunchPreference(), []);
  const initialPage = window.location.hash
    ? initialHashState.page
    : initialLaunchPreference?.page || initialHashState.page || DEFAULT_PAGE;
  const initialDesk = window.location.hash
    ? initialHashState.desk
    : initialLaunchPreference?.desk || initialHashState.desk || DEFAULT_DESK;

  const [page, setPage] = useState(normalizePage(initialPage));
  const [activeDesk, setActiveDesk] = useState(normalizeDesk(initialDesk));
  const [authChecked, setAuthChecked] = useState(() => !window.localStorage.getItem(TOKEN_KEY));
  const [bootSplashVisible, setBootSplashVisible] = useState(true);
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [authStage, setAuthStage] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [authStatus, setAuthStatus] = useState("");
  const [authForm, setAuthForm] = useState(INITIAL_AUTH_FORM);
  const [splashVisible, setSplashVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [preAuthLaunch, setPreAuthLaunch] = useState({
    page: normalizePage(initialPage),
    desk: normalizeDesk(initialDesk),
    introId: initialLaunchPreference?.introId || defaultIntroIdForPage(initialPage),
    sectionId:
      initialLaunchPreference?.sectionId || PAGE_SECTION_LINKS[normalizePage(initialPage)]?.[0]?.id,
    landingId:
      initialLaunchPreference?.landingId || initialLaunchPreference?.introId || "collectibles",
  });
  const [pendingSectionTarget, setPendingSectionTarget] = useState(null);

  const [signalsResponse, setSignalsResponse] = useState(EMPTY_SIGNALS_RESPONSE);
  const [newsResponse, setNewsResponse] = useState(EMPTY_NEWS_RESPONSE);
  const [collectiblesResponse, setCollectiblesResponse] = useState(EMPTY_COLLECTIBLES_RESPONSE);
  const [collectiblePortfolio, setCollectiblePortfolio] = useState(EMPTY_COLLECTIBLE_PORTFOLIO);
  const [collectibleImports, setCollectibleImports] = useState([]);
  const [health, setHealth] = useState(EMPTY_HEALTH);
  const [portfolio, setPortfolio] = useState([]);
  const [targets, setTargets] = useState([]);
  const [targetInput, setTargetInput] = useState("");
  const [connectors, setConnectors] = useState([]);
  const [feedbackResponse, setFeedbackResponse] = useState(EMPTY_FEEDBACK_RESPONSE);
  const [shareStatus, setShareStatus] = useState(EMPTY_SHARE_STATUS);
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [feedbackForm, setFeedbackForm] = useState(INITIAL_FEEDBACK_FORM);
  const [feedbackBusyKey, setFeedbackBusyKey] = useState("");
  const [connectorBusyKey, setConnectorBusyKey] = useState("");
  const [tradeActionBusy, setTradeActionBusy] = useState(false);
  const [tradeStatus, setTradeStatus] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [chartUploadName, setChartUploadName] = useState("");
  const [valrForm, setValrForm] = useState(INITIAL_VALR_FORM);

  const [selectedSignalTicker, setSelectedSignalTicker] = useState(null);
  const [selectedCollectibleId, setSelectedCollectibleId] = useState(null);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [orderTicket, setOrderTicket] = useState(null);
  const [closeTicket, setCloseTicket] = useState(null);
  const [collectibleQuery, setCollectibleQuery] = useState("");
  const [collectibleBrand, setCollectibleBrand] = useState("all");
  const [collectibleCategory, setCollectibleCategory] = useState("all");

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setAuthToken("");
    setCurrentUser(null);
    setAuthStage("landing");
    setAuthMode("login");
    setAuthStatus("");
    setSplashVisible(false);
    setPortfolio([]);
    setCollectiblePortfolio(EMPTY_COLLECTIBLE_PORTFOLIO);
    setCollectibleImports([]);
    setTargets([]);
    setConnectors([]);
    setFeedbackResponse(EMPTY_FEEDBACK_RESPONSE);
    setShareStatus(EMPTY_SHARE_STATUS);
    setAppSettings(DEFAULT_SETTINGS);
  }, []);

  const syncHashRoute = useCallback(
    (nextPage, nextDesk) => {
      const nextHash = buildHash(nextPage, nextDesk);
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    },
    [],
  );

  const rememberLaunch = useCallback((preference) => {
    writeLaunchPreference(preference);
  }, []);

  const navigateToPage = useCallback(
    (nextPage, reopenIntro = false, nextDesk = activeDesk) => {
      if (reopenIntro) {
        setSplashVisible(true);
        return;
      }

      const normalizedPage = normalizePage(nextPage);
      const normalizedDesk = normalizeDesk(nextDesk);
      setPage(normalizedPage);
      setActiveDesk(normalizedDesk);
      syncHashRoute(normalizedPage, normalizedDesk);
      if (currentUser) {
        rememberLaunch({
          page: normalizedPage,
          desk: normalizedDesk,
          introId: defaultIntroIdForPage(normalizedPage),
          sectionId: PAGE_SECTION_LINKS[normalizedPage]?.[0]?.id || null,
        });
      }
    },
    [activeDesk, currentUser, rememberLaunch, syncHashRoute],
  );

  const jumpToPageSection = useCallback(
    (nextPage, sectionId, nextDesk = activeDesk) => {
      const normalizedPage = normalizePage(nextPage);
      const normalizedDesk = normalizeDesk(nextDesk);
      setPendingSectionTarget({
        page: normalizedPage,
        desk: normalizedDesk,
        sectionId,
      });
      setPage(normalizedPage);
      setActiveDesk(normalizedDesk);
      syncHashRoute(normalizedPage, normalizedDesk);
      if (currentUser) {
        rememberLaunch({
          page: normalizedPage,
          desk: normalizedDesk,
          introId: defaultIntroIdForPage(normalizedPage),
          sectionId,
        });
      }
    },
    [activeDesk, currentUser, rememberLaunch, syncHashRoute],
  );

  const refreshCore = useCallback(async () => {
    const region = appSettings.preferredRegion || DEFAULT_SETTINGS.preferredRegion;
    const [signalsData, newsData, collectiblesData, healthData] = await Promise.all([
      requestJson("/api/signals"),
      requestJson(`/api/news?region=${encodeURIComponent(region)}`),
      requestJson("/api/collectibles"),
      requestJson("/api/health"),
    ]);

    setSignalsResponse({
      ...EMPTY_SIGNALS_RESPONSE,
      ...signalsData,
      signals: signalsData.signals || [],
      marketData: {
        ...EMPTY_SIGNALS_RESPONSE.marketData,
        ...(signalsData.marketData || {}),
        sourceStatus: signalsData.marketData?.sourceStatus || [],
      },
      strategyRules: signalsData.strategyRules || [],
    });
    setNewsResponse({
      ...EMPTY_NEWS_RESPONSE,
      ...newsData,
      items: newsData.items || [],
      sources: newsData.sources || [],
      sourceStatus: newsData.sourceStatus || [],
    });
    setCollectiblesResponse({
      ...EMPTY_COLLECTIBLES_RESPONSE,
      ...collectiblesData,
      items: collectiblesData.items || [],
      categories: collectiblesData.categories || [],
      brands: collectiblesData.brands || [],
      referenceShelves: collectiblesData.referenceShelves || [],
      partnerSources: collectiblesData.partnerSources || [],
    });
    setHealth({
      ...EMPTY_HEALTH,
      ...healthData,
      services: healthData.services || {},
      metrics: healthData.metrics || {},
      sources: healthData.sources || [],
      marketSources: healthData.marketSources || [],
      connectors: healthData.connectors || [],
    });
  }, [appSettings.preferredRegion]);

  const refreshContext = useCallback(
    async (tokenOverride = authToken) => {
      if (!tokenOverride) {
        return;
      }

      try {
        const [
          portfolioData,
          settingsData,
          targetsData,
          connectorsData,
          feedbackData,
          shareData,
          collectiblePortfolioData,
          collectibleImportsData,
        ] = await Promise.all([
          requestJson("/api/portfolio", { token: tokenOverride }),
          requestJson("/api/settings", { token: tokenOverride }),
          requestJson("/api/news/targets", { token: tokenOverride }),
          requestJson("/api/connectors", { token: tokenOverride }),
          requestJson("/api/feedback", { token: tokenOverride }),
          requestJson("/api/share-status", { token: tokenOverride }),
          requestJson("/api/collectibles/portfolio", { token: tokenOverride }),
          requestJson("/api/collectibles/imports", { token: tokenOverride }),
        ]);

        setPortfolio(Array.isArray(portfolioData) ? portfolioData : []);
        setAppSettings(normalizeAppSettings(settingsData.settings));
        setTargets(targetsData.items || []);
        setConnectors(connectorsData.providers || []);
        const nextCryptoConnector = (connectorsData.providers || []).find(
          (provider) => provider.id === "valr",
        );
        if (nextCryptoConnector) {
          setValrForm((current) => ({
            ...current,
            preferredPair:
              nextCryptoConnector.config?.preferredPair ||
              current.preferredPair ||
              DEFAULT_EXECUTION_PROFILES.crypto.pair,
            subAccountId: nextCryptoConnector.config?.subAccountId || current.subAccountId || "",
          }));
        }
        setFeedbackResponse({
          ...EMPTY_FEEDBACK_RESPONSE,
          ...feedbackData,
          items: feedbackData.items || [],
          summary: feedbackData.summary || {},
          permissions: feedbackData.permissions || { canManage: false },
        });
        setShareStatus({
          ...EMPTY_SHARE_STATUS,
          ...(shareData.share || {}),
        });
        setCollectiblePortfolio({
          ...EMPTY_COLLECTIBLE_PORTFOLIO,
          ...collectiblePortfolioData,
          items: collectiblePortfolioData.items || [],
          transactions: collectiblePortfolioData.transactions || [],
          summary: collectiblePortfolioData.summary || {},
        });
        setCollectibleImports(collectibleImportsData.items || []);
      } catch (error) {
        if (error.status === 401) {
          clearSession();
          return;
        }
        throw error;
      }
    },
    [authToken, clearSession],
  );

  useEffect(() => {
    if (!window.location.hash) {
      syncHashRoute(page, activeDesk);
    }
  }, [activeDesk, page, syncHashRoute]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setBootSplashVisible(false);
    }, 1300);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return;
    }

    requestJson("/api/auth/me", { token })
      .then((data) => {
        setCurrentUser(data.user);
        setAppSettings(normalizeAppSettings(data.settings));
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [clearSession]);

  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHashState(window.location.hash);
      setPage(next.page);
      setActiveDesk(next.desk);
      if (!currentUser) {
        setPreAuthLaunch((previous) => ({
          ...previous,
          page: next.page,
          desk: next.desk,
          introId: defaultIntroIdForPage(next.page),
          sectionId: PAGE_SECTION_LINKS[next.page]?.[0]?.id || null,
        }));
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentUser]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshCore().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshCore]);

  useEffect(() => {
    if (!currentUser || !authToken) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshContext().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authToken, currentUser, refreshContext]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshCore().catch(() => {});
      if (currentUser && authToken) {
        refreshContext().catch(() => {});
      }
    }, 20000);

    return () => window.clearInterval(interval);
  }, [authToken, currentUser, refreshContext, refreshCore]);

  useEffect(() => {
    if (!pendingSectionTarget) {
      return;
    }

    if (pendingSectionTarget.page !== page) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(pendingSectionTarget.sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setPendingSectionTarget(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [page, pendingSectionTarget]);

  const filteredSignals = useMemo(
    () => filterSignalsByDesk(signalsResponse.signals || [], activeDesk),
    [activeDesk, signalsResponse.signals],
  );
  const resolvedSelectedSignalTicker =
    filteredSignals.some((signal) => signal.ticker === selectedSignalTicker)
      ? selectedSignalTicker
      : filteredSignals[0]?.ticker || null;

  const activeSignal =
    filteredSignals.find((signal) => signal.ticker === resolvedSelectedSignalTicker) ||
    filteredSignals[0] ||
    signalsResponse.leadSignal ||
    null;
  const effectiveDeskKey =
    activeDesk === "all" ? activeSignal?.desk || DEFAULT_DESK : activeDesk;
  const activeDeskProfile =
    appSettings.executionProfiles?.[effectiveDeskKey] ||
    DEFAULT_EXECUTION_PROFILES[effectiveDeskKey] ||
    DEFAULT_EXECUTION_PROFILES.forex;

  const marketSourceMap = useMemo(
    () =>
      Object.fromEntries(
        (signalsResponse.marketData?.sourceStatus || []).map((source) => [source.ticker, source]),
      ),
    [signalsResponse.marketData?.sourceStatus],
  );

  const newsItemsForDesk = useMemo(
    () => filterNewsItemsByDesk(newsResponse.items || [], activeDesk),
    [activeDesk, newsResponse.items],
  );
  const leadNewsItem = newsItemsForDesk[0] || newsResponse.items?.[0] || null;
  const activeDeskNewsLabel =
    activeDesk === "all" ? "All desk headlines" : `${labelDesk(activeDesk)} lens`;
  const southAfricaHeadlineCount = newsItemsForDesk.filter(
    (item) => item.region === "south-africa",
  ).length;
  const globalHeadlineCount = newsItemsForDesk.filter((item) => item.region === "global").length;
  const newsSourceMap = useMemo(() => buildSourceMap(newsResponse.sources), [newsResponse.sources]);

  const filteredCollectibles = useMemo(() => {
    const query = collectibleQuery.trim().toLowerCase();
    return (collectiblesResponse.items || []).filter((item) => {
      const matchesQuery =
        !query ||
        [item.name, item.brand, item.category, item.description, item.thesis, item.sku]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesBrand = collectibleBrand === "all" || item.brand === collectibleBrand;
      const matchesCategory =
        collectibleCategory === "all" || item.category === collectibleCategory;
      return matchesQuery && matchesBrand && matchesCategory;
    });
  }, [collectibleBrand, collectibleCategory, collectibleQuery, collectiblesResponse.items]);
  const collectibles = collectiblesResponse.items || [];
  const resolvedSelectedCollectibleId =
    filteredCollectibles.some((item) => item.id === selectedCollectibleId)
      ? selectedCollectibleId
      : filteredCollectibles[0]?.id || null;

  const activeCollectible =
    filteredCollectibles.find((item) => item.id === resolvedSelectedCollectibleId) ||
    filteredCollectibles[0] ||
    null;

  const openTrades = useMemo(
    () => portfolio.filter((trade) => trade.status === "open"),
    [portfolio],
  );
  const closedTrades = useMemo(
    () => portfolio.filter((trade) => trade.status !== "open"),
    [portfolio],
  );

  const resolvedSelectedTradeId = portfolio.some((trade) => trade.id === selectedTradeId)
    ? selectedTradeId
    : portfolio[0]?.id || null;

  const activePortfolioTrade =
    portfolio.find((trade) => trade.id === resolvedSelectedTradeId) ||
    openTrades[0] ||
    closedTrades[0] ||
    null;

  const totalOpenPnl = useMemo(
    () => openTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0),
    [openTrades],
  );

  const activeChartPlan = useMemo(
    () => buildChartPlan(activeSignal, orderTicket),
    [activeSignal, orderTicket],
  );

  const mentorSummary = useMemo(
    () => buildMentorSummary(activeSignal, leadNewsItem),
    [activeSignal, leadNewsItem],
  );
  const mentorChecklist = useMemo(
    () => buildMentorChecklist(activeSignal, leadNewsItem),
    [activeSignal, leadNewsItem],
  );

  const toolsDeskKey = page === "tools" ? effectiveDeskKey : effectiveDeskKey;
  const activeResearchReports = useMemo(
    () =>
      RESEARCH_REPORTS.filter(
        (report) =>
          report.targetDesk === toolsDeskKey ||
          (toolsDeskKey === "forex" && report.targetDesk === "forex"),
      ),
    [toolsDeskKey],
  );

  const connectedProviderCount = connectors.filter((provider) => provider.configured).length;
  const cryptoConnector = connectors.find((provider) => provider.id === "valr") || null;
  const liveReadyDeskCount = MARKET_DESKS.filter((desk) => {
    const profile = appSettings.executionProfiles?.[desk.id];
    if (!profile || profile.mode !== "live") {
      return false;
    }
    const fauxSignal = { desk: desk.id };
    return executionPlanForSignal(fauxSignal, appSettings, connectors).ready;
  }).length;
  const degradedSourceCount = [
    ...(health.sources || []),
    ...(signalsResponse.marketData?.sourceStatus || []),
  ].filter((source) => !["ok", "online", "simulated", "configured", "manual_setup", "unsupported"].includes(source.status)).length;

  const handleLandingContinue = useCallback((selection, nextMode) => {
    setPreAuthLaunch(selection);
    setAuthMode(nextMode);
    setAuthStage("auth");
  }, []);

  const handleAuthenticatedRoute = useCallback(
    async (token, user, settings, launchSelection) => {
      window.localStorage.setItem(TOKEN_KEY, token);
      setAuthToken(token);
      setCurrentUser(user);
      setAppSettings(normalizeAppSettings(settings));
      setAuthStatus("");
      setAuthStage("landing");
      setSplashVisible(false);
      const launch = launchSelection || preAuthLaunch;
      const nextPage = normalizePage(launch?.page || page);
      const nextDesk = normalizeDesk(launch?.desk || activeDesk);
      rememberLaunch({
        page: nextPage,
        desk: nextDesk,
        introId: launch?.introId || defaultIntroIdForPage(nextPage),
        sectionId: launch?.sectionId || PAGE_SECTION_LINKS[nextPage]?.[0]?.id || null,
        landingId: launch?.landingId || launch?.introId || defaultIntroIdForPage(nextPage),
      });
      setPage(nextPage);
      setActiveDesk(nextDesk);
      syncHashRoute(nextPage, nextDesk);
      if (launch?.sectionId) {
        setPendingSectionTarget({
          page: nextPage,
          desk: nextDesk,
          sectionId: launch.sectionId,
        });
      }
      await Promise.all([refreshCore(), refreshContext(token)]);
    },
    [
      activeDesk,
      page,
      preAuthLaunch,
      refreshContext,
      refreshCore,
      rememberLaunch,
      syncHashRoute,
    ],
  );

  const handleAuthSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setAuthStatus("");

      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            };

      try {
        const data = await requestJson(endpoint, {
          method: "POST",
          body,
        });
        await handleAuthenticatedRoute(data.token, data.user, data.settings, preAuthLaunch);
      } catch (error) {
        setAuthStatus(String(error.message || "Authentication failed."));
      }
    },
    [authForm, authMode, handleAuthenticatedRoute, preAuthLaunch],
  );

  const handleAuthFieldChange = useCallback((field, value) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleSplashLaunch = useCallback(
    (selection) => {
      rememberLaunch(selection);
      setSplashVisible(false);
      jumpToPageSection(selection.page, selection.sectionId, selection.desk);
    },
    [jumpToPageSection, rememberLaunch],
  );

  const handleDeskRoute = useCallback(
    (targetPage, desk) => {
      navigateToPage(targetPage, false, desk);
    },
    [navigateToPage],
  );

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const openMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const handleMenuNavigate = useCallback(
    (targetPage, targetDesk = activeDesk) => {
      setMenuVisible(false);
      navigateToPage(targetPage, false, targetDesk);
    },
    [activeDesk, navigateToPage],
  );

  const handleMenuSection = useCallback(
    (targetPage, sectionId, targetDesk = activeDesk) => {
      setMenuVisible(false);
      jumpToPageSection(targetPage, sectionId, targetDesk);
    },
    [activeDesk, jumpToPageSection],
  );

  const handleMenuSplash = useCallback(() => {
    setMenuVisible(false);
    setSplashVisible(true);
  }, []);

  const handleMenuLogout = useCallback(() => {
    setMenuVisible(false);
    clearSession();
  }, [clearSession]);

  const handleSelectSignal = useCallback((signal) => {
    setSelectedSignalTicker(signal.ticker);
  }, []);

  const openMarketTicket = useCallback((signal, preferredSide) => {
    const nextSide =
      preferredSide ||
      (signal.action === "SELL" ? "SELL" : signal.action === "BUY" ? "BUY" : "BUY");
    setOrderTicket(buildMarketTicket(signal, nextSide));
    setTradeStatus("");
  }, []);

  const handleCollectibleSelect = useCallback((item) => {
    setSelectedCollectibleId(item.id);
  }, []);

  const openCollectibleTicket = useCallback((item, preferredSide = "BUY") => {
    setOrderTicket(buildCollectibleTicket(item, preferredSide));
    setTradeStatus("");
  }, []);

  const handleOrderFieldChange = useCallback((field, value) => {
    setOrderTicket((current) => {
      if (!current) {
        return current;
      }

      if (field === "side") {
        const nextSide = String(value || "").toUpperCase() === "SELL" ? "SELL" : "BUY";
        const nextMode = current.structuredPlans?.[nextSide] ? "structure" : "preset";
        return applyTicketPlan(current, nextMode, nextSide);
      }

      const nextTicket = {
        ...current,
        [field]: value,
      };

      if (field === "stopPrice" || field === "targetPrice") {
        return {
          ...nextTicket,
          ...resolveTicketPlanMeta(
            nextTicket,
            field === "stopPrice" ? value : nextTicket.stopPrice,
            field === "targetPrice" ? value : nextTicket.targetPrice,
          ),
        };
      }

      return nextTicket;
    });
  }, []);

  const handleOrderPlanAction = useCallback((mode) => {
    setOrderTicket((current) => {
      if (!current) {
        return current;
      }

      if (mode === "base") {
        return {
          ...current,
          stopPrice: current.baseStopPrice,
          targetPrice: current.baseTargetPrice,
          ...resolveTicketPlanMeta(current, current.baseStopPrice, current.baseTargetPrice),
        };
      }

      if (mode === "structure" || mode === "preset") {
        return applyTicketPlan(current, mode, current.side);
      }

      return current;
    });
  }, []);

  const submitOrderTicket = useCallback(async () => {
    if (!orderTicket || !authToken) {
      return;
    }

    setTradeActionBusy(true);
    setTradeStatus("");

    try {
      const endpoint =
        orderTicket.kind === "collectible" ? "/api/collectibles/trades" : "/api/trades";
      const body =
        orderTicket.kind === "collectible"
          ? {
              collectibleId: orderTicket.collectibleId,
              side: orderTicket.side,
              quantity: orderTicket.quantity,
              orderNote: orderTicket.orderNote,
              stopPrice: orderTicket.stopPrice,
              targetPrice: orderTicket.targetPrice,
              riskBudget: orderTicket.riskBudget,
            }
          : {
              marketTicker: orderTicket.marketTicker,
              side: orderTicket.side,
              quantity: orderTicket.quantity,
              orderNote: orderTicket.orderNote,
              stopPrice: orderTicket.stopPrice,
              targetPrice: orderTicket.targetPrice,
              riskBudget: orderTicket.riskBudget,
            };

      const data = await requestJson(endpoint, {
        method: "POST",
        token: authToken,
        body,
      });
      setPortfolio(data.portfolio || []);
      setTradeStatus(
        orderTicket.kind === "collectible"
          ? `${orderTicket.side} collectible ticket saved.`
          : `${orderTicket.side} ${orderTicket.label} ticket submitted.`,
      );
      setOrderTicket(null);
      await refreshContext();
    } catch (error) {
      setTradeStatus(String(error.message || "Ticket submission failed."));
    } finally {
      setTradeActionBusy(false);
    }
  }, [authToken, orderTicket, refreshContext]);

  const handleCloseTrade = useCallback((trade) => {
    setCloseTicket({
      ...trade,
      orderNote: "",
    });
  }, []);

  const submitCloseTrade = useCallback(async () => {
    if (!closeTicket || !authToken) {
      return;
    }

    setTradeActionBusy(true);
    setTradeStatus("");

    try {
      const data = await requestJson(`/api/trades/${closeTicket.id}/close`, {
        method: "POST",
        token: authToken,
        body: { orderNote: closeTicket.orderNote },
      });
      setPortfolio(data.portfolio || []);
      setTradeStatus(`Closed ${closeTicket.ticker}.`);
      setCloseTicket(null);
      await refreshContext();
    } catch (error) {
      setTradeStatus(String(error.message || "Close request failed."));
    } finally {
      setTradeActionBusy(false);
    }
  }, [authToken, closeTicket, refreshContext]);

  const handlePortfolioTradeSelect = useCallback((trade) => {
    setSelectedTradeId(trade.id);
  }, []);

  const handlePortfolioTradeNavigate = useCallback(
    (trade) => {
      if (trade.assetClass === "collectible") {
        setSelectedCollectibleId(trade.collectibleId || trade.id);
        jumpToPageSection("collectibles", "collectibles-grid");
        return;
      }

      if (trade.marketTicker) {
        setSelectedSignalTicker(trade.marketTicker);
      }
      jumpToPageSection("signals", "chart-panel", trade.desk || activeDesk);
    },
    [activeDesk, jumpToPageSection],
  );

  const handleChartUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setChartUploadName(file.name);
    setToolStatus(`Chart queued: ${file.name}`);
  }, []);

  const openResearchReport = useCallback(
    (report) => {
      jumpToPageSection(report.desk, report.targetSection, report.targetDesk || activeDesk);
    },
    [activeDesk, jumpToPageSection],
  );

  const updateSettings = useCallback(
    async (partial) => {
      if (!authToken) {
        return;
      }

      try {
        const data = await requestJson("/api/settings", {
          method: "PUT",
          token: authToken,
          body: partial,
        });
        setAppSettings(normalizeAppSettings(data.settings));
        setSettingsStatus("Workspace settings saved.");
      } catch (error) {
        setSettingsStatus(String(error.message || "Settings update failed."));
      }
    },
    [authToken],
  );

  const updateExecutionProfile = useCallback(
    async (deskId, patch) => {
      const currentProfile =
        appSettings.executionProfiles?.[deskId] || DEFAULT_EXECUTION_PROFILES[deskId];
      const nextProfiles = {
        ...appSettings.executionProfiles,
        [deskId]: {
          ...currentProfile,
          ...patch,
        },
      };
      await updateSettings({ executionProfiles: nextProfiles });
    },
    [appSettings.executionProfiles, updateSettings],
  );

  const addTarget = useCallback(async () => {
    const target = targetInput.trim();
    if (!target || !authToken) {
      return;
    }

    try {
      const data = await requestJson("/api/news/targets", {
        method: "POST",
        token: authToken,
        body: { target },
      });
      setTargets(data.items || []);
      setTargetInput("");
      setSettingsStatus("Research target saved.");
    } catch (error) {
      setSettingsStatus(String(error.message || "Target save failed."));
    }
  }, [authToken, targetInput]);

  const handleValrFieldChange = useCallback((field, value) => {
    setValrForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const saveValrConnector = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setConnectorBusyKey("valr:save");
    try {
      const data = await requestJson("/api/connectors/valr", {
        method: "PUT",
        token: authToken,
        body: valrForm,
      });
      setConnectors((current) =>
        current.map((provider) => (provider.id === "valr" ? data.provider : provider)),
      );
      setSettingsStatus("VALR credentials saved.");
      setValrForm((current) => ({
        ...current,
        apiKey: "",
        apiSecret: "",
      }));
    } catch (error) {
      setSettingsStatus(String(error.message || "VALR save failed."));
    } finally {
      setConnectorBusyKey("");
    }
  }, [authToken, valrForm]);

  const testConnectorConnection = useCallback(
    async (providerId) => {
      if (!authToken) {
        return;
      }

      setConnectorBusyKey(`${providerId}:test`);
      try {
        const data = await requestJson(`/api/connectors/${providerId}/test`, {
          method: "POST",
          token: authToken,
        });
        setConnectors((current) =>
          current.map((provider) => (provider.id === providerId ? data.provider : provider)),
        );
        setSettingsStatus(data.detail || `${providerLabel(providerId)} connection test passed.`);
      } catch (error) {
        setSettingsStatus(String(error.message || "Connection test failed."));
      } finally {
        setConnectorBusyKey("");
      }
    },
    [authToken],
  );

  const syncConnectorBalances = useCallback(
    async (providerId) => {
      if (!authToken) {
        return;
      }

      setConnectorBusyKey(`${providerId}:sync`);
      try {
        const data = await requestJson(`/api/connectors/${providerId}/sync`, {
          method: "POST",
          token: authToken,
        });
        setConnectors((current) =>
          current.map((provider) => (provider.id === providerId ? data.provider : provider)),
        );
        setSettingsStatus(data.detail || `${providerLabel(providerId)} account synced.`);
      } catch (error) {
        setSettingsStatus(String(error.message || "Account sync failed."));
      } finally {
        setConnectorBusyKey("");
      }
    },
    [authToken],
  );

  const disconnectConnector = useCallback(
    async (providerId) => {
      if (!authToken) {
        return;
      }

      setConnectorBusyKey(`${providerId}:disconnect`);
      try {
        const data = await requestJson(`/api/connectors/${providerId}`, {
          method: "DELETE",
          token: authToken,
        });
        setConnectors((current) =>
          current.map((provider) => (provider.id === providerId ? data.provider : provider)),
        );
        setSettingsStatus(`${providerLabel(providerId)} disconnected.`);
      } catch (error) {
        setSettingsStatus(String(error.message || "Disconnect failed."));
      } finally {
        setConnectorBusyKey("");
      }
    },
    [authToken],
  );

  const submitFeedback = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setFeedbackBusyKey("submit");
    try {
      const data = await requestJson("/api/feedback", {
        method: "POST",
        token: authToken,
        body: feedbackForm,
      });
      setFeedbackResponse({
        ...EMPTY_FEEDBACK_RESPONSE,
        ...data,
        items: data.items || [],
        summary: data.summary || {},
        permissions: data.permissions || { canManage: false },
      });
      setFeedbackForm(INITIAL_FEEDBACK_FORM);
      setFeedbackStatus("Feedback saved to the board.");
    } catch (error) {
      setFeedbackStatus(String(error.message || "Feedback save failed."));
    } finally {
      setFeedbackBusyKey("");
    }
  }, [authToken, feedbackForm]);

  const updateFeedbackStatus = useCallback(
    async (feedbackId, status) => {
      if (!authToken) {
        return;
      }

      setFeedbackBusyKey(`${feedbackId}:${status}`);
      try {
        const data = await requestJson(`/api/feedback/${feedbackId}`, {
          method: "PATCH",
          token: authToken,
          body: { status },
        });
        setFeedbackResponse({
          ...EMPTY_FEEDBACK_RESPONSE,
          ...data,
          items: data.items || [],
          summary: data.summary || {},
          permissions: data.permissions || { canManage: false },
        });
        setFeedbackStatus("Feedback board updated.");
      } catch (error) {
        setFeedbackStatus(String(error.message || "Feedback update failed."));
      } finally {
        setFeedbackBusyKey("");
      }
    },
    [authToken],
  );

  const applyChartLevelToTicket = useCallback((levelKind) => {
    if (!activeSignal) {
      return;
    }

    if (!orderTicket || orderTicket.kind !== "market" || orderTicket.marketTicker !== activeSignal.ticker) {
      setTradeStatus("Open the active ticket first if you want to use chart levels.");
      return;
    }

    const support = activeSignal.tradePlan?.support ?? null;
    const resistance = activeSignal.tradePlan?.resistance ?? null;
    const levelMap =
      orderTicket.side === "SELL"
        ? {
            support: ["targetPrice", support],
            resistance: ["stopPrice", resistance],
            stop: ["stopPrice", activeChartPlan?.stopPrice ?? null],
            target: ["targetPrice", activeChartPlan?.targetPrice ?? null],
          }
        : {
            support: ["stopPrice", support],
            resistance: ["targetPrice", resistance],
            stop: ["stopPrice", activeChartPlan?.stopPrice ?? null],
            target: ["targetPrice", activeChartPlan?.targetPrice ?? null],
          };

    const mapping = levelMap[levelKind];
    if (!mapping || !Number.isFinite(Number(mapping[1]))) {
      return;
    }

    const [field, numericValue] = mapping;
    const stringValue = formatTicketPlanInput(orderTicket, numericValue);

    setOrderTicket((current) => {
      if (!current) {
        return current;
      }
      const nextTicket = {
        ...current,
        [field]: stringValue,
      };
      return {
        ...nextTicket,
        ...resolveTicketPlanMeta(
          nextTicket,
          field === "stopPrice" ? stringValue : nextTicket.stopPrice,
          field === "targetPrice" ? stringValue : nextTicket.targetPrice,
        ),
      };
    });
  }, [activeChartPlan, activeSignal, orderTicket]);

  const activePageSections = PAGE_SECTION_LINKS[page] || [];
  const leadSignal = activeSignal || signalsResponse.leadSignal || null;
  const activeSignalExecutionPlan = leadSignal
    ? executionPlanForSignal(leadSignal, appSettings, connectors)
    : executionPlanForSignal({ desk: effectiveDeskKey }, appSettings, connectors);

  const currentWorkspaceCard = {
    label: workspaceLabel(page, activeDesk),
    hint: SCREEN_PREVIEWS[page] || "Current workspace",
  };
  const mobileClockLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: appSettings.timezone || "Africa/Johannesburg",
      }).format(new Date()),
    [appSettings.timezone],
  );
  const executionPlanForCard = useCallback(
    (signal) => executionPlanForSignal(signal, appSettings, connectors),
    [appSettings, connectors],
  );

  const topMetrics = [
    {
      id: "workspace",
      label: "Workspace",
      value: currentWorkspaceCard.label,
      detail: activeDesk === "all" ? "Cross-market view" : labelDesk(activeDesk),
      action: () => navigateToPage("home", false, activeDesk),
    },
    {
      id: "feed",
      label: "Market feed",
      value: marketModeLabel(signalsResponse.marketData?.mode),
      detail: signalsResponse.marketData?.provider || "Simulator",
      action: () => jumpToPageSection("connections", "market-feed-status", activeDesk),
    },
    {
      id: "book",
      label: "Open book",
      value: openTrades.length,
      detail: Number.isFinite(totalOpenPnl) ? `${totalOpenPnl >= 0 ? "+" : ""}${totalOpenPnl.toFixed(2)}%` : "--",
      action: () => jumpToPageSection("portfolio", "open-positions"),
    },
    {
      id: "feedback",
      label: "Feedback",
      value: feedbackResponse.summary?.open || 0,
      detail: "Open partner items",
      action: () => jumpToPageSection("settings", "feedback-board"),
    },
  ];
  const primaryNavItems = NAV_ITEMS.filter((item) =>
    ["collectibles", "portfolio", "home"].includes(item.id),
  );
  const utilityNavItems = NAV_ITEMS.filter((item) =>
    ["tools", "reports", "connections", "settings"].includes(item.id),
  );
  const defaultTradingDesk = ["forex", "etfs", "jse"].includes(activeDesk) ? activeDesk : "forex";
  const menuPrimaryItems = [
    {
      id: "menu-collectibles",
      glyph: "CL",
      label: "Collectibles",
      detail: "Valuation, evidence, and inventory",
      action: () => handleMenuNavigate("collectibles", activeDesk),
    },
    {
      id: "menu-portfolio",
      glyph: "PF",
      label: "Portfolio",
      detail: "Open positions and history",
      action: () => handleMenuNavigate("portfolio", activeDesk),
    },
    {
      id: "menu-home",
      glyph: "HM",
      label: "Home",
      detail: "Workspace summary",
      action: () => handleMenuNavigate("home", activeDesk),
    },
  ];
  const menuDeskItems = MARKET_DESKS.map((desk) => ({
    id: desk.id,
    label: desk.label,
    detail: desk.shortLabel,
    active: activeDesk === desk.id,
    action: () => handleMenuNavigate(page === "news" ? "news" : "signals", desk.id),
  }));
  const menuSupportItems = [
    {
      id: "menu-news",
      label: "Market News",
      detail: `${labelDesk(activeDesk)} macro tape`,
      action: () => handleMenuNavigate("news", activeDesk),
    },
    {
      id: "menu-trading",
      label: "Market Tools",
      detail: `${labelDesk(defaultTradingDesk)} signal desk`,
      action: () => handleMenuNavigate("signals", defaultTradingDesk),
    },
    {
      id: "menu-crypto",
      label: "Crypto Tools",
      detail: "BTC and crypto desk",
      action: () => handleMenuNavigate("signals", "crypto"),
    },
    {
      id: "menu-reports",
      label: "Reports",
      detail: "Performance graphs",
      action: () => handleMenuNavigate("reports", activeDesk),
    },
    {
      id: "menu-tools",
      label: "Tools",
      detail: "Mentor and simulator",
      action: () => handleMenuNavigate("tools", activeDesk),
    },
    {
      id: "menu-connections",
      label: "Connections",
      detail: "Feeds and routing",
      action: () => handleMenuNavigate("connections", activeDesk),
    },
    {
      id: "menu-settings",
      label: "Settings",
      detail: "Account and setup",
      action: () => handleMenuNavigate("settings", activeDesk),
    },
  ];
  const menuActionItems = [
    {
      id: "menu-feedback",
      label: "Feedback Board",
      detail: "Partner notes and status",
      action: () => handleMenuSection("settings", "feedback-board"),
    },
    {
      id: "menu-testing",
      label: "Partner Testing",
      detail: "Guided review route",
      action: () => handleMenuSection("settings", "partner-testing"),
    },
    {
      id: "menu-intro",
      label: "Intro Screen",
      detail: "Open the launch chooser",
      action: handleMenuSplash,
    },
    {
      id: "menu-logout",
      label: "Log Out",
      detail: "End this session",
      action: handleMenuLogout,
    },
  ];
  const workspaceContent = (
    <>
      {page === "home" ? (
        <HomeScreen
          activeDesk={effectiveDeskKey}
          activePageSections={activePageSections}
          appSettings={appSettings}
          collectiblesResponse={collectiblesResponse}
          connectedProviderCount={connectedProviderCount}
          feedbackResponse={feedbackResponse}
          health={health}
          jumpToPageSection={jumpToPageSection}
          liveReadyDeskCount={liveReadyDeskCount}
          navigateToPage={navigateToPage}
          newsResponse={newsResponse}
          openTrades={openTrades}
          shareStatus={shareStatus}
          signalsResponse={signalsResponse}
          totalOpenPnl={totalOpenPnl}
        />
      ) : null}

      {page === "news" ? (
        <NewsScreen
          activeDesk={activeDesk}
          activeDeskNewsLabel={activeDeskNewsLabel}
          activeDeskProfile={activeDeskProfile}
          activePageSections={activePageSections}
          appSettings={appSettings}
          deskLeadSignal={leadSignal}
          globalHeadlineCount={globalHeadlineCount}
          handleDeskRoute={handleDeskRoute}
          jumpToPageSection={jumpToPageSection}
          leadNewsItem={leadNewsItem}
          newsResponse={{ ...newsResponse, items: newsItemsForDesk }}
          newsSourceMap={newsSourceMap}
          refreshContext={refreshCore}
          southAfricaHeadlineCount={southAfricaHeadlineCount}
        />
      ) : null}

      {page === "signals" ? (
        <TradeScreen
          activeChartPlan={activeChartPlan}
          activeDesk={activeDesk}
          activePageSections={activePageSections}
          activeSignalExecutionPlan={activeSignalExecutionPlan}
          appSettings={appSettings}
          applyChartLevelToTicket={applyChartLevelToTicket}
          effectiveDeskKey={effectiveDeskKey}
          executionPlanForCard={executionPlanForCard}
          filteredSignals={filteredSignals}
          handleDeskRoute={handleDeskRoute}
          handleSelectSignal={handleSelectSignal}
          jumpToPageSection={jumpToPageSection}
          leadSignal={leadSignal}
          marketSourceMap={marketSourceMap}
          newsItemsForDesk={newsItemsForDesk}
          newsSourceMap={newsSourceMap}
          openMarketTicket={openMarketTicket}
          openTrades={openTrades}
          orderTicket={orderTicket}
          signalsResponse={signalsResponse}
          tradeStatus={tradeStatus}
        />
      ) : null}

      {page === "tools" ? (
        <ToolsScreen
          activeChartPlan={activeChartPlan}
          activeDeskProfile={activeDeskProfile}
          activePageSections={activePageSections}
          activeResearchReports={activeResearchReports}
          activeSignal={leadSignal}
          appSettings={appSettings}
          chartUploadName={chartUploadName}
          handleChartUpload={handleChartUpload}
          jumpToPageSection={jumpToPageSection}
          leadNewsItem={leadNewsItem}
          mentorChecklist={mentorChecklist}
          mentorSummary={mentorSummary}
          navigateToPage={navigateToPage}
          openResearchReport={openResearchReport}
          openTrades={openTrades}
          toolStatus={toolStatus}
          toolsDeskKey={toolsDeskKey}
        />
      ) : null}

      {page === "collectibles" ? (
        <CollectiblesScreen
          activeCollectible={activeCollectible}
          activePageSections={activePageSections}
          appSettings={appSettings}
          collectibleBrand={collectibleBrand}
          collectibleCategory={collectibleCategory}
          collectibleQuery={collectibleQuery}
          collectibles={collectibles}
          collectibleImports={collectibleImports}
          collectiblePortfolio={collectiblePortfolio}
          collectiblesResponse={collectiblesResponse}
          filteredCollectibles={filteredCollectibles}
          handleCollectibleSelect={handleCollectibleSelect}
          jumpToPageSection={jumpToPageSection}
          openCollectibleTicket={openCollectibleTicket}
          authToken={authToken}
          refreshContext={refreshContext}
          setCollectibleBrand={setCollectibleBrand}
          setCollectibleCategory={setCollectibleCategory}
          setCollectibleQuery={setCollectibleQuery}
        />
      ) : null}

      {page === "portfolio" ? (
        <PortfolioScreen
          activeDesk={activeDesk}
          activePageSections={activePageSections}
          activePortfolioTrade={activePortfolioTrade}
          appSettings={appSettings}
          closedTrades={closedTrades}
          handleCloseTrade={handleCloseTrade}
          handlePortfolioTradeNavigate={handlePortfolioTradeNavigate}
          handlePortfolioTradeSelect={handlePortfolioTradeSelect}
          health={health}
          jumpToPageSection={jumpToPageSection}
          openTrades={openTrades}
          totalOpenPnl={totalOpenPnl}
        />
      ) : null}

      {page === "reports" ? (
        <ReportsScreen
          activeDesk={activeDesk}
          activePageSections={activePageSections}
          appSettings={appSettings}
          closedTrades={closedTrades}
          health={health}
          jumpToPageSection={jumpToPageSection}
          navigateToPage={navigateToPage}
          openTrades={openTrades}
          signalsResponse={signalsResponse}
          totalOpenPnl={totalOpenPnl}
        />
      ) : null}

      {page === "connections" ? (
        <ConnectionsScreen
          activeDesk={activeDesk}
          activePageSections={activePageSections}
          appSettings={appSettings}
          connectedProviderCount={connectedProviderCount}
          connectorBusyKey={connectorBusyKey}
          connectors={connectors}
          cryptoConnector={cryptoConnector}
          degradedSourceCount={degradedSourceCount}
          disconnectConnector={disconnectConnector}
          handleValrFieldChange={handleValrFieldChange}
          health={health}
          jumpToPageSection={jumpToPageSection}
          liveReadyDeskCount={liveReadyDeskCount}
          newsResponse={newsResponse}
          refreshContext={refreshContext}
          refreshCore={refreshCore}
          saveValrConnector={saveValrConnector}
          settingsStatus={settingsStatus}
          signalsResponse={signalsResponse}
          syncConnectorBalances={syncConnectorBalances}
          testConnectorConnection={testConnectorConnection}
          updateExecutionProfile={updateExecutionProfile}
          valrForm={valrForm}
        />
      ) : null}

      {page === "settings" ? (
        <SettingsScreen
          activeDesk={activeDesk}
          activePageSections={activePageSections}
          addTarget={addTarget}
          appSettings={appSettings}
          connectedProviderCount={connectedProviderCount}
          currentUser={currentUser}
          feedbackBusyKey={feedbackBusyKey}
          feedbackForm={feedbackForm}
          feedbackResponse={feedbackResponse}
          feedbackStatus={feedbackStatus}
          jumpToPageSection={jumpToPageSection}
          liveReadyDeskCount={liveReadyDeskCount}
          navigateToPage={navigateToPage}
          setFeedbackForm={setFeedbackForm}
          settingsStatus={settingsStatus}
          shareStatus={shareStatus}
          setTargetInput={setTargetInput}
          submitFeedback={submitFeedback}
          targetInput={targetInput}
          targets={targets}
          updateFeedbackStatus={updateFeedbackStatus}
          updateSettings={updateSettings}
        />
      ) : null}
    </>
  );

  if (!authChecked) {
    if (bootSplashVisible) {
      return <BootSplash />;
    }
    return <LoadingShell message="Restoring account state, desk preference, and the last working route." />;
  }

  if (bootSplashVisible) {
    return <BootSplash />;
  }

  if (!currentUser) {
    if (authStage === "landing") {
      return <LandingShell initialLaunch={preAuthLaunch} onContinue={handleLandingContinue} />;
    }

    return (
      <AuthShell
        authMode={authMode}
        authForm={authForm}
        authStatus={authStatus}
        launchSelection={preAuthLaunch}
        onBack={() => setAuthStage("landing")}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
        onFieldChange={handleAuthFieldChange}
      />
    );
  }

  if (splashVisible) {
    return (
      <SplashScreen
        ready
        activePage={page}
        activeDesk={activeDesk}
        onLaunch={handleSplashLaunch}
      />
    );
  }

  return (
    <div className="appShell mobileAppShell">
      <aside className="sidebar">
        <div className="brandLockup">
          <button type="button" className="brandButton" onClick={() => setSplashVisible(true)}>
            <div className="brandMark">CT</div>
          </button>
          <div>
            <button type="button" className="brandButton" onClick={() => setSplashVisible(true)}>
              <div className="brandWordmark">COLLECTRADE</div>
              <div className="brandSub">Workspace build for partner testing</div>
            </button>
          </div>
        </div>

        <section className="sidebarCard sidebarCardButton workspaceCard">
          <span>Current workspace</span>
          <strong>{currentWorkspaceCard.label}</strong>
          <small>{currentWorkspaceCard.hint}</small>
          <div className="workspaceCardMeta">
            <div>
              <span>Desk</span>
              <strong>{labelDesk(activeDesk)}</strong>
            </div>
            <div>
              <span>Route</span>
              <strong>{page === "signals" ? "Execution" : workspaceLabel(page, activeDesk)}</strong>
            </div>
          </div>
        </section>

        <nav className="sideNav">
          {NAV_GROUPS.map((group) => (
            <div className="navGroup" key={group.id}>
              <div className="navGroupLabel">{group.label}</div>
              {NAV_ITEMS.filter((item) => item.section.toLowerCase() === group.id).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={page === item.id ? "active" : ""}
                  onClick={() => navigateToPage(item.id, false, activeDesk)}
                >
                  <div className="navButtonMain">
                    <div className="navGlyph">{item.glyph}</div>
                    <div className="navButtonCopy">
                      <span>{item.label}</span>
                      <small>{item.hint}</small>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="sidebarCard sidebarCardButton"
          onClick={() => jumpToPageSection("settings", "partner-testing")}
        >
          <span>Partner route</span>
          <strong>{shareStatus.status === "live" ? "Share live" : "Private session"}</strong>
          <small>
            {shareStatus.status === "live"
              ? shareStatus.publicUrl
              : "Open Settings -> Partner Testing when you are ready to hand this to partners."}
          </small>
        </button>
      </aside>

      <div className="workspaceShell">
        <div className="mobileStatusBar">
          <span>{mobileClockLabel}</span>
          <div className="mobileStatusIcons" aria-hidden="true">
            <span className="mobileStatusDot" />
            <span className="mobileStatusPill">5G</span>
            <span className="mobileStatusBattery">92%</span>
          </div>
        </div>

        <div className="mobileTitleBar">
          <button type="button" className="mobileBrandButton" onClick={() => setSplashVisible(true)}>
            <div className="brandMark">CT</div>
            <div className="mobileBrandCopy">
              <strong>Collecttrade</strong>
              <small>{currentWorkspaceCard.label}</small>
            </div>
          </button>

          <div className="mobileTitleActions">
            <div className="mobileTitleMeta">
              <span>{labelDesk(activeDesk)}</span>
              <strong>{marketModeLabel(signalsResponse.marketData?.mode)}</strong>
            </div>
            <button
              type="button"
              className="mobileMenuButton"
              aria-label="Open menu"
              onClick={openMenu}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <header className="topbar">
          <div className="metricStrip">
            {topMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className="metricBlock metricButton"
                onClick={metric.action}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </button>
            ))}
          </div>

          <div className="topbarTools">
            <div className={`livePill ${statusTone(signalsResponse.marketData?.mode)}`}>
              {marketModeLabel(signalsResponse.marketData?.mode)}
            </div>
            <button
              type="button"
              className="ghostButton"
              onClick={() => jumpToPageSection("settings", "feedback-board")}
            >
              Feedback Board
            </button>
            <button type="button" className="ghostButton" onClick={clearSession}>
              Log Out
            </button>
            <div className="avatarCircle">
              {(currentUser.name || currentUser.email || "U").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="mobileUtilityRail">
          {utilityNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobileUtilityChip ${page === item.id ? "active" : ""}`}
              onClick={() => navigateToPage(item.id, false, activeDesk)}
            >
              <span>{item.glyph}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>

        <main className="workspace">
          <Suspense fallback={<WorkspaceLoadingState label={currentWorkspaceCard.label} />}>
            <div key={`${page}:${activeDesk}`} className="workspaceViewport">
              {workspaceContent}
            </div>
          </Suspense>
        </main>

        <nav className="mobileBottomNav" aria-label="Primary navigation">
          {primaryNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobileBottomNavItem ${page === item.id ? "active" : ""}`}
              onClick={() => navigateToPage(item.id, false, activeDesk)}
            >
              <span>{item.glyph}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>

        {menuVisible ? (
          <div className="mobileMenuBackdrop" onClick={closeMenu}>
            <div className="mobileMenuScreen" onClick={(event) => event.stopPropagation()}>
              <div className="mobileMenuScreenHeader">
                <div>
                  <span>Navigation</span>
                  <strong>Choose where to go</strong>
                  <small>
                    {currentUser?.name || currentUser?.email || "Current session"} ·{" "}
                    {labelDesk(activeDesk)} · {currentWorkspaceCard.label}
                  </small>
                </div>
                <button type="button" className="ghostButton mobileMenuClose" onClick={closeMenu}>
                  Close
                </button>
              </div>

              <div className="mobileMenuScreenList">
                {menuPrimaryItems.map((item) => (
                  <button key={item.id} type="button" className="mobileMenuRow" onClick={item.action}>
                    <div className="mobileMenuRowGlyph">{item.glyph}</div>
                    <div className="mobileMenuRowCopy">
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <div className="mobileMenuRowArrow">→</div>
                  </button>
                ))}
              </div>

              <div className="mobileMenuScreenSection">
                <span>Desk shortcuts</span>
                <div className="mobileMenuPillRow">
                  {menuDeskItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`mobileMenuPill ${item.active ? "active" : ""}`}
                      onClick={item.action}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mobileMenuScreenSection">
                <span>More screens</span>
                <div className="mobileMenuSupportList">
                  {menuSupportItems.map((item) => (
                    <button key={item.id} type="button" className="mobileMenuSupportCard" onClick={item.action}>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mobileMenuScreenSection">
                <span>Actions</span>
                <div className="mobileMenuActionList">
                  {menuActionItems.map((item) => (
                    <button key={item.id} type="button" className="mobileMenuActionRow" onClick={item.action}>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <OrderTicketModal
          ticket={orderTicket}
          executionPlan={
            orderTicket?.kind === "market" && leadSignal
              ? executionPlanForSignal(
                  { desk: orderTicket?.desk, ticker: orderTicket?.marketTicker },
                  appSettings,
                  connectors,
                )
              : orderTicket?.kind === "collectible"
                ? {
                    mode: "paper",
                    providerLabel: "Collecttrade Paper",
                    pair: null,
                    ready: true,
                    detail: "Collectibles stay inside the app as paper inventory trades.",
                  }
                : null
          }
          busy={tradeActionBusy}
          onClose={() => setOrderTicket(null)}
          onFieldChange={handleOrderFieldChange}
          onPlanAction={handleOrderPlanAction}
          onSubmit={submitOrderTicket}
        />

        <CloseTradeModal
          trade={closeTicket}
          busy={tradeActionBusy}
          onClose={() => setCloseTicket(null)}
          onFieldChange={(value) =>
            setCloseTicket((current) => (current ? { ...current, orderNote: value } : current))
          }
          onSubmit={submitCloseTrade}
        />
      </Suspense>
    </div>
  );
}
