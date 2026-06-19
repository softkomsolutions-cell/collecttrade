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
    <div className="bootSplashShell" aria-label="BrickAlpha is opening">
      <div className="bootSplashPanel">
        <div className="bootSplashMark">BA</div>
        <div className="bootSplashWordmark">BRICKALPHA</div>
        <div className="bootSplashTag">AI-powered investment intelligence for collectibles</div>
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
  const savedPreference = readLaunchPreference();
  const savedLaunch = savedPreference?.page === "collectibles" ? savedPreference : null;
  const launchDesk = savedLaunch?.desk || normalizeDesk(activeDesk);
  const savedLaunchLabel = savedLaunch ? workspaceLabel(savedLaunch.page, savedLaunch.desk) : null;
  const serviceMenuRows = [
    {
      id: "valuation",
      ordinal: "01",
      glyph: "VL",
      title: "Analyze a Purchase",
      tag: "Valuation",
      tone: "collectibles",
      detail: "Upload, identify, value, score, forecast, and save the asset in under 30 seconds.",
      selection: {
        page: "collectibles",
        desk: launchDesk,
        introId: "collectibles",
        sectionId: "collectibles-valuation",
      },
    },
    {
      id: "collection",
      ordinal: "02",
      glyph: "CO",
      title: "Portfolio Home",
      tag: "Portfolio summary",
      tone: "portfolio",
      detail: "Review saved purchases, current estimates, and long-range projections.",
      selection: {
        page: "collectibles",
        desk: launchDesk,
        introId: "collectibles",
        sectionId: "collectibles-portfolio",
      },
    },
    {
      id: "inventory",
      ordinal: "03",
      glyph: "IN",
      title: "Holdings",
      tag: "Collection register",
      tone: "portfolio",
      detail: "Search holdings, cost basis, condition, rarity, and estimates.",
      selection: {
        page: "collectibles",
        desk: launchDesk,
        introId: "collectibles",
        sectionId: "collectibles-owned-inventory",
      },
    },
  ];
  const supportMenuRows = [
    {
      id: "activity",
      title: "Investment Activity",
      detail: "Purchases and sales",
      selection: { page: "collectibles", desk: launchDesk, introId: "collectibles", sectionId: "collectibles-transactions" },
    },
    {
      id: "sources",
      title: "Source Library",
      detail: "Shared documents and references",
      selection: { page: "collectibles", desk: launchDesk, introId: "collectibles", sectionId: "collectibles-partner-sources" },
    },
    {
      id: "research",
      title: "Research Inventory",
      detail: "Ideas, source checks, and product context",
      selection: { page: "collectibles", desk: launchDesk, introId: "collectibles", sectionId: "collectibles-grid" },
    },
    {
      id: "documentation",
      title: "Documentation & Provenance",
      detail: "Condition, appraisals, receipts, and source trail",
      selection: { page: "collectibles", desk: launchDesk, introId: "collectibles", sectionId: "collectibles-documentation" },
    },
    {
      id: "digital-registry",
      title: "Digital Registry",
      detail: "Physical-to-digital records and verification readiness",
      selection: { page: "collectibles", desk: launchDesk, introId: "collectibles", sectionId: "collectibles-digital-registry" },
    },
  ];
  const onboardingSlides = [
    {
      id: "collectibles",
      glyph: "CL",
      eyebrow: "Collectibles first",
      title: "Know if the collectible is a good investment.",
      description:
        "Upload a photo, identify the asset, get a valuation, score the investment, and save it to your portfolio.",
      accent: "collectibles",
      bars: [48, 82, 62, 92],
    },
    {
      id: "portfolio",
      glyph: "PF",
      eyebrow: "Evidence matters",
      title: "Document what makes the item valuable.",
      description:
        "Capture condition, rarity, provenance, comparable sales, sources, and a clear 1, 5, and 10 year scenario.",
      accent: "portfolio",
      bars: [56, 74, 88, 68],
    },
    {
      id: "partner-imports",
      glyph: "IM",
      eyebrow: "Portfolio imports",
      title: "Bring reviewed collections into one inventory.",
      description:
        "Load reviewed LEGO portfolios and keep every position inside one collection register.",
      accent: "trade",
      bars: [42, 68, 54, 80],
    },
  ];
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
            <div className="authBrand">BRICKALPHA</div>
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
          <div className="authBrand">BRICKALPHA</div>
        </div>

        <div className="splashCompactHero">
          <div className="splashEyebrow">Collectible investment intelligence</div>
          <h1>Know what it is worth. Know what to buy next.</h1>
          <p className="authBlurb">
            Upload collectible evidence, get an investment verdict, and manage the collection from
            one premium portfolio app.
          </p>
          <div className="splashHeroPillRow" aria-hidden="true">
            <span className="splashHeroPill">Score</span>
            <span className="splashHeroPill">Forecast</span>
            <span className="splashHeroPill">Portfolio</span>
          </div>
          <button
            type="button"
            className="primaryButton splashHeroPrimary"
            onClick={() =>
              onLaunch({
                page: "collectibles",
                desk: launchDesk,
                introId: "collectibles",
                sectionId: "collectibles-portfolio",
              })
            }
            disabled={!ready}
          >
            Open Portfolio App
          </button>
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
              <span>Start here</span>
              <strong>Core actions</strong>
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

        <section className="splashSection splashSectionCompact splashSupportCompact">
          <div className="splashSectionHeader">
            <div>
              <span>Records</span>
              <strong>Available in the menu</strong>
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
          <div className="splashAvailabilityNote">
            <span>Collection services</span>
            <strong>Core register active</strong>
            <small>
              Valuation, inventory, catalog, documentation, registry, reviewed imports, and source
              records are available.
            </small>
          </div>
        </section>

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
      id: "valuation",
      glyph: "VL",
      eyebrow: "Value",
      title: "Rate a Purchase",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-valuation",
      destination: "Valuation desk",
      bestFor: "Rate a purchase",
      blurb: "Value LEGO sets, minifigures, sealed items, and reviewed collection positions.",
    },
    {
      id: "portfolio-home",
      glyph: "PF",
      eyebrow: "Home",
      title: "Portfolio Home",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-portfolio",
      destination: "Dashboard",
      bestFor: "Review portfolio",
      blurb: "Open the dashboard with saved holdings, estimates, projections, and recent activity.",
    },
    {
      id: "inventory",
      glyph: "IN",
      eyebrow: "Own",
      title: "Owned Inventory",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-owned-inventory",
      destination: "Inventory register",
      bestFor: "Review holdings",
      blurb: "Search owned items, cost basis, rarity, condition, and current estimates.",
    },
    {
      id: "imports",
      glyph: "IM",
      eyebrow: "Load",
      title: "Reviewed Imports",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-reviewed-portfolios",
      destination: "Reviewed portfolios",
      bestFor: "Load collection data",
      blurb: "Import reconciled LEGO portfolios into the working inventory register.",
    },
    {
      id: "activity",
      glyph: "AC",
      eyebrow: "Track",
      title: "Investment Activity",
      page: "collectibles",
      introId: "collectibles",
      sectionId: "collectibles-transactions",
      destination: "Purchase and sale ledger",
      bestFor: "Review the trail",
      blurb: "Keep acquisitions and exits together as a collectible investment ledger.",
    },
  ];
  const secondaryActions = [];
  const allActions = [...landingActions, ...secondaryActions];

  const initialPage = "collectibles";
  const initialDesk = initialLaunch?.desk || "forex";
  const initialIntroId = initialLaunch?.introId || defaultIntroIdForPage(initialPage);
  const [selectedActionId, setSelectedActionId] = useState(
    allActions.some((action) => action.id === initialLaunch?.landingId)
      ? initialLaunch.landingId
      : allActions.find((action) => action.page === initialPage && action.sectionId === initialLaunch?.sectionId)
        ?.id || "valuation",
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
            <div className="authBrand">BRICKALPHA</div>
            <div className="splashEyebrow">AI-POWERED INVESTMENT INTELLIGENCE FOR COLLECTIBLES</div>
            <h1>Know what your collection is worth. Know what to buy next.</h1>
            <p className="authBlurb">
              BrickAlpha helps collectors upload, identify, value, score, forecast, and track
              collectible investments in one trusted workspace.
            </p>

            <div className="landingValueGrid">
              <div className="landingValueCard">
                <span>Purchase Analysis</span>
                <strong>Instant investment verdict</strong>
                <small>Review price paid, market value, gain, risk, score, and 1, 5, and 10 year scenarios.</small>
              </div>
              <div className="landingValueCard">
                <span>Evidence</span>
                <strong>Provenance and comparables</strong>
                <small>Capture condition, rarity, sources, and comparable-market evidence in one flow.</small>
              </div>
              <div className="landingValueCard">
                <span>Portfolio</span>
                <strong>Cross-asset intelligence</strong>
                <small>Track inventory positions and keep your next decision grounded in the wider collection.</small>
              </div>
            </div>

            <div className="landingFeatureRow">
              <div className="landingFeatureChip">
                <span>LEGO collection</span>
                <strong>Beta focus: LEGO and Pokémon next</strong>
              </div>
              <div className="landingFeatureChip">
                <span>Investment record</span>
                <strong>Cost, value, rarity, provenance</strong>
              </div>
              <div className="landingFeatureChip">
                <span>Partner portfolios</span>
                <strong>Reviewed imports and references</strong>
              </div>
              <div className="landingFeatureChip">
                <span>Workspace state</span>
                <strong>Saved per account</strong>
              </div>
            </div>

            <div className="landingTesterCard">
              <span>Partner testing route</span>
                <strong>Valuation, inventory, imports, and activity</strong>
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
                  Collectibles
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
                    The collectibles investment workspace opens without a market desk filter.
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

        {secondaryActions.length ? (
          <div className="splashSection">
            <div className="splashSectionHeader">
              <div>
                <span>More Workspaces</span>
                <strong>Open another workspace first</strong>
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
        ) : null}

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
  authForm,
  mode = "register",
  authStatus,
  busy = false,
  onSubmit,
  onFieldChange,
  onModeChange,
  onBackToLanding,
}) {
  const isLogin = mode === "login";
  const title = isLogin ? "Sign in" : "Create account";
  const body = isLogin
    ? "Welcome back. Sign in to restore your portfolio, route, and partner feedback workspace."
    : "Create a secure BrickAlpha workspace for valuations, holdings, reports, and feedback.";
  const ctaLabel = busy
    ? isLogin
      ? "Signing in..."
      : "Creating account..."
    : title;

  return (
    <div className="authShell authShellMinimal">
      <div className="authPanel authPanelMinimal">
        <div className="authMinimalLogo">
          <div className="brandMark">BA</div>
          <div className="brandWordmark">BRICKALPHA</div>
        </div>

        <div className="authPanel">
          <div className="authPanelHeader">
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          </div>

          <form className="authForm" onSubmit={onSubmit}>
            {!isLogin ? (
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) => onFieldChange("name", event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={busy}
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
                disabled={busy}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={busy}
              />
            </label>

            {authStatus ? (
              <div className="statusBanner warningBanner" role="alert">
                {authStatus}
              </div>
            ) : null}

            <button className="primaryButton" type="submit" disabled={busy} aria-busy={busy}>
              {ctaLabel}
            </button>
          </form>

          <div className="authModeSwitch">
            <span>{isLogin ? "Need a workspace?" : "Already have an account?"}</span>
            <button
              type="button"
              className="ghostButton"
              onClick={() => onModeChange(isLogin ? "register" : "login")}
              disabled={busy}
            >
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </div>

          <button
            type="button"
            className="authBackButton"
            onClick={onBackToLanding}
            disabled={busy}
          >
            Back to product overview
          </button>
        </div>
      </div>
    </div>
  );
}





