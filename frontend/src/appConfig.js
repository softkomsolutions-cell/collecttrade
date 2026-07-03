export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const TOKEN_KEY = "collecttrade_token";
export const DESK_KEY = "collecttrade_active_desk";
export const LAUNCH_PREF_KEY = "collecttrade_launch_preference";

export const APP_NAME = "Brick Alpha";
export const APP_WORDMARK = "BRICK ALPHA";
export const APP_MARK = "BA";
export const APP_TAGLINE = "AI Investment Intelligence for LEGO Collectors";
export const APP_SUBTAGLINE = "Build Value. Grow Wealth.";
export const LOGO_ICON = "/brick-alpha-icon.svg";
export const LOGO_FULL = "/brick-alpha-logo.svg";
export const DEFAULT_EXECUTION_PROFILES = {
  forex: {
    mode: "paper",
    providerId: "saxo",
  },
  etfs: {
    mode: "paper",
    providerId: "ibkr",
  },
  crypto: {
    mode: "paper",
    providerId: "valr",
    pair: "BTCUSDT",
  },
  jse: {
    mode: "paper",
    providerId: "easyequities",
  },
};

export const DEFAULT_SETTINGS = {
  preferredRegion: "south-africa",
  timezone: "Africa/Johannesburg",
  riskMode: "balanced",
  subscriptionTier: "starter",
  alertPreferences: {
    inAppEnabled: true,
    emailEnabled: false,
    digestWindow: "instant",
  },
  routinePreferences: {
    remindersEnabled: true,
    nudgeWindow: "active",
    celebrationEnabled: true,
  },
  executionProfiles: DEFAULT_EXECUTION_PROFILES,
};

export const ALERT_SUBSCRIPTION_OPTIONS = [
  {
    id: "starter",
    label: "Starter",
    maxAlerts: 5,
    emailEnabled: false,
    description: "Light alert tracking for partner testing and daily monitoring.",
  },
  {
    id: "pro",
    label: "Pro",
    maxAlerts: 20,
    emailEnabled: true,
    description: "The first paid tier with deeper alert coverage and queued email delivery.",
  },
  {
    id: "elite",
    label: "Elite",
    maxAlerts: 50,
    emailEnabled: true,
    description: "High-coverage alerting for heavier desks and premium subscriber workflows.",
  },
];

export const VALR_PAIR_OPTIONS = [
  { value: "BTCUSDT", label: "BTC/USDT" },
  { value: "BTCUSDC", label: "BTC/USDC" },
  { value: "BTCZAR", label: "BTC/ZAR" },
];

export const NAV_ITEMS = [
  {
    id: "home",
    label: "Dashboard",
    glyph: "HM",
    section: "Market",
    hint: "Executive summary — portfolio value, growth, and AI insights",
  },
  {
    id: "scan-evaluate",
    label: "Scan & Evaluate",
    glyph: "📷",
    icon: "camera",
    section: "Market",
    hint: "Photo scan and instant Brick Alpha investment evaluation",
  },
  {
    id: "collectibles",
    label: "LEGO Investments",
    glyph: "CL",
    section: "Market",
    hint: "collectibles desk",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    glyph: "PF",
    section: "Market",
    hint: "Live positions and history",
  },
  {
    id: "news",
    label: "News",
    glyph: "NW",
    section: "Market",
    hint: "Macro tape and lead stories",
  },
  {
    id: "signals",
    label: "Trade",
    glyph: "TR",
    section: "Market",
    hint: "Setups, charts, and tickets",
  },
  {
    id: "reports",
    label: "Research Center",
    glyph: "RP",
    section: "Platform",
    hint: "Performance graphs and analytics",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    glyph: "SB",
    section: "Platform",
    hint: "Plans, premium value, and upgrade path",
  },
  {
    id: "tools",
    label: "Tools",
    glyph: "TL",
    section: "Platform",
    hint: "Mentor, simulator, research",
  },
  {
    id: "connections",
    label: "Connections",
    glyph: "CN",
    section: "Platform",
    hint: "Brokers, feeds, and routing",
  },
  {
    id: "settings",
    label: "Settings",
    glyph: "ST",
    section: "Platform",
    hint: "Account and workspace setup",
  },
];

export const NAV_GROUPS = [
  { id: "market", label: "Investment Platform" },
  { id: "platform", label: "Support & Admin" },
];

export const SCREEN_PREVIEWS = {
  home: "Executive summary — portfolio value, growth, AI insights, and buy opportunities at a glance.",
  news: "Desk-specific macro headlines, South African context, and the full tape in one place.",
  signals: "Live 8/21 EMA setups, chart structure, and execution tickets.",
  tools: "AI mentor, chart analyzer, simulator, and research workspace for decision support.",
  connections: "Broker, venue, feed, and execution controls with live readiness and sync status.",
  collectibles: "Tradable LEGO, Pokemon, and other LEGO investment holdings positions.",
  "scan-evaluate":
    "Photograph or upload a LEGO set for instant AI identification, Brick Alpha scoring, and investment recommendations.",
  portfolio: "LEGO collection intelligence — NAV, growth, theme allocation, and Brick Alpha holdings.",
  reports: "Performance reporting, signal analytics, desk exposure, and visual review graphs.",
  subscriptions: "Plan tiers, premium feature value, and the commercial upgrade path.",
  settings: "Desk controls, health status, market intelligence, and account preferences.",
};

export const PAGE_SECTION_LINKS = {
  home: [
    { id: "home-dashboard", label: "Executive" },
  ],
  news: [
    { id: "news-desk-selector", label: "Desk Lens" },
    { id: "news-lead", label: "Lead Story" },
    { id: "macro-feed", label: "Macro Feed" },
  ],
  signals: [
    { id: "desk-selector", label: "Desk" },
    { id: "chart-panel", label: "Chart" },
    { id: "strategy-state", label: "Strategy" },
    { id: "macro-feed", label: "Macro" },
    { id: "signals-grid", label: "Setups" },
  ],
  tools: [
    { id: "tools-workbench", label: "Mentor" },
    { id: "chart-analyzer", label: "Analyzer" },
    { id: "scenario-simulator", label: "Simulator" },
    { id: "learn-dashboard", label: "Learn" },
    { id: "progress-dashboard", label: "Progress" },
  ],
  connections: [
    { id: "connections-overview", label: "Modes" },
    { id: "api-coverage", label: "APIs" },
    { id: "broker-connections", label: "Brokers" },
    { id: "market-feed-status", label: "Feed" },
    { id: "market-depth", label: "Depth" },
    { id: "economic-calendar", label: "Calendar" },
    { id: "source-status", label: "Market Intelligence" },
  ],
  collectibles: [
    { id: "investment-analysis", label: "Analysis" },
    { id: "retirement-intelligence", label: "Retirement" },
    { id: "collectibles-trading", label: "Browse" },
    { id: "collectibles-reference", label: "Reference" },
    { id: "collectibles-grid", label: "Catalog" },
  ],
  "scan-evaluate": [{ id: "scan-evaluate", label: "Evaluate" }],
  portfolio: [
    { id: "portfolio-intelligence", label: "Overview" },
    { id: "portfolio-growth", label: "Growth" },
    { id: "portfolio-allocation", label: "Themes" },
    { id: "portfolio-holdings", label: "Holdings" },
    { id: "portfolio-dashboard", label: "Dashboard" },
    { id: "position-detail", label: "Detail" },
    { id: "open-positions", label: "Open" },
    { id: "order-history", label: "History" },
  ],
  reports: [
    { id: "reports-overview", label: "Overview" },
    { id: "reports-performance", label: "Performance" },
    { id: "reports-exposure", label: "Exposure" },
    { id: "reports-signals", label: "Signals" },
  ],
  subscriptions: [
    { id: "subscriptions-overview", label: "Overview" },
    { id: "subscriptions-tiers", label: "Tiers" },
    { id: "subscriptions-premium", label: "Premium" },
  ],
  settings: [
    { id: "account-settings", label: "Account" },
    { id: "install-app", label: "Install" },
    { id: "news-region", label: "Region" },
    { id: "alerts-plan", label: "Alerts" },
    { id: "routine-preferences", label: "Routine" },
    { id: "partner-testing", label: "Testing" },
    { id: "feedback-board", label: "Feedback" },
    { id: "web-targets", label: "Targets" },
  ],
};

export const DEFAULT_PAGE = NAV_ITEMS[0].id;

export const MARKET_DESKS = [
  {
    id: "forex",
    label: "Forex",
    shortLabel: "FX",
    heading: "Forex Desk",
    blurb: "USD/ZAR and EUR/USD setups built around the 8/21 EMA cross, retest, and clean trend continuation.",
  },
  {
    id: "etfs",
    label: "ETFs",
    shortLabel: "ETF",
    heading: "ETF Desk",
    blurb: "SPY, QQQ, and GLD give you index, tech, and macro expression without leaving the same workflow.",
  },
  {
    id: "crypto",
    label: "Crypto",
    shortLabel: "CRYPTO",
    heading: "Crypto Desk",
    blurb: "BTC/USD sits in its own lane with faster volatility and the same disciplined EMA framework.",
  },
  {
    id: "jse",
    label: "JSE",
    shortLabel: "LOCAL",
    heading: "JSE Desk",
    blurb: "South African index exposure stays close to the macro feed and local market rhythm.",
  },
];

export const DESK_PLAYBOOKS = {
  all: {
    watchlist: "Cross-market scan",
    venue: "Desk-specific routing",
    cadence: "Start broad, then narrow to the cleanest setup.",
    risk: "Only act where structure, news, and momentum line up cleanly.",
  },
  forex: {
    watchlist: "USD/ZAR and EUR/USD",
    venue: "Macro-led currency execution",
    cadence: "Best around London and New York participation windows.",
    risk: "Respect the 21 EMA retest and widen risk around hard macro events.",
  },
  etfs: {
    watchlist: "SPY, QQQ, and GLD",
    venue: "US session ETF flow",
    cadence: "Favor clean continuation after the cash open settles.",
    risk: "Avoid forcing entries into midday drift or weak follow-through volume.",
  },
  crypto: {
    watchlist: "BTC/USD and BTC/ZAR routing",
    venue: "Always-on crypto execution",
    cadence: "Use multi-timeframe alignment before chasing momentum.",
    risk: "Size down into weekend volatility and overextended RSI heat.",
  },
  jse: {
    watchlist: "Top40-linked local exposure",
    venue: "South African market rhythm",
    cadence: "Stay close to local macro headlines and opening direction.",
    risk: "Be selective when liquidity thins or USD/ZAR is whipping around.",
  },
};

export const ORDER_TICKET_PRESETS = {
  forex: {
    deskLabel: "Forex desk",
    unitLabel: "units",
    defaultQuantity: "1",
    quantityStep: "1",
    minQuantity: "1",
    timingHint: "Best when London or New York participation confirms the move.",
    notePlaceholder: "Macro trigger, retest level, and invalidation if the 21 EMA fails.",
    executionCue: "Stay alert to scheduled macro data and sharp rand volatility.",
    stopDistancePercent: 0.6,
    targetDistancePercent: 1.2,
    defaultRiskBudget: "500",
    warnings: [
      "Avoid forcing entries into high-impact macro releases.",
      "Respect the 21 EMA retest before sizing up.",
    ],
    checklist: [
      "Anchor trend agrees with the side you are taking.",
      "Gap state and retest are still supportive.",
      "Macro headline risk is understood before entry.",
    ],
  },
  etfs: {
    deskLabel: "ETF desk",
    unitLabel: "shares",
    defaultQuantity: "1",
    quantityStep: "1",
    minQuantity: "1",
    timingHint: "Prefer clean continuation after the US cash session settles.",
    notePlaceholder: "Session flow, level, and why this ETF should keep following through.",
    executionCue: "Use cash-session participation as your quality filter.",
    stopDistancePercent: 1.5,
    targetDistancePercent: 3,
    defaultRiskBudget: "750",
    warnings: [
      "Midday ETF drift can fake momentum without real follow-through.",
      "Do not chase a stretched candle into obvious resistance.",
    ],
    checklist: [
      "Broad index tone supports the trade.",
      "Volume is not fading on the push.",
      "The setup still looks clean after the open.",
    ],
  },
  crypto: {
    deskLabel: "Crypto desk",
    unitLabel: "BTC",
    defaultQuantity: "0.001",
    quantityStep: "0.00000001",
    minQuantity: "0.00000001",
    timingHint: "Wait for 1H, 4H, and daily context to stop fighting each other.",
    notePlaceholder: "Timeframe alignment, liquidity pocket, and invalidation if momentum fades.",
    executionCue: "Crypto trades around the clock, so poor timing gets punished fast.",
    stopDistancePercent: 3,
    targetDistancePercent: 6,
    defaultRiskBudget: "600",
    warnings: [
      "Weekend liquidity and funding squeezes can reverse a clean-looking entry fast.",
      "If live routing is on, this can become a real venue order immediately.",
    ],
    checklist: [
      "Multi-timeframe technical pulse is aligned enough to act.",
      "The move is not purely derivative-driven exhaustion.",
      "You know where the trade is wrong before you submit it.",
    ],
  },
  jse: {
    deskLabel: "JSE desk",
    unitLabel: "shares",
    defaultQuantity: "1",
    quantityStep: "1",
    minQuantity: "1",
    timingHint: "Stay close to local market rhythm and USD/ZAR tone.",
    notePlaceholder: "Local catalyst, opening tone, and what would invalidate the trade.",
    executionCue: "Local liquidity can thin quickly, so patience matters.",
    stopDistancePercent: 1.2,
    targetDistancePercent: 2.4,
    defaultRiskBudget: "500",
    warnings: [
      "Thin local liquidity can exaggerate slippage and false breaks.",
      "Respect USD/ZAR swings when local direction feels unstable.",
    ],
    checklist: [
      "Local macro context still supports the setup.",
      "The trade is not fighting the broader rand move.",
      "There is enough liquidity to justify the entry.",
    ],
  },
  collectible: {
    deskLabel: "LEGO investment desk",
    unitLabel: "items",
    defaultQuantity: "1",
    quantityStep: "1",
    minQuantity: "1",
    timingHint: "Think in holding horizon, buyer depth, and resale friction.",
    notePlaceholder: "Why this item should appreciate, how long you expect to hold it, and what would change your mind.",
    executionCue: "These positions are paper-tracked investment ideas, not live venue orders.",
    stopDistancePercent: 8,
    targetDistancePercent: 18,
    defaultRiskBudget: "1500",
    warnings: [
      "Liquidity is slower and depends on buyer demand, not instant order books.",
      "Condition, edition, and patience matter more than chart speed here.",
    ],
    checklist: [
      "The collectible has a clear demand thesis.",
      "You are comfortable with a slower exit path.",
      "The entry fits the longer hold profile.",
    ],
  },
};

export const DESK_FILTERS = [{ id: "all", label: "All Markets" }, ...MARKET_DESKS];
export const DEFAULT_DESK = MARKET_DESKS[0].id;

export const INTRO_ACTIONS = [
  {
    id: "home",
    ordinal: "00",
    glyph: "HM",
    eyebrow: "Hub",
    title: "Dashboard",
    page: "home",
    sectionId: "home-dashboard",
    destination: "Executive Dashboard",
    blurb: "Land on the executive dashboard first — portfolio value, growth, and AI summary in one view.",
  },
  {
    id: "news",
    ordinal: "01",
    glyph: "NW",
    eyebrow: "Macro",
    title: "News",
    page: "news",
    sectionId: "macro-feed",
    destination: "Macro Feed",
    blurb: "Start with the headline tape, South African context, and the macro drivers shaping the next move.",
  },
  {
    id: "trade",
    ordinal: "02",
    glyph: "TR",
    eyebrow: "Desk",
    title: "Trade",
    page: "signals",
    sectionId: "signals-grid",
    destination: "Signals Grid",
    blurb: "Go straight to the active trading desk, open setups, chart structure, and execution tickets.",
  },
  {
    id: "collectibles",
    ordinal: "03",
    glyph: "CL",
    eyebrow: "Alt",
    title: "LEGO Investments",
    page: "collectibles",
    sectionId: "investment-analysis",
    destination: "LEGO Investment Focus",
    blurb: "Open LEGO, Pokemon, and LEGO investment holdings positions with their own ticket workflow.",
  },
  {
    id: "portfolio",
    ordinal: "04",
    glyph: "PF",
    eyebrow: "Book",
    title: "Portfolio",
    page: "portfolio",
    sectionId: "portfolio-intelligence",
    destination: "Collection Intelligence",
    blurb: "Review LEGO collection NAV, growth, theme allocation, and Brick Alpha holdings.",
  },
  {
    id: "settings",
    ordinal: "05",
    glyph: "ST",
    eyebrow: "Setup",
    title: "Settings",
    page: "settings",
    sectionId: "news-region",
    destination: "Account Controls",
    blurb: "Check region, market intelligence status, connectors, and desk configuration before you start.",
  },
  {
    id: "reports",
    ordinal: "06",
    glyph: "RP",
    eyebrow: "Review",
    title: "Research Center",
    page: "reports",
    sectionId: "reports-performance",
    destination: "Performance Research",
    blurb: "Review trade performance, signal pressure, desk exposure, and portfolio analytics in one visual workspace.",
  },
  {
    id: "subscriptions",
    ordinal: "07",
    glyph: "SB",
    eyebrow: "Plans",
    title: "Subscriptions",
    page: "subscriptions",
    sectionId: "subscriptions-overview",
    destination: "Subscription plans",
    blurb: "Show what is included today, what becomes premium, and how the product monetizes cleanly.",
  },
  {
    id: "tools",
    ordinal: "08",
    glyph: "TL",
    eyebrow: "Assist",
    title: "Tools",
    page: "tools",
    sectionId: "tools-workbench",
    destination: "Tools Workbench",
    blurb: "Use the mentor, analyzer, simulator, and research workspace before you commit to a trade.",
  },
  {
    id: "connections",
    ordinal: "09",
    glyph: "CN",
    eyebrow: "Route",
    title: "Connections",
    page: "connections",
    sectionId: "connections-overview",
    destination: "Connections Overview",
    blurb: "Check brokers, venues, market feeds, and live routing readiness in one place.",
  },
];

export const TRADE_PATHS = [
  {
    id: "forex",
    page: "signals",
    desk: "forex",
    glyph: "FX",
    eyebrow: "FX",
    title: "Trade Forex",
    destination: "Forex Desk",
    blurb: "Macro pairs like USD/ZAR and EUR/USD with disciplined 8/21 trend execution.",
  },
  {
    id: "etfs",
    page: "signals",
    desk: "etfs",
    glyph: "ET",
    eyebrow: "ETF",
    title: "Trade ETFs",
    destination: "ETF Desk",
    blurb: "Trade SPY, QQQ, and GLD through the same signal, chart, and ticket workflow.",
  },
  {
    id: "crypto",
    page: "signals",
    desk: "crypto",
    glyph: "CR",
    eyebrow: "CRYPTO",
    title: "Trade Crypto",
    destination: "Crypto Desk",
    blurb: "Keep a separate desk for BTC momentum, pullbacks, and faster execution decisions.",
  },
  {
    id: "jse",
    page: "signals",
    desk: "jse",
    glyph: "JS",
    eyebrow: "LOCAL",
    title: "Trade JSE",
    destination: "JSE Desk",
    blurb: "Stay close to South African market structure with a dedicated local desk view.",
  },
  {
    id: "collectibles",
    page: "collectibles",
    desk: null,
    glyph: "AL",
    eyebrow: "ALT",
    title: "Analyze LEGO Investments",
    destination: "LEGO Investments",
    blurb: "Analyze LEGO sets and investment-grade collectibles with the same ticket workflow.",
  },
];

export const RESEARCH_REPORTS = [
  {
    id: "ema-framework",
    title: "8 and 21 EMA Trading Strategy",
    subtitle: "Trend continuation, retest logic, and disciplined exits.",
    desk: "signals",
    targetDesk: "forex",
    targetSection: "chart-panel",
  },
  {
    id: "forex-report",
    title: "Forex Market Trends Comprehensive Report",
    subtitle: "South Africa-aware macro context for FX positioning and trend bias.",
    desk: "news",
    targetDesk: "forex",
    targetSection: "macro-feed",
  },
  {
    id: "bitcoin-fibonacci",
    title: "Bitcoin Fibonacci Analysis",
    subtitle: "Fib pivots, correction zones, and BTC structure for the crypto desk.",
    desk: "signals",
    targetDesk: "crypto",
    targetSection: "chart-panel",
  },
];

export const RAILS = [
  "IBKR (Global)",
  "Saxo (Wealth)",
  "VALR (Crypto)",
  "EasyEquities (JSE)",
];

export const PARTNER_TEST_FLOW = [
  {
    id: "briefing",
    ordinal: "01",
    title: "Test briefing",
    detail: "Start from the public link in a fresh session, then check that the intro screen, desk selection, and auth flow feel clear and deliberate.",
    page: "settings",
    desk: null,
    sectionId: "partner-testing",
  },
  {
    id: "news",
    ordinal: "02",
    title: "News",
    detail: "Read the macro tape, confirm local versus global context, and test whether the lead story feels useful.",
    page: "news",
    desk: "forex",
    sectionId: "macro-feed",
  },
  {
    id: "trade",
    ordinal: "03",
    title: "Trade desk",
    detail: "Open a live signal, inspect the chart, and test whether the ticket makes the trade plan obvious.",
    page: "signals",
    desk: "forex",
    sectionId: "chart-panel",
  },
  {
    id: "collectibles",
    ordinal: "04",
    title: "LEGO Investments",
    detail: "Review LEGO investment holdings versus market intelligence and test whether the workflow stays inside Brick Alpha.",
    page: "collectibles",
    desk: null,
    sectionId: "collectibles-grid",
  },
  {
    id: "feedback",
    ordinal: "05",
    title: "Feedback board",
    detail: "Leave one structured note with area, severity, and reproduction context so the board stays actionable.",
    page: "settings",
    desk: null,
    sectionId: "feedback-board",
  },
];
