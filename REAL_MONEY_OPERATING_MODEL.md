# Collecttrade Real Money Operating Model

Prepared: May 18, 2026  
Audience: Collecttrade founders, partners, and launch planners

## Purpose

This document sets out the recommended operating model for letting partners trade real money through the Collecttrade product during the current pre-launch stage.

The goal is to move forward in a way that is commercially sensible, operationally clean, and less likely to create avoidable custody or licensing risk too early.

## Current Recommendation

For the current partner phase, Collecttrade should use a **non-custodial operating model**.

That means:

- each partner keeps money in their **own broker or exchange account**
- Collecttrade acts as the **signal, workflow, reporting, and optional execution interface**
- Collecttrade should **not** pool partner money into one company account or wallet
- Collecttrade should **not** accept deposits into a Collecttrade-controlled account on behalf of partners
- Collecttrade should **not** hold withdrawal rights through partner API connections

## Why This Is the Best Model Right Now

This model is the cleanest bridge between:

- moving the product forward commercially
- letting real users test it with actual money
- avoiding premature custody and pooled-money risk
- keeping the legal and operational structure simpler while the product is still being refined

In practice, this gives us a real-money pilot without immediately turning Collecttrade into a client-money business.

## What Collecttrade Should Be in This Phase

In the current phase, Collecttrade should behave as:

- a market intelligence layer
- a signal and trade-planning interface
- a reporting and review tool
- an execution bridge where the partner explicitly connects their own venue account

It should **not yet** behave as:

- a pooled investment vehicle
- a managed fund
- a discretionary money manager handling broad public client funds
- a custody platform holding or moving partner cash itself

## Recommended Real Money Structure

### Model

Use **partner-owned accounts** with restricted API access.

### Baseline structure

1. Each partner opens and funds their own account with the selected venue.
2. The partner connects that venue to Collecttrade using API credentials.
3. Collecttrade uses those credentials only for the minimum required permissions.
4. Trades are initiated inside Collecttrade but executed against the partner's own account.
5. Withdrawals stay outside Collecttrade.

### Best current implementation pattern

- **Crypto:** start with VALR using `View` and `Trade` permissions only
- **No withdrawal permission**
- **No pooled wallet**
- **No shared omnibus capital structure**

## What We Should Not Do Yet

Before licensing, compliance, and a more formal operational structure are in place, Collecttrade should not:

- accept partner deposits into a Collecttrade company bank account
- accept partner deposits into a single Collecttrade-controlled exchange or broker account
- mix multiple partners' capital into one uncontrolled trading pool
- enable withdrawal rights via API
- present the app publicly as if it already operates as a managed fund
- charge performance fees on pooled or discretionary client money without the right structure around it

## Partner Pilot Rules

For the current pilot phase, these rules should apply:

### 1. Each partner funds their own account

This keeps ownership, custody, and withdrawal control with the partner.

### 2. API permissions must stay minimal

Default partner API profile:

- `View`
- `Trade`
- `No Withdraw`

### 3. Real-money access is invite-only

Only named founding partners or approved pilot users should be allowed into the real-money flow at this stage.

### 4. Every partner should understand the current product status

They should be told clearly that:

- the product is still in staged rollout
- some desks may still be simulated or paper-routed
- live execution is being enabled desk by desk
- the app is not yet operating as a pooled investment scheme

### 5. Auditability matters from day one

Even in a founder or partner pilot, we should keep:

- connection status
- order intent
- execution venue
- timestamped trade actions
- notes on who approved or initiated live trading access

## Best Commercial Sequence

The best sequence is:

### Phase 1: Partner-owned accounts, no custody

This is the immediate recommendation.

Use Collecttrade as:

- product interface
- signal engine
- execution layer where connected
- reporting and review environment

### Phase 2: Subscription product

Before taking on bigger operational risk, Collecttrade should become commercially strong as:

- a paid signal product
- a planning and reporting workspace
- a premium trade-support app

This is the lowest-friction monetisation path.

### Phase 3: Controlled live execution lanes

After the partner pilot proves out:

- enable approved live connectors desk by desk
- start with the cleanest venue and workflow
- keep non-custodial structure intact

### Phase 4: Formal managed-money option, only if still strategically desirable

If the business eventually wants discretionary trading or managed client capital, that should happen only after:

- legal review
- licensing review
- operating model hardening
- proper agreements
- stronger controls and governance

## Recommended Venue Permission Model

### VALR

For the first real-money crypto lane:

- use `View` + `Trade`
- do not enable `Withdraw`
- do not request unnecessary banking or transfer permissions

If shared access is ever used, keep the effective permissions aligned with the same principle: trade access without withdrawal power.

### Future venues

The same rule should hold for every venue unless there is a deliberate, reviewed reason to do otherwise:

- lowest possible permission set
- no withdrawal rights through the app
- explicit venue-by-venue approval before going live

## Product and Operational Work Still Needed Before Broad Real-Money Rollout

Even with the non-custodial structure, the following still needs to be in place before broader client use:

- connector credential handling hardening
- role-based access control for live trading permissions
- clearer live vs paper vs simulated labels
- venue-specific reconciliation
- incident and support process
- legal and risk disclosures
- production monitoring and logging
- subscription and entitlement logic
- permanent staging and production hosting

## Suggested Partner Messaging

The clean message to partners is:

"Your money stays in your own account. Collecttrade provides the market interface, signal flow, and execution support, but it does not take custody of your funds or enable withdrawals through the app."

That message builds trust and keeps the product story understandable.

## Decision

### Recommended decision for now

Proceed with **real-money partner testing only through partner-owned accounts**, beginning with the cleanest live lane and minimum API permissions.

### Do not do this yet

Do not accept pooled partner capital into a Collecttrade-controlled account until the legal, operational, and product structure is intentionally designed for it.

## Immediate Action Plan

1. Keep the product positioned as non-custodial.
2. Enable live trading only on approved venues and only with minimal permissions.
3. Draft a short partner trading agreement and risk notice for pilot users.
4. Add explicit in-app labeling for:
   - simulated
   - paper
   - live
5. Decide the first supported real-money desk and venue.
6. Prepare a go-live checklist for expanding from founding partners to paid clients.

## Important Note

This document is an operating recommendation for product and launch planning. It is **not** a substitute for formal South African legal, compliance, tax, or regulatory advice.

## Sources Checked

- FAIS Act: https://www.gov.za/documents/financial-advisory-and-intermediary-services-act
- FSCA FAIS licensing: https://www2.fsca.co.za/Regulated%20Entities/Pages/LR-FAIS.aspx
- FSCA crypto asset licensing context: https://www.fsca.co.za/TPNL/Q4%20-%20Industry%20Newsletter%20March%202024/01-Trust%20the%20focus.html
- CISCA: https://www.gov.za/documents/collective-investment-schemes-control-act
- VALR API keys: https://support.valr.com/hc/en-us/articles/20448368091804-How-to-set-up-your-API-keys
- VALR shared account access: https://support.valr.com/hc/en-us/articles/6425578941084-What-is-shared-account-access
