# Collecttrade Launch Timeline

Last updated: 27 May 2026

## Purpose

This document records the practical launch timeline for Collecttrade so development, partner expectations, staging, and compliance work stay aligned.

The current product is strong enough for partner demonstration and structured feedback. It is not yet a fully public, live-money trading platform.

## Current Position

Collecttrade currently has a working mobile-style product flow:

- splash / onboarding
- independent login and create-account flow
- services screen
- Home command center
- News, Trading, Crypto, Collectibles, Portfolio, Reports, Subscriptions, Tools, Connections, and Settings screens
- watchlist, alerts, notifications, and guided workflow
- partner feedback board
- connector setup architecture
- staged API coverage for market data, news feeds, brokers, economic calendar, market depth, and banking integrations

The app is suitable for partner testing, product validation, and founder investment discussion.

## Launch Phases

### Phase 1: Partner Demo and Testing

Target window: now to 1 week

Goal:

Show partners the working app, gather feedback, and validate whether the product direction is clear, useful, and commercially convincing.

Key focus:

- demo splash, login, services, Home, News, Trading, Reports, Subscriptions, and Connections
- collect feedback through the in-app feedback board
- confirm partner appetite for funding and deeper involvement
- validate the app flow on Android and desktop

Current readiness:

Ready now.

### Phase 2: Private Beta

Target window: 3 to 5 weeks

Goal:

Move from a partner demo into a more reliable private beta for selected testers.

Key build items:

- refine mobile UX and navigation based on partner feedback
- improve Home, services, Trading, Reports, and Subscriptions polish
- strengthen auth, password reset, and account handling
- improve watchlist and alert workflows
- clean up screen consistency and copy
- improve partner testing and feedback triage
- complete the first version of the trading-core screens:
  - Watchlist and Search
  - Interactive Charting
  - Order Entry / Ticket
  - Portfolio and Open Positions
  - Account Summary
  - News and Alerts Feed

Exit criteria:

- testers can understand the app without explanation
- each core service opens to a clear, separate screen
- no major navigation traps
- feedback loop is working
- app is stable enough for a small group of regular testers

### Phase 3: Staging-Ready Live App

Target window: 6 to 8 weeks

Goal:

Prepare Collecttrade for stable hosted staging with real integration readiness.

Key build items:

- deploy stable staging environment
- configure production-like environment variables and secrets
- complete live market data setup with a provider such as Twelve Data
- improve connector readiness:
  - VALR live crypto connector
  - IBKR staged gateway/OAuth path
  - Saxo staged OAuth path
  - EasyEquities manual/JSE tracking lane
- add economic calendar provider integration
- improve Market Depth / Level 2 screen where provider data is available
- add outbound email notification delivery
- make subscriptions and billing readiness more complete
- improve monitoring, logs, and operational health screens

Exit criteria:

- app is accessible from a stable staging URL
- core data sources are reliable
- partner testers can use the app without local machine dependency
- connection status is clear and honest
- simulated vs live data is clearly labelled

### Phase 4: Commercial Launch Candidate

Target window: 10 to 14 weeks

Goal:

Reach the point where Collecttrade can be considered a paid product candidate.

Key build items:

- complete subscription and billing flow
- finalize plan tiers and premium feature gating
- polish the mobile app experience end to end
- harden authentication and account security
- improve reporting and exportable summaries
- complete outbound alert delivery
- finish staging-to-production deployment process
- complete legal, compliance, and risk review
- prepare support, onboarding, and customer communication material

Exit criteria:

- product feels premium and trustworthy
- users understand why they should return daily
- subscription value is visible inside the app
- billing and account flows are stable
- infrastructure is production-ready
- legal/compliance position has been reviewed

### Phase 5: Real-Money Trading Launch

Target window: 3 to 6 months

Goal:

Enable real-money trading only when the operating, regulatory, broker, and risk controls are ready.

Key build items:

- confirm non-custodial operating model
- complete broker/exchange API approvals
- lock down account permissions and withdrawal restrictions
- complete audit trail and order logs
- add pre-trade and post-trade risk controls
- complete compliance documentation
- ensure users trade through their own connected accounts
- separate platform subscription revenue from trading capital

Exit criteria:

- legal/compliance structure is clear
- broker/exchange integrations are approved and tested
- no pooled client money is handled inside Collecttrade
- execution flow is auditable
- risk controls are in place

## Recommended Timeline

| Milestone | Target |
| --- | --- |
| Partner demo and structured feedback | Immediate / next 1 week |
| Private beta | June 2026 |
| Staging-ready live app | July 2026 |
| Commercial launch candidate | August 2026 |
| Real-money execution launch | 3 to 6 months, subject to compliance and connector readiness |

## Key Risks

- launching real-money trading before compliance is ready
- confusing simulated data with live data
- overpromising broker or bank integrations before provider approval
- treating partner development funding as trading capital
- moving to native/Expo too early before validating the PWA workflow
- delaying partner feedback because of infrastructure perfectionism

## Current Recommendation

The best path is:

1. Use the current product for partner demo and feedback now.
2. Run a focused private beta in June 2026.
3. Move to stable hosted staging in July 2026.
4. Target a commercial launch candidate around August 2026.
5. Treat real-money execution as a separate regulated milestone after the product, connector, and compliance foundation is ready.

This keeps momentum while avoiding the biggest mistake: rushing into live-money trading before the structure is ready.
