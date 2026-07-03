export const ENTRY_ONBOARDING_SLIDES = [
  {
    id: "news",
    glyph: "NW",
    eyebrow: "Macro first",
    title: "Read the market before you act.",
    description:
      "Start with desk-aware headlines, South African context, and the macro tape that frames the session.",
    accent: "news",
    bars: [48, 82, 62, 92],
  },
  {
    id: "trade",
    glyph: "TR",
    eyebrow: "Structured execution",
    title: "Trade from signals and structure.",
    description:
      "Charts, 8/21 EMA setups, stop and target planning, and tickets stay connected in one flow.",
    accent: "trade",
    bars: [56, 74, 88, 68],
  },
  {
    id: "collectibles",
    glyph: "CL",
    eyebrow: "Alternative assets",
    title: "Keep LEGO investments in the same workspace.",
    description:
      "LEGO, Pokemon, portfolio review, and route readiness all sit inside the same mobile product shell.",
    accent: "collectibles",
    bars: [42, 68, 54, 80],
  },
];

export const ENTRY_FLOW_STEPS = [
  {
    id: "access",
    label: "Step 1",
    title: "Account access",
    detail: "Create your account or sign in securely.",
  },
  {
    id: "summary",
    label: "Step 2",
    title: "Service summary",
    detail: "See the product clearly before you move into the workspace.",
  },
  {
    id: "home",
    label: "Step 3",
    title: "Dashboard workspace",
    detail: "Use the Dashboard as your portfolio command center and service launch point.",
  },
];

export const PRIMARY_SERVICE_BLUEPRINTS = [
  {
    id: "news",
    ordinal: "01",
    glyph: "NW",
    title: "News",
    tag: "Macro tape",
    tone: "news",
    page: "news",
    introId: "news",
    sectionId: "macro-feed",
    deskMode: "launch",
    homeHint: "Read the tape before you act.",
    summaryDetail: ({ launchDeskLabel }) =>
      `${launchDeskLabel} headlines, South African context, and the live desk narrative.`,
  },
  {
    id: "trading",
    ordinal: "02",
    glyph: "TR",
    title: "Trading",
    tag: "Signal desk",
    tone: "trade",
    page: "signals",
    introId: "trade",
    sectionId: "signals-grid",
    deskMode: "trade",
    homeHint: "Open the chart, structure plan, and ticket.",
    summaryDetail: ({ defaultTradingDeskLabel }) =>
      `${defaultTradingDeskLabel} signals, tickets, and structure planning.`,
  },
  {
    id: "crypto",
    ordinal: "03",
    glyph: "CR",
    title: "Crypto",
    tag: "BTC lane",
    tone: "crypto",
    page: "signals",
    introId: "trade",
    sectionId: "signals-grid",
    deskMode: "crypto",
    homeHint: "Jump straight into the crypto technical pulse.",
    summaryDetail: () => "Jump straight into the crypto desk, technical pulse, and RSI context.",
  },
  {
    id: "collectibles",
    ordinal: "04",
    glyph: "CL",
    title: "LEGO Investments",
    tag: "Alt assets",
    tone: "collectibles",
    page: "collectibles",
    introId: "collectibles",
    sectionId: "investment-analysis",
    deskMode: "launch",
    homeHint: "Alternative-assets holdings with the same discipline.",
    summaryDetail: () => "Open LEGO, Pokemon, and the LEGO investment holdings workflow.",
  },
  {
    id: "portfolio",
    ordinal: "05",
    glyph: "PF",
    title: "Portfolio",
    tag: "Review",
    tone: "portfolio",
    page: "portfolio",
    introId: "portfolio",
    sectionId: "open-positions",
    deskMode: "launch",
    homeHint: "Review open positions and your latest close decisions.",
    summaryDetail: () => "See open positions, recent activity, and the current book at a glance.",
  },
];

export const SECONDARY_SERVICE_BLUEPRINTS = [
  {
    id: "reports",
    ordinal: "06",
    glyph: "RP",
    title: "Research Center",
    tag: "Review",
    tone: "support",
    page: "reports",
    introId: "reports",
    sectionId: "reports-performance",
    deskMode: "launch",
    homeHint: "Open performance graphs, desk exposure, and signal analytics.",
    summaryDetail: () => "Performance graphs",
  },
  {
    id: "subscriptions",
    ordinal: "07",
    glyph: "SB",
    title: "Subscriptions",
    tag: "Plans",
    tone: "support",
    page: "subscriptions",
    introId: "subscriptions",
    sectionId: "subscriptions-overview",
    deskMode: "launch",
    homeHint: "Open plan tiers, premium value, and the commercial upgrade path.",
    summaryDetail: () => "Plans and premium value",
  },
  {
    id: "tools",
    ordinal: "08",
    glyph: "TL",
    title: "Tools",
    tag: "Assist",
    tone: "support",
    page: "tools",
    introId: "tools",
    sectionId: "tools-workbench",
    deskMode: "launch",
    homeHint: "Mentor, analyzer, simulator, and research stack.",
    summaryDetail: () => "Analyzer and simulator",
  },
  {
    id: "connections",
    ordinal: "09",
    glyph: "CN",
    title: "Connections",
    tag: "Route",
    tone: "support",
    page: "connections",
    introId: "connections",
    sectionId: "connections-overview",
    deskMode: "launch",
    homeHint: "Feeds, brokers, and live-routing readiness.",
    summaryDetail: () => "Feeds and routing",
  },
  {
    id: "settings",
    ordinal: "10",
    glyph: "ST",
    title: "Settings",
    tag: "Setup",
    tone: "support",
    page: "settings",
    introId: "settings",
    sectionId: "news-region",
    deskMode: "launch",
    homeHint: "Workspace preferences, region, and setup.",
    summaryDetail: () => "Account and setup",
  },
];

function resolveDeskForBlueprint(blueprint, launchDesk, defaultTradingDesk) {
  if (blueprint.deskMode === "trade") {
    return defaultTradingDesk;
  }

  if (blueprint.deskMode === "crypto") {
    return "crypto";
  }

  return launchDesk;
}

function buildSelection(blueprint, launchDesk, defaultTradingDesk) {
  return {
    page: blueprint.page,
    desk: resolveDeskForBlueprint(blueprint, launchDesk, defaultTradingDesk),
    introId: blueprint.introId,
    sectionId: blueprint.sectionId,
  };
}

export function buildHomeEntrySelection(launchDesk) {
  return {
    page: "home",
    desk: launchDesk,
    introId: "home",
    sectionId: "home-overview",
    landingId: "home",
  };
}

export function buildPrimaryServiceRows({
  launchDesk,
  launchDeskLabel,
  defaultTradingDesk,
  defaultTradingDeskLabel,
}) {
  return PRIMARY_SERVICE_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    detail: blueprint.summaryDetail({
      launchDesk,
      launchDeskLabel,
      defaultTradingDesk,
      defaultTradingDeskLabel,
    }),
    selection: buildSelection(blueprint, launchDesk, defaultTradingDesk),
  }));
}

export function buildSecondaryServiceRows({
  launchDesk,
  launchDeskLabel,
  defaultTradingDesk,
  defaultTradingDeskLabel,
}) {
  return SECONDARY_SERVICE_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    detail: blueprint.summaryDetail({
      launchDesk,
      launchDeskLabel,
      defaultTradingDesk,
      defaultTradingDeskLabel,
    }),
    selection: buildSelection(blueprint, launchDesk, defaultTradingDesk),
  }));
}

export function buildPrimaryLaunchDefinitions(activeDesk) {
  const launchDesk = activeDesk;
  const defaultTradingDesk = activeDesk === "crypto" ? "forex" : activeDesk;

  return PRIMARY_SERVICE_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    selection: buildSelection(blueprint, launchDesk, defaultTradingDesk),
  }));
}

export function buildSecondaryLaunchDefinitions(activeDesk) {
  const launchDesk = activeDesk;
  const defaultTradingDesk = activeDesk === "crypto" ? "forex" : activeDesk;

  return SECONDARY_SERVICE_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    selection: buildSelection(blueprint, launchDesk, defaultTradingDesk),
  }));
}

export function buildWorkspaceLaunchDefinitions(activeDesk) {
  return [
    ...buildPrimaryLaunchDefinitions(activeDesk),
    ...buildSecondaryLaunchDefinitions(activeDesk),
  ];
}
