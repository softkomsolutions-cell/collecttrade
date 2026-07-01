import { useEffect, useRef, useState } from "react";
import {
  APP_MARK,
  APP_NAME,
  APP_TAGLINE,
  APP_WORDMARK,
  PARTNER_TEST_FLOW,
  TRADE_PATHS,
} from "../appConfig";
import {
  buildHomeEntrySelection,
  buildPrimaryServiceRows,
  ENTRY_ONBOARDING_SLIDES,
} from "../serviceRegistry";
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

export function GlobalSearch({ open, query, onQueryChange, results, onSelect, onClose }) {
  const inputRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const safeActiveIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const handleClose = () => {
    setActiveIndex(0);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && results[safeActiveIndex]) {
      event.preventDefault();
      onSelect(results[safeActiveIndex]);
    }
  };

  return (
    <div className="globalSearchBackdrop" onClick={handleClose} role="presentation">
      <div
        className="globalSearchPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Global search"
      >
        <div className="globalSearchInputRow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search workspaces, sections, and tools..."
            aria-label="Search"
            autoComplete="off"
          />
        </div>

        <div className="globalSearchResults">
          {results.length ? (
            <>
              <div className="globalSearchGroupLabel">Results</div>
              {results.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`globalSearchResult ${index === safeActiveIndex ? "active" : ""}`}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="globalSearchResultGlyph">{item.glyph}</div>
                  <div className="globalSearchResultCopy">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="globalSearchEmpty">
              {query.trim() ? "No matching workspaces or sections." : "Type to search across the platform."}
            </div>
          )}
        </div>

        <div className="globalSearchFooter">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            navigate
          </span>
          <span>
            <kbd>↵</kbd>
            open
          </span>
          <span>
            <kbd>esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

export function SaasTopNav({
  workspaceLabel,
  feedMode,
  feedModeTone,
  notificationCount,
  onOpenSearch,
  onOpenNotifications,
  onOpenFeedback,
  onLogout,
  userInitial,
}) {
  return (
    <header className="saasTopNav">
      <div className="saasTopNavBreadcrumb">
        <span>{APP_NAME}</span>
        <span className="saasTopNavDivider">/</span>
        <strong>{workspaceLabel}</strong>
      </div>

      <button type="button" className="saasTopNavSearch" onClick={onOpenSearch}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Search workspaces...
        <kbd>⌘K</kbd>
      </button>

      <div className="saasTopNavActions">
        <div className={`saasTopNavPill live ${feedModeTone || ""}`}>{feedMode}</div>

        <button
          type="button"
          className="saasTopNavIconButton"
          aria-label="Alerts inbox"
          onClick={onOpenNotifications}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 2C5.8 2 4 3.8 4 6v2.5L2.5 11h11L12 8.5V6c0-2.2-1.8-4-4-4z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path d="M6.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          {notificationCount ? <span className="badge">{notificationCount}</span> : null}
        </button>

        <button type="button" className="ghostButton" onClick={onOpenFeedback}>
          Feedback
        </button>
        <button type="button" className="ghostButton" onClick={onLogout}>
          Log out
        </button>
        <div className="avatarCircle">{userInitial}</div>
      </div>
    </header>
  );
}

export function ExecutiveSummaryStrip({ metrics = [] }) {
  if (!metrics.length) {
    return null;
  }

  return (
    <section className="executiveSummaryStrip" aria-label="Executive summary">
      {metrics.map((metric) => (
        <button
          key={metric.id}
          type="button"
          className="executiveKpiCard"
          onClick={metric.action}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </button>
      ))}
    </section>
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
    <div className="bootSplashShell" aria-label={`${APP_NAME} is opening`}>
      <div className="bootSplashPanel">
        <div className="bootSplashMark">{APP_MARK}</div>
        <div className="bootSplashWordmark">{APP_WORDMARK}</div>
        <div className="bootSplashTag">{APP_TAGLINE}</div>
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
  const homeLaunch = buildHomeEntrySelection(launchDesk);
  const serviceMenuRows = buildPrimaryServiceRows({
    launchDesk,
    launchDeskLabel: labelDesk(launchDesk),
    defaultTradingDesk,
    defaultTradingDeskLabel: labelDesk(defaultTradingDesk),
  });
  const onboardingSlides = ENTRY_ONBOARDING_SLIDES;
  const [onboardingStep, setOnboardingStep] = useState(onboardingSlides.length);
  const onboardingComplete = onboardingStep >= onboardingSlides.length;
  const currentOnboardingSlide =
    onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)];

  const advanceOnboarding = () => {
    setOnboardingStep((step) => Math.min(step + 1, onboardingSlides.length));
  };

  const skipOnboarding = () => {
    setOnboardingStep(onboardingSlides.length);
  };

  if (!onboardingComplete) {
    return (
      <div className="splashShell splashShellMobile">
        <div className="onboardingPanel">
          <div className="onboardingTopBar">
            <div className="authBrand">{APP_WORDMARK}</div>
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
      <div className="splashPanel splashPanelCompact splashMenuBackdrop splashPanelServicesOnly">
        <div className="splashCompactHeader">
          <div className="authBrandLockup splashServiceBrandLockup">
            <div className="brandMark authBrandMark">{APP_MARK}</div>
            <div className="authBrandMeta">
              <div className="authBrand">{APP_WORDMARK}</div>
              <small>Services</small>
            </div>
          </div>
        </div>

        <div className="mobileMenuScreenList splashServiceMenuList splashServiceMenuOnly">
          {serviceMenuRows.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobileMenuRow mobileMenuRow-${item.tone || "support"} launchMenuRow`}
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
              <div className="mobileMenuRowArrow" aria-hidden="true">{">"}</div>
            </button>
          ))}
        </div>

        <div className="chooserActionRow chooserActionRowSplit">
          <button
            type="button"
            className="primaryButton splashRailPrimary"
            onClick={() => onLaunch(homeLaunch)}
            disabled={!ready}
          >
            Continue to Home
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
        label: "Research Center",
        hint: "You'll land on the visual research workspace with performance, exposure, and signal analytics.",
      };
    }

    if (page === "subscriptions") {
      return {
        label: "Subscriptions",
        hint: "You'll land on the plan workspace with premium value, tiers, and upgrade paths.",
      };
    }

  return {
    label: workspaceLabel(page, desk),
    hint: "Your first workspace will be ready as soon as you sign in.",
  };
}

export function LandingShell({ initialLaunch, onContinue, onDemo, demoBusy = false, demoStatus = "" }) {
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
      title: "LEGO Investments",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-focus",
      destination: "LEGO Investments focus",
      bestFor: "Trade alternatives",
      blurb: "Analyze LEGO sets and investment-grade collectibles with the same disciplined ticket flow.",
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
        title: "Research Center",
      page: "reports",
      introId: "reports",
      sectionId: "reports-performance",
        destination: "Performance research",
        blurb: "Open visual research with performance curves, desk exposure, and signal analytics.",
      },
      {
        id: "subscriptions",
        glyph: "SB",
        eyebrow: "Plans",
        title: "Subscriptions",
        page: "subscriptions",
        introId: "subscriptions",
        sectionId: "subscriptions-overview",
        destination: "Subscription plans",
        blurb: "Show plan tiers, premium features, and the value path that makes the service commercially real.",
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
            <div className="authBrand">{APP_WORDMARK}</div>
            <div className="splashEyebrow">TRADING WORKSPACE</div>
            <h1>Start your trading workspace.</h1>
            <p className="authBlurb">
              Open news, signals, trade execution, and LEGO investments in one mobile-first product.
              Create an account first, or try the live demo before signing up.
            </p>

            <div className="landingHeroActions">
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
                    "register",
                  )
                }
              >
                Create Account
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
                    "login",
                  )
                }
              >
                Sign In
              </button>
              {onDemo ? (
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() =>
                    onDemo({
                      page: selectedPage,
                      desk: selectedDesk,
                      introId: selectedIntroId,
                      sectionId: selectedSectionId,
                      landingId: selectedActionId,
                    })
                  }
                  disabled={demoBusy}
                >
                  {demoBusy ? "Opening Demo..." : "Explore Live Demo"}
                </button>
              ) : null}
            </div>

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
                <strong>LEGO investment holdings</strong>
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
              <strong>Landing, News, Trade Desk, LEGO Investments, Feedback Board</strong>
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
                <strong>{onDemo ? "Demo or sign-in" : "Authentication required"}</strong>
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
                  <strong>Create account or sign in</strong>
                  <small>Your selected route is carried through auth and restored on entry.</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="splashSection splashSectionPrimary">
          <div className="splashSectionHeader">
            <div>
              <span>Choose Your Start</span>
              <strong>Choose where to start</strong>
              <p>Pick the first lane you want to open after account access.</p>
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

        <div className="splashSection splashSectionSecondary">
          <div className="splashSectionHeader">
            <div>
              <span>More Workspaces</span>
              <strong>Open the supporting parts of the platform first if that’s your priority</strong>
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
          <div className="splashSection splashSectionDeskChoice">
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
          {demoStatus ? <div className="statusBanner">{demoStatus}</div> : null}
          {onDemo ? (
            <button
              type="button"
              className="secondaryButton"
              onClick={() =>
                onDemo({
                  page: selectedPage,
                  desk: selectedDesk,
                  introId: selectedIntroId,
                  sectionId: selectedSectionId,
                  landingId: selectedActionId,
                })
              }
              disabled={demoBusy}
            >
              {demoBusy ? "Opening Demo..." : "Explore Live Demo"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AuthShell({
  authMode,
  authView = "auth",
  authForm,
  resetForm,
  authStatus,
  resetStatus,
  resetHintCode,
  onBack,
  onModeChange,
  onSubmit,
  onFieldChange,
  onResetFieldChange,
  onForgotPassword,
  onPasswordResetRequest,
  onPasswordResetConfirm,
  onReturnToLogin,
  onDemo,
  demoBusy = false,
}) {
  const isResetRequest = authView === "forgot-request";
  const isResetConfirm = authView === "forgot-reset";
  const isResetFlow = isResetRequest || isResetConfirm;

  return (
    <div className="authShell">
      <div className="authShellInner">
        <section className="authStage authStageCompact">
          <div className="authBrand">{APP_WORDMARK}</div>
          <div className="splashEyebrow">MARKET ACCESS</div>
          <h1>{isResetFlow ? "Reset your password." : "Create an account or sign in."}</h1>
          <p className="authBlurb">
            {isResetFlow
              ? "Request a reset code, choose a new password, and return straight to sign in."
              : "A dedicated login screen first. Once you are in, the app will show services and then open Home."}
          </p>
        </section>

        <div className="authPanel authPanelStandalone">
          <div className="authPanelHeader">
            <div>
              <div className="authBrandLockup">
                <div className="brandMark authBrandMark">{APP_MARK}</div>
                <div className="authBrandMeta">
                  <div className="authBrand">{APP_WORDMARK}</div>
                  <small>{APP_TAGLINE}</small>
                </div>
              </div>
              <h2>
                {isResetRequest
                  ? "Reset your password"
                  : isResetConfirm
                    ? "Set a new password"
                    : authMode === "login"
                      ? "Welcome back"
                      : "Create your trading workspace"}
              </h2>
              <p>
                {isResetRequest
                  ? "Enter your email and we will prepare a reset code for this build."
                  : isResetConfirm
                    ? "Use the reset code, choose a new password, and then sign in again."
                    : authMode === "login"
                      ? "Sign in and return to your workspace."
                      : "Create an account to save your desks, settings, and app flow."}
              </p>
            </div>
            {onBack ? (
              <button type="button" className="ghostButton authBackButton" onClick={onBack}>
                Back
              </button>
            ) : null}
          </div>

          {isResetFlow ? (
            <form className="authForm" onSubmit={isResetRequest ? onPasswordResetRequest : onPasswordResetConfirm}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={resetForm.email}
                  onChange={(event) => onResetFieldChange("email", event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              {isResetConfirm ? (
                <>
                  <label>
                    <span>Reset code</span>
                    <input
                      type="text"
                      value={resetForm.code}
                      onChange={(event) => onResetFieldChange("code", event.target.value)}
                      placeholder="6-digit code"
                      autoComplete="one-time-code"
                    />
                  </label>

                  {resetHintCode ? (
                    <div className="statusBanner subtleBanner">
                      <strong>Partner-stage reset code</strong>
                      <small>
                        Use <strong>{resetHintCode}</strong> for this build. Email delivery can be added later.
                      </small>
                    </div>
                  ) : null}

                  <label>
                    <span>New password</span>
                    <input
                      type="password"
                      value={resetForm.password}
                      onChange={(event) => onResetFieldChange("password", event.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                  </label>

                  <label>
                    <span>Confirm password</span>
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(event) => onResetFieldChange("confirmPassword", event.target.value)}
                      placeholder="Repeat the new password"
                      autoComplete="new-password"
                    />
                  </label>
                </>
              ) : null}

              {resetStatus ? <div className="statusBanner">{resetStatus}</div> : null}

              <button className="primaryButton" type="submit">
                {isResetRequest ? "Send reset code" : "Reset password"}
              </button>

              <div className="authAuxActions">
                <button type="button" className="ghostButton authLinkButton" onClick={onReturnToLogin}>
                  Back to sign in
                </button>
                {isResetConfirm ? (
                  <button type="button" className="ghostButton authLinkButton" onClick={onPasswordResetRequest}>
                    Request new code
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <>
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

                {authMode === "login" ? (
                  <div className="authAuxActions">
                    <button type="button" className="ghostButton authLinkButton" onClick={onForgotPassword}>
                      Forgot password?
                    </button>
                  </div>
                ) : null}

                {authStatus ? <div className="statusBanner">{authStatus}</div> : null}

                <button className="primaryButton" type="submit">
                  {authMode === "login" ? "Sign in" : "Create account"}
                </button>
                {onDemo ? (
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={onDemo}
                    disabled={demoBusy}
                  >
                    {demoBusy ? "Opening Demo..." : "Explore live demo"}
                  </button>
                ) : null}
              </form>

              <div className="authValueCard">
                <span>Why {APP_NAME}</span>
                <strong>Make your money work with a smarter market workspace.</strong>
                <ul className="authValueList">
                  <li>AI-driven market coverage designed to watch the desk around the clock.</li>
                  <li>Full transparency through signals, research, alerts, and routine history.</li>
                  <li>Built with South African banking and funding workflows in mind as connectivity expands.</li>
                </ul>
                <small>We're not just a platform - we're your partner at every step of the journey.</small>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}







