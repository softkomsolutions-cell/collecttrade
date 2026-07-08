export const ENTRY_ONBOARDING_SLIDES = [
  {
    id: "scan-evaluate",
    glyph: "📷",
    eyebrow: "Start",
    title: "Scan a set and get a verdict.",
    description:
      "Scan a set photo, upload evidence, or enter a set number to generate a saved investment verdict.",
    accent: "collectibles",
    bars: [48, 82, 62, 92],
  },
  {
    id: "investment-analysis",
    glyph: "IA",
    eyebrow: "Analyse",
    title: "Understand the Brick Alpha score.",
    description:
      "Deep-dive into Brick Alpha score, retirement timing, forecasts, risks, and “Why This Score?”",
    accent: "collectibles",
    bars: [56, 74, 88, 68],
  },
  {
    id: "portfolio-intelligence",
    glyph: "PF",
    eyebrow: "Review",
    title: "Track portfolio intelligence over time.",
    description:
      "Track holdings, allocation, growth, and AI portfolio recommendations in one premium workspace.",
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
    id: "scan-evaluate",
    ordinal: "01",
    glyph: "📷",
    title: "Scan & Evaluate",
    tag: "START",
    tone: "scan",
    page: "scan-evaluate",
    introId: "scan-evaluate",
    sectionId: "scan-evaluate",
    deskMode: "launch",
    homeHint: "Scan a set and generate a saved verdict.",
    valueBadges: ["Brick Alpha Score", "Retirement Forecasts", "Portfolio Growth"],
    summaryDetail: () =>
      "Scan a set photo, upload evidence, or enter a set number to generate a saved investment verdict.",
  },
  {
    id: "collectibles",
    ordinal: "02",
    glyph: "IA",
    title: "Investment Analysis",
    tag: "ANALYSE",
    tone: "collectibles",
    page: "collectibles",
    introId: "collectibles",
    sectionId: "investment-analysis",
    deskMode: "launch",
    homeHint: "Deep-dive into scores, timing, and risks.",
    valueBadges: ["Brick Alpha Score", "Retirement Forecasts", "Portfolio Growth"],
    summaryDetail: () =>
      "Deep-dive into Brick Alpha score, retirement timing, forecasts, risks, and “Why This Score?”",
  },
  {
    id: "portfolio",
    ordinal: "03",
    glyph: "PF",
    title: "Portfolio Intelligence",
    tag: "REVIEW",
    tone: "portfolio",
    page: "portfolio",
    introId: "portfolio",
    sectionId: "open-positions",
    deskMode: "launch",
    homeHint: "Track holdings, allocation, and growth.",
    valueBadges: ["Brick Alpha Score", "Retirement Forecasts", "Portfolio Growth"],
    summaryDetail: () =>
      "Track holdings, allocation, growth, and AI portfolio recommendations.",
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
