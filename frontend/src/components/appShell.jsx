import { useState } from "react";
import {
  INTRO_ACTIONS,
  NAV_ITEMS,
  PARTNER_TEST_FLOW,
  SCREEN_PREVIEWS,
  TRADE_PATHS,
} from "../appConfig";
import {
  defaultIntroIdForPage,
  defaultSectionIdForIntro,
  labelDesk,
  normalizeDesk,
  readLaunchPreference,
  workspaceLabel,
} from "../appUtils";

export function EmptyState({ title, body }) {
  return (
    <div className="emptyState">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function WorkspaceHero({
  tone = "blue",
  eyebrow,
  title,
  description,
  metrics = [],
  statusLabel,
  statusValue,
  primaryAction,
  secondaryAction,
}) {
  return (
    <section className={`workspaceHero workspaceHero-${tone}`}>
      <div className="workspaceHeroCopy">
        {eyebrow ? <div className="workspaceHeroEyebrow">{eyebrow}</div> : null}
        <div className="workspaceHeroText">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        {primaryAction || secondaryAction ? (
          <div className="workspaceHeroActions">
            {primaryAction ? (
              <button type="button" className="primaryButton" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryAction ? (
              <button type="button" className="ghostButton" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="workspaceHeroRail">
        {statusLabel || statusValue ? (
          <div className="workspaceHeroStatus">
            <span>{statusLabel || "Status"}</span>
            <strong>{statusValue || "--"}</strong>
          </div>
        ) : null}

        <div className="workspaceHeroMetricGrid">
          {metrics.map((metric) => (
            <div className="workspaceHeroMetric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.detail ? <small>{metric.detail}</small> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkspaceSectionBar({ title = "On this screen", sections, onSelect }) {
  if (!sections?.length) {
    return null;
  }

  return (
    <section className="workspaceSectionBar">
      <div className="workspaceSectionBarHeader">
        <span>{title}</span>
        <small>Jump directly to the part of the workspace you need.</small>
      </div>
      <div className="workspaceSectionChipRow">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className="workspaceSectionChip"
            onClick={() => onSelect(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function WorkspaceCommandBar({
  title = "Quick Actions",
  hint = "Use these shortcuts to move through the workflow without hunting around.",
  tone = "default",
  actions = [],
}) {
  const visibleActions = actions.filter(Boolean);

  if (!visibleActions.length) {
    return null;
  }

  return (
    <section className={`workspaceCommandBar workspaceCommandBar-${tone}`}>
      <div className="workspaceCommandBarHeader">
        <span>{title}</span>
        <small>{hint}</small>
      </div>
      <div className="workspaceCommandGrid">
        {visibleActions.map((action) => (
          <button
            key={action.id || action.label}
            type="button"
            className={`workspaceCommandCard ${action.active ? "active" : ""}`}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            <div className="workspaceCommandCardTop">
              <span>{action.label}</span>
              {action.meta ? <strong>{action.meta}</strong> : null}
            </div>
            {action.detail ? <small>{action.detail}</small> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export function BootSplash() {
  return (
    <div className="bootSplashShell" aria-label="Collecttrade is opening">
      <div className="bootSplashPanel">
        <div className="bootSplashMark">CT</div>
        <div className="bootSplashWordmark">COLLECTRADE</div>
        <div className="bootSplashTag">Signals | News | Collectibles</div>
        <div className="bootSplashPulse" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export function SplashScreen({ ready, activeDesk, onLaunch }) {
  const savedLaunch = readLaunchPreference();
  const launchDesk = savedLaunch?.desk || normalizeDesk(activeDesk);
  const defaultTradingDesk = launchDesk === "crypto" ? "forex" : launchDesk;
  const partnerLaunch = {
    page: "home",
    desk: "forex",
    introId: "home",
    sectionId: "home-partner",
  };
  const savedLaunchLabel = savedLaunch ? workspaceLabel(savedLaunch.page, savedLaunch.desk) : null;
  const serviceMenuRows = [
    {
      id: "news",
      ordinal: "01",
      glyph: "NW",
      title: "News",
      tag: "Macro tape",
      tone: "news",
      detail: `${labelDesk(launchDesk)} headlines, South African context, and the live desk narrative.`,
      selection: {
        page: "news",
        desk: launchDesk,
        introId: "news",
        sectionId: "macro-feed",
      },
    },
    {
      id: "trading",
      ordinal: "02",
      glyph: "TR",
      title: "Trading",
      tag: "Signal desk",
      tone: "trade",
      detail: `${labelDesk(defaultTradingDesk)} signals, tickets, and structure planning.`,
      selection: {
        page: "signals",
        desk: defaultTradingDesk,
        introId: "trade",
        sectionId: "signals-grid",
      },
    },
    {
      id: "crypto",
      ordinal: "03",
      glyph: "CR",
      title: "Crypto",
      tag: "BTC lane",
      tone: "crypto",
      detail: "Jump straight into the crypto desk, technical pulse, and RSI context.",
      selection: {
        page: "signals",
        desk: "crypto",
        introId: "trade",
        sectionId: "signals-grid",
      },
    },
    {
      id: "collectibles",
      ordinal: "04",
      glyph: "CL",
      title: "Collectibles",
      tag: "Alt assets",
      tone: "collectibles",
      detail: "Open LEGO, Pokemon, and the tradable inventory workflow.",
      selection: {
        page: "collectibles",
        desk: launchDesk,
        introId: "collectibles",
        sectionId: "collectibles-focus",
      },
    },
    {
      id: "portfolio",
      ordinal: "05",
      glyph: "PF",
      title: "Portfolio",
      tag: "Review",
      tone: "portfolio",
      detail: "See open positions, recent activity, and the current book at a glance.",
      selection: {
        page: "portfolio",
        desk: launchDesk,
        introId: "portfolio",
        sectionId: "open-positions",
      },
    },
  ];
  const supportMenuRows = [
    {
      id: "reports",
      title: "Reports",
      detail: "Performance graphs",
      selection: { page: "reports", desk: launchDesk, introId: "reports", sectionId: "reports-performance" },
    },
    {
      id: "tools",
      title: "Tools",
      detail: "Analyzer and simulator",
      selection: { page: "tools", desk: launchDesk, introId: "tools", sectionId: "tools-workbench" },
    },
    {
      id: "connections",
      title: "Connections",
      detail: "Feeds and routing",
      selection: {
        page: "connections",
        desk: launchDesk,
        introId: "connections",
        sectionId: "connections-overview",
      },
    },
    {
      id: "settings",
      title: "Settings",
      detail: "Account and setup",
      selection: { page: "settings", desk: launchDesk, introId: "settings", sectionId: "news-region" },
    },
  ];
  const onboardingSlides = [
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
      title: "Keep collectibles in the same workspace.",
      description:
        "LEGO, Pokemon, portfolio review, and route readiness all sit inside the same mobile product shell.",
      accent: "collectibles",
      bars: [42, 68, 54, 80],
    },
  ];
  const [onboardingStep, setOnboardingStep] = useState(0);
  const onboardingComplete = onboardingStep >= onboardingSlides.length;
  const currentOnboardingSlide =
    onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)];

  const advanceOnboarding = () => {
    setOnboardingStep((step) => Math.min(step + 1, onboardingSlides.length));
  };

  const resetOnboarding = () => {
    setOnboardingStep(0);
  };

  const skipOnboarding = () => {
    setOnboardingStep(onboardingSlides.length);
  };

  if (!onboardingComplete) {
    return (
      <div className="splashShell splashShellMobile">
        <div className="onboardingPanel">
          <div className="onboardingTopBar">
            <div className="authBrand">COLLECTRADE</div>
            <button type="button" className="ghostButton onboardingSkipButton" onClick={skipOnboarding}>
              Skip
            </button>
          </div>

          <div className={`onboardingCard onboardingCard-${currentOnboardingSlide.accent}`}>
            <div className="onboardingGraphic">
              <div className="onboardingGraphicFrame">
                <div className="onboardingGraphicChrome">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="onboardingGraphicStage">
                  <div className="onboardingGraphicBadge">{currentOnboardingSlide.glyph}</div>
                  <div className="onboardingGraphicBars">
                    {currentOnboardingSlide.bars.map((bar, index) => (
                      <span key={`${currentOnboardingSlide.id}-${bar}-${index}`} style={{ height: `${bar}%` }} />
                    ))}
                  </div>
                </div>
                <div className="onboardingGraphicFooter">
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="splashEyebrow">{currentOnboardingSlide.eyebrow}</div>
            <h1>{currentOnboardingSlide.title}</h1>
            <p className="authBlurb">{currentOnboardingSlide.description}</p>
          </div>

          <div className="onboardingFooter">
            <div className="onboardingDots" aria-label="Onboarding progress">
              {onboardingSlides.map((slide, index) => (
                <span
                  key={slide.id}
                  className={`onboardingDot ${index === onboardingStep ? "active" : ""}`}
                />
              ))}
            </div>

            <button type="button" className="primaryButton onboardingPrimaryButton" onClick={advanceOnboarding}>
              {onboardingStep === onboardingSlides.length - 1 ? "Open Menu" : "Next"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="splashShell splashShellMobile">
      <div className="splashPanel splashPanelCompact splashMenuBackdrop">
        <div className="splashCompactHeader">
          <div className="authBrand">COLLECTRADE</div>
          <button type="button" className="ghostButton onboardingSkipButton" onClick={resetOnboarding}>
            View Intro
          </button>
        </div>

        <div className="splashCompactHero">
          <div className="splashEyebrow">Main Menu</div>
          <h1>Choose a service.</h1>
          <p className="authBlurb">Open one lane now. Each menu item takes you straight into its own screen.</p>
          <div className="splashHeroPillRow" aria-hidden="true">
            <span className="splashHeroPill">Macro</span>
            <span className="splashHeroPill">Signals</span>
            <span className="splashHeroPill">Collectibles</span>
          </div>
        </div>

        {savedLaunch ? (
          <button
            type="button"
            className="chooserResumeBar"
            onClick={() => onLaunch(savedLaunch)}
            disabled={!ready}
          >
            <div className="chooserResumeCopy">
              <span>Resume</span>
              <strong>{savedLaunchLabel}</strong>
              <small>Continue from your last route.</small>
            </div>
            <div className="mobileMenuRowArrow">-&gt;</div>
          </button>
        ) : null}

        <section className="splashSection splashSectionCompact">
          <div className="splashSectionHeader">
            <div>
              <span>Services</span>
              <strong>Main workspaces</strong>
            </div>
          </div>

          <div className="mobileMenuScreenList splashServiceMenuList">
            {serviceMenuRows.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mobileMenuRow mobileMenuRow-${item.tone}`}
                onClick={() => onLaunch(item.selection)}
                disabled={!ready}
              >
                <div className="mobileMenuRowGlyph">{item.glyph}</div>
                <div className="mobileMenuRowCopy">
                  <div className="mobileMenuRowTop">
                    <span>{item.ordinal}</span>
                    <small>{item.tag}</small>
                  </div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <div className="mobileMenuRowArrow">-&gt;</div>
              </button>
            ))}
          </div>
        </section>

        <section className="splashSection splashSectionCompact">
          <div className="splashSectionHeader">
            <div>
              <span>More</span>
              <strong>Reports and setup</strong>
            </div>
          </div>

          <div className="mobileMenuSupportList chooserSupportList">
            {supportMenuRows.map((item) => (
              <button
                key={item.id}
                type="button"
                className="mobileMenuSupportCard"
                onClick={() => onLaunch(item.selection)}
                disabled={!ready}
              >
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="chooserActionRow chooserActionRowSplit">
          <button
            type="button"
            className="ghostButton splashRailButton"
            onClick={() => onLaunch(partnerLaunch)}
          >
            Partner route
          </button>
          <button
            type="button"
            className="ghostButton splashRailButton"
            onClick={resetOnboarding}
          >
            Replay intro
          </button>
        </div>
      </div>
    </div>
  );
}

function describeLaunchSelection(page, desk, sectionId) {
  if (page === "home") {
    return {
      label: "Workspace Home",
      hint: "You'll land on the hub with quick launch, session context, and partner-readiness cards.",
    };
  }

  if (page === "news") {
    return {
      label: `${labelDesk(desk)} News`,
      hint: "You'll land on the macro feed with the selected desk framing the tape.",
    };
  }

  if (page === "signals" && sectionId === "signals-grid") {
    return {
      label: `${labelDesk(desk)} Alpha Signals`,
      hint: "You'll land on the live signals grid with the desk filter already applied.",
    };
  }

  if (page === "signals") {
    return {
      label: `${labelDesk(desk)} Trade Desk`,
      hint: "You'll go straight into the chart, active setup, and ticket workflow.",
    };
  }

  if (page === "reports") {
    return {
      label: "Reports",
      hint: "You'll land on the visual reporting workspace with performance, exposure, and signal analytics.",
    };
  }

  return {
    label: workspaceLabel(page, desk),
    hint: "Your first workspace will be ready as soon as you sign in.",
  };
}

export function LandingShell({ initialLaunch, onContinue }) {
  const landingActions = [
    {
      id: "news",
      glyph: "NW",
      eyebrow: "Macro",
      title: "News",
      page: "news",
      introId: "news",
      sectionId: "macro-feed",
      destination: "Macro feed",
      bestFor: "Start with context",
      blurb: "Start with the tape, South African context, and the headlines driving the next move.",
    },
    {
      id: "alpha-signals",
      glyph: "AS",
      eyebrow: "Signals",
      title: "Alpha Signals",
      page: "signals",
      introId: "trade",
      sectionId: "signals-grid",
      destination: "Signals grid",
      bestFor: "Scan clean setups",
      blurb: "Open the filtered signals grid first and scan the cleanest EMA setups before acting.",
    },
    {
      id: "trade",
      glyph: "TR",
      eyebrow: "Execution",
      title: "Trade Desk",
      page: "signals",
      introId: "trade",
      sectionId: "chart-panel",
      destination: "Active chart",
      bestFor: "Go straight to execution",
      blurb: "Go straight into the active chart, structure plan, and ticket workflow.",
    },
    {
      id: "collectibles",
      glyph: "CL",
      eyebrow: "Alt",
      title: "Collectibles",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-focus",
      destination: "Collectibles focus",
      bestFor: "Trade alternatives",
      blurb: "Trade LEGO, Pokemon, and alternative inventory with the same disciplined ticket flow.",
    },
  ];
  const secondaryActions = [
    {
      id: "home",
      glyph: "HM",
      eyebrow: "Hub",
      title: "Home",
      page: "home",
      introId: "home",
      sectionId: "home-overview",
      destination: "Workspace hub",
      blurb: "Open the product home first for quick launch, partner readiness, and recent session context.",
    },
    {
      id: "portfolio",
      glyph: "PF",
      eyebrow: "Book",
      title: "Portfolio",
      page: "portfolio",
      introId: "portfolio",
      sectionId: "open-positions",
      destination: "Open positions",
      blurb: "Review open positions, PnL, and recent closes before you put on the next trade.",
    },
    {
      id: "reports",
      glyph: "RP",
      eyebrow: "Review",
      title: "Reports",
      page: "reports",
      introId: "reports",
      sectionId: "reports-performance",
      destination: "Performance reports",
      blurb: "Open visual reporting with performance curves, desk exposure, and signal analytics.",
    },
    {
      id: "tools",
      glyph: "TL",
      eyebrow: "Assist",
      title: "Tools",
      page: "tools",
      introId: "tools",
      sectionId: "tools-workbench",
      destination: "Tools workbench",
      blurb: "Use the mentor, chart analyzer, simulator, and research shelf before you commit.",
    },
    {
      id: "connections",
      glyph: "CN",
      eyebrow: "Route",
      title: "Connections",
      page: "connections",
      introId: "connections",
      sectionId: "connections-overview",
      destination: "Connector overview",
      blurb: "Check brokers, live routing, feed health, and connector readiness in one place.",
    },
    {
      id: "settings",
      glyph: "ST",
      eyebrow: "Setup",
      title: "Settings",
      page: "settings",
      introId: "settings",
      sectionId: "news-region",
      destination: "Workspace settings",
      blurb: "Adjust region, workspace preferences, and saved desk targets before the session starts.",
    },
  ];
  const allActions = [...landingActions, ...secondaryActions];

  const initialPage = initialLaunch?.page || "news";
  const initialDesk = initialLaunch?.desk || "forex";
  const initialIntroId = initialLaunch?.introId || defaultIntroIdForPage(initialPage);
  const [selectedActionId, setSelectedActionId] = useState(
    allActions.some((action) => action.id === initialLaunch?.landingId)
      ? initialLaunch.landingId
      : allActions.find((action) => action.page === initialPage && action.sectionId === initialLaunch?.sectionId)
        ?.id || (initialPage === "signals" && initialLaunch?.sectionId === "chart-panel" ? "trade" : initialIntroId === "trade" ? "alpha-signals" : initialIntroId),
  );
  const [selectedPage, setSelectedPage] = useState(initialPage);
  const [selectedDesk, setSelectedDesk] = useState(initialDesk);
  const [selectedIntroId, setSelectedIntroId] = useState(initialIntroId);
  const [selectedSectionId, setSelectedSectionId] = useState(
    initialLaunch?.sectionId || defaultSectionIdForIntro(initialPage, initialIntroId),
  );

  const selectedAction =
    allActions.find((action) => action.id === selectedActionId) || allActions[0];
  const launchDetails = describeLaunchSelection(selectedPage, selectedDesk, selectedSectionId);
  const deskPathOptions = TRADE_PATHS.filter((path) => path.page === "signals");

  const handleActionSelect = (action) => {
    setSelectedActionId(action.id);
    setSelectedPage(action.page);
    setSelectedIntroId(action.introId);
    if (action.page === "signals" || action.page === "news") {
      setSelectedDesk((currentDesk) => normalizeDesk(currentDesk || initialDesk));
    }
    setSelectedSectionId(action.sectionId || defaultSectionIdForIntro(action.page, action.introId));
  };

  const handleTradePathSelect = (path) => {
    setSelectedDesk(path.desk || selectedDesk);
    setSelectedPage(path.page);
    setSelectedIntroId(path.page === "news" ? "news" : "trade");
    setSelectedSectionId(path.page === "signals" ? selectedSectionId : defaultSectionIdForIntro(path.page, "trade"));
  };

  return (
    <div className="splashShell landingShell">
      <div className="splashPanel landingPanel">
        <div className="splashHero landingHero">
          <div className="splashHeroCopy">
            <div className="authBrand">COLLECTRADE</div>
            <div className="splashEyebrow">TRADING WORKSPACE</div>
            <h1>One professional workspace for news, signals, trade execution, and collectibles.</h1>
            <p className="authBlurb">
              Collecttrade brings macro context, alpha signals, disciplined tickets, portfolio tracking,
              and alternative inventory into one professional workspace. Pick where you want to start,
              then sign in to continue.
            </p>

            <div className="landingValueGrid">
              <div className="landingValueCard">
                <span>Macro Context</span>
                <strong>South Africa-aware tape</strong>
                <small>Desk-aware headlines, honest timestamps, and route context before the trade.</small>
              </div>
              <div className="landingValueCard">
                <span>Alpha Signals</span>
                <strong>8 / 21 EMA workflow</strong>
                <small>Crosses, retests, structure plans, and visible exits baked into the desk.</small>
              </div>
              <div className="landingValueCard">
                <span>Execution</span>
                <strong>Paper first, live where ready</strong>
                <small>Venue-aware tickets, risk budgets, and saved workflows that stay coherent.</small>
              </div>
            </div>

            <div className="landingFeatureRow">
              <div className="landingFeatureChip">
                <span>Trading lanes</span>
                <strong>Forex, ETFs, Crypto, JSE</strong>
              </div>
              <div className="landingFeatureChip">
                <span>Alternative book</span>
                <strong>Collectibles inventory</strong>
              </div>
              <div className="landingFeatureChip">
                <span>Support stack</span>
                <strong>Tools and connections</strong>
              </div>
              <div className="landingFeatureChip">
                <span>Workspace state</span>
                <strong>Saved per account</strong>
              </div>
            </div>

            <div className="landingTesterCard">
              <span>Partner testing route</span>
              <strong>Landing, News, Trade Desk, Collectibles, Feedback Board</strong>
              <small>
                If this session is for partner feedback, use the built-in test pass so notes land in one
                place and cover the main product surfaces.
              </small>
              <div className="landingTesterSteps">
                {PARTNER_TEST_FLOW.map((step) => (
                  <div className="landingTesterStep" key={step.id}>
                    <span>{step.ordinal}</span>
                    <strong>{step.title}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="splashPreviewPanel landingPreviewPanel">
            <span>Session route</span>
            <strong>{launchDetails.label}</strong>
            <small>{launchDetails.hint}</small>

            <div className="splashPreviewGrid">
              <div className="splashPreviewCard">
                <span>Start</span>
                <strong>{selectedAction.title}</strong>
              </div>
              <div className="splashPreviewCard">
                <span>Desk</span>
                <strong>
                  {selectedPage === "signals" || selectedPage === "news"
                    ? labelDesk(selectedDesk)
                    : "Cross-workspace"}
                </strong>
              </div>
              <div className="splashPreviewCard">
                <span>Landing</span>
                <strong>{selectedSectionId ? "Focused" : "Default"}</strong>
              </div>
              <div className="splashPreviewCard">
                <span>Mode</span>
                <strong>Authentication required</strong>
              </div>
            </div>

            <div className="landingRouteStack">
              <div className="landingRouteStep">
                <span>01</span>
                <div>
                  <strong>Choose the lane</strong>
                  <small>{selectedAction.title} becomes your first working surface.</small>
                </div>
              </div>
              <div className="landingRouteStep">
                <span>02</span>
                <div>
                  <strong>Anchor the desk</strong>
                  <small>
                    {selectedPage === "signals" || selectedPage === "news"
                      ? `${labelDesk(selectedDesk)} frames the session.`
                      : "This workspace opens without a desk filter."}
                  </small>
                </div>
              </div>
              <div className="landingRouteStep">
                <span>03</span>
                <div>
                  <strong>Sign in and continue</strong>
                  <small>Your selected route is carried through auth and restored on entry.</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="splashSection">
          <div className="splashSectionHeader">
            <div>
              <span>Choose Your Start</span>
              <strong>Pick the workspace you want first</strong>
              <p>This is the app introduction screen your users should see before the login form.</p>
            </div>
          </div>

          <div className="splashGrid splashGridPrimary landingPrimaryGrid">
            {landingActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`splashCard splashCardPrimary ${selectedActionId === action.id ? "active" : ""}`}
                onClick={() => handleActionSelect(action)}
              >
                <div className="splashCardMeta">
                  <span className="splashGlyph">{action.glyph}</span>
                  <span className="splashCardFlag">{action.eyebrow}</span>
                </div>
                <div className="splashCardHeaderCopy">
                  <strong>{action.title}</strong>
                  <small>{action.blurb}</small>
                </div>
                <div className="landingChoiceMeta">
                  <div className="landingChoiceMetaItem">
                    <span>Best for</span>
                    <strong>{action.bestFor}</strong>
                  </div>
                  <div className="landingChoiceMetaItem">
                    <span>Opens to</span>
                    <strong>{action.destination}</strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="splashSection">
          <div className="splashSectionHeader">
            <div>
              <span>More Workspaces</span>
              <strong>Open the supporting parts of the platform first if thatâ€™s your priority</strong>
              <p>These usually support the main trading flow, but they should still be available from the first screen.</p>
            </div>
          </div>

          <div className="splashWorkspaceRow landingWorkspaceRow">
            {secondaryActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`splashWorkspaceChip ${selectedActionId === action.id ? "active" : ""}`}
                onClick={() => handleActionSelect(action)}
              >
                <div className="landingWorkspaceHeader">
                  <span>{action.title}</span>
                  <strong>{action.glyph}</strong>
                </div>
                <em>{action.destination}</em>
                <small>{action.blurb}</small>
              </button>
            ))}
          </div>
        </div>

        {selectedPage === "signals" || selectedPage === "news" ? (
          <div className="splashSection">
            <div className="splashSectionHeader">
              <div>
                <span>Desk Choice</span>
                <strong>Choose the market lane that should anchor the first screen</strong>
                <p>News and signal workflows both make more sense when they open inside the right desk.</p>
              </div>
            </div>

            <div className="splashGrid">
              {deskPathOptions.map((path) => (
                <button
                  key={path.id}
                  type="button"
                  className={`splashCard splashDeskCard ${selectedDesk === path.desk ? "active" : ""}`}
                  onClick={() => handleTradePathSelect(path)}
                >
                  <div className="splashCardMeta">
                    <span className="splashGlyph splashGlyphSmall">{path.glyph}</span>
                    <span className="splashCardFlag">{path.eyebrow}</span>
                  </div>
                  <div className="splashDeskCardTitle">
                    <strong>{path.title}</strong>
                    <small>{path.destination}</small>
                  </div>
                  <small>{path.blurb}</small>
                  <div className="landingDeskMeta">
                    <span>Best for</span>
                    <strong>{path.eyebrow}</strong>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="panelActions landingActions">
          <button
            type="button"
            className="primaryButton"
            onClick={() =>
              onContinue(
                {
                  page: selectedPage,
                  desk: selectedDesk,
                  introId: selectedIntroId,
                  sectionId: selectedSectionId,
                  landingId: selectedActionId,
                },
                "login",
              )
            }
          >
            Sign In to Continue
          </button>
          <button
            type="button"
            className="ghostButton"
            onClick={() =>
              onContinue(
                {
                  page: selectedPage,
                  desk: selectedDesk,
                  introId: selectedIntroId,
                  sectionId: selectedSectionId,
                  landingId: selectedActionId,
                },
                "register",
              )
            }
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({
  authMode,
  authForm,
  authStatus,
  launchSelection,
  onBack,
  onModeChange,
  onSubmit,
  onFieldChange,
}) {
  const launchDetails = launchSelection
    ? describeLaunchSelection(launchSelection.page, launchSelection.desk, launchSelection.sectionId)
    : null;

  return (
    <div className="authShell">
      <div className="authShellInner">
        <section className="authStage">
          <div className="authBrand">COLLECTRADE</div>
          <div className="splashEyebrow">MARKET ACCESS</div>
          <h1>Sign in to the desk before the market moves.</h1>
          <p className="authBlurb">
            South Africa-aware macro flow, 8/21 EMA execution, route-aware tickets, and a
            cleaner portfolio workspace in one product shell.
          </p>

          {launchDetails ? (
            <div className="authJourneyCard">
              <span>Selected route</span>
              <strong>{launchDetails.label}</strong>
              <small>{launchDetails.hint}</small>
              <div className="authJourneyGrid">
                <div className="authJourneyCell">
                  <span>Step 1</span>
                  <strong>Authenticate</strong>
                </div>
                <div className="authJourneyCell">
                  <span>Step 2</span>
                  <strong>Restore workspace</strong>
                </div>
                <div className="authJourneyCell">
                  <span>Step 3</span>
                  <strong>Resume flow</strong>
                </div>
              </div>
            </div>
          ) : null}

          <div className="authHighlightGrid">
            <div className="authHighlightCard">
              <span>Signal engine</span>
              <strong>8 / 21 EMA workflow</strong>
              <small>Crosses, retests, structure-driven stops, and visible trade plans.</small>
            </div>
            <div className="authHighlightCard">
              <span>Market context</span>
              <strong>SA + global macro tape</strong>
              <small>Honest timestamps, route context, and desk-aware news flow.</small>
            </div>
            <div className="authHighlightCard">
              <span>Execution</span>
              <strong>Paper first, live where ready</strong>
              <small>Venue-aware tickets with risk budget, targets, and support/resistance structure.</small>
            </div>
          </div>

          <div className="authProofRow">
            <div className="authProofChip">
              <span>Account state</span>
              <strong>Saved routes and settings</strong>
            </div>
            <div className="authProofChip">
              <span>Desk continuity</span>
              <strong>Portfolio and ticket flow restored</strong>
            </div>
            <div className="authProofChip">
              <span>Execution model</span>
              <strong>Paper by default, live where connected</strong>
            </div>
          </div>
        </section>

        <div className="authPanel">
          <div className="authPanelHeader">
            <div>
              <div className="authBrand">COLLECTRADE</div>
              <h2>{authMode === "login" ? "Welcome back" : "Create your trading workspace"}</h2>
              <p>
                {authMode === "login"
                  ? "Open your desks, sync your state, and get back to the active setup."
                  : "Create an account to save desks, settings, signals, and portfolio flow."}
              </p>
            </div>
            {onBack ? (
              <button type="button" className="ghostButton authBackButton" onClick={onBack}>
                Back
              </button>
            ) : null}
          </div>

          {launchDetails ? (
            <div className="authRouteCard">
              <span>Next stop</span>
              <strong>{launchDetails.label}</strong>
              <small>{launchDetails.hint}</small>
            </div>
          ) : null}

          <div className="authAccessBar">
            <div className="authAccessCell">
              <span>Access</span>
              <strong>{authMode === "login" ? "Existing workspace" : "New workspace"}</strong>
            </div>
            <div className="authAccessCell">
              <span>State</span>
              <strong>Secure session required</strong>
            </div>
          </div>

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

          <div className="authFooterNote">
            <span>After sign-in</span>
            <strong>{launchDetails ? launchDetails.label : "Your chosen workspace"}</strong>
            <small>Weâ€™ll carry your selection straight through to the desk you chose on entry.</small>
          </div>
        </div>
      </div>
    </div>
  );
}





