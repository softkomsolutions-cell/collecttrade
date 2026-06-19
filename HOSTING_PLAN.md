# BrickAlpha Hosting Plan

## Current Recommendation

Use **Render** for staging and partner testing now.

Use a **South African platform** for production evaluation before go-live.

This split gives us:

1. a fast, stable staging path now
2. time to choose the right South African production home deliberately
3. fewer moving parts during partner feedback rounds

---

## 1. Staging Recommendation

### Platform

- **Render**

### Why Render is the right staging choice now

- The app already runs well as a **single Docker web service**
- We already prepared:
  - `Dockerfile`
  - `render.yaml`
  - `README` staging instructions
- Render supports:
  - Docker-based web services
  - health checks
  - generated secrets
  - persistent disks
  - a stable public URL for partner testing

### Current staging shape

- Service name: `collecttrade-staging`
- Region: `frankfurt`
- Plan: `starter`
- Health check: `/api/health`
- Disk mount: `/app/server/data`

### Why `frankfurt` for staging

Render does **not** currently offer a South African region.

Current Render regions include:

- `oregon`
- `ohio`
- `virginia`
- `frankfurt`
- `singapore`

For South Africa-based testing, `frankfurt` is the best current default on Render.

---

## 2. Production Requirement Before Go-Live

Before launch, evaluate a **South African hosting platform** for production.

Why:

- lower latency for South African users
- cleaner local market positioning
- better regional fit for a subscription product targeting SA users
- more confidence around a future locally grounded production setup

---

## 3. South African Production Shortlist

### Option 0 — AWS

**Why it is interesting**

- strong long-term production platform
- good fit for scaling, security, monitoring, and reliability
- many future architecture paths if BrickAlpha grows into a larger subscription product

**Why it is not the default staging choice**

- more setup and DevOps overhead than Render
- slower path to a clean partner-testing URL
- not the best “move fast and get feedback this week” option

**Why it remains a serious production candidate**

- if BrickAlpha needs a more enterprise-grade production stack later, AWS is a strong option
- suitable paths could include:
  - Lightsail for simpler VPS-style hosting
  - Elastic Beanstalk for easier application deployment
  - ECS/Fargate for a stronger container-based production setup
  - EC2 for maximum control

**Important regional note**

- AWS should be evaluated as a **production platform**, not assumed to be a South African hosting answer by default
- if the key launch requirement is truly **South African-hosted infrastructure**, then local options may still fit better

**What to verify**

- actual region fit for the target customer base
- operational complexity vs team capacity
- total cost once logging, storage, monitoring, and backups are included
- whether AWS would add meaningful value over a strong South African host at launch stage

### Option A — Zanode

**Why it is interesting**

- positioned as a developer-focused South African platform
- advertises:
  - git-push deploys
  - managed Postgres
  - Node.js support
  - Docker support
  - South African infrastructure

**Why it is a strong candidate**

- closest to a platform-style deployment experience
- probably the least painful transition if we want something more app-platform-like inside SA

**What to verify**

- uptime and production support
- pricing and scaling model
- persistent storage options
- secrets/environment management
- backup and recovery story

### Option B — xneelo Cloud

**Why it is interesting**

- strong South African hosting reputation
- local cloud infrastructure
- suitable for self-managed application hosting

**Why it is a strong candidate**

- likely more stable and mature for infrastructure control
- a good fit if we want to run Docker and manage the platform ourselves

**What to verify**

- how much ops burden we want to carry ourselves
- backups, monitoring, and deployment workflow
- whether we prefer IaaS control over PaaS simplicity

### Option C — xneelo Managed Servers

**Why it is interesting**

- South African managed-server route
- potentially useful if we want more support than a raw cloud VM

**Why it is a candidate**

- could be a better fit if the team wants hosting help but still needs custom app control

**What to verify**

- Docker friendliness
- deployment workflow flexibility
- cost compared to cloud VM + self-management

---

## 4. Recommended Decision Flow

### Right now

Use **Render staging** for:

- partner access
- feedback
- UX refinement
- launch hardening

### Before production go-live

Run a hosting comparison between:

1. **Zanode**
2. **xneelo Cloud**
3. **xneelo Managed Servers**

Then choose based on:

- South African latency
- operational complexity
- Docker / Node support
- backups and persistent data handling
- cost at launch stage
- how quickly we can recover from incidents

---

## 5. Practical Recommendation

If we want the strongest long-term global production platform and are comfortable with more infrastructure work:

- evaluate **AWS** seriously before final production selection

If we want the simplest production path **inside South Africa**:

- evaluate **Zanode first**

If we want the most control and are comfortable managing infrastructure:

- evaluate **xneelo Cloud first**

If we want a more supported infrastructure route:

- evaluate **xneelo Managed Servers**

---

## 6. Decision Criteria Checklist

Before signing off a production host, confirm:

- Can it run our current Docker-based app cleanly?
- Can it persist `server/data` safely?
- Can it manage secrets securely?
- Can it support backups and recovery?
- Can it give us a stable public URL and custom domain?
- Can it support logs, uptime checks, and incident response?
- Will it still feel viable when paying customers start using it?

---

## 7. Suggested Evaluation Order

### Staging now

1. **Render**

### Production review before go-live

1. **Zanode**
2. **xneelo Cloud**
3. **AWS**

This order is practical because:

- Render solves the immediate partner-testing need fastest
- Zanode and xneelo are the best local-fit production candidates to test next
- AWS should be considered deliberately as a larger production decision, not mixed into rapid staging work

---

## 8. Sources Used

- Render web services: https://render.com/docs/web-services
- Render Blueprint YAML: https://render.com/docs/blueprint-spec
- Render health checks: https://render.com/docs/health-checks
- Render persistent disks: https://render.com/docs/disks
- Render regions: https://render.com/docs/regions
- AWS main site: https://aws.amazon.com/
- Zanode: https://www.zanode.co.za/
- xneelo Cloud: https://xneelo.co.za/cloud/
- xneelo Managed Servers: https://xneelo.co.za/managed-servers/
