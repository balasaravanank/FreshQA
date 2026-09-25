# 07 · MVP scope, demo and metrics

[← Back to overview](README.md)

## 1. MVP scope (24-hour build)

| In scope | Out of scope (phase 2) |
|---|---|
| Freshdesk Omni trial tenant | Freshservice (post-send only; same backend) |
| FDK custom app: Send-click check, stop modal, suggestion card, one-click Apply, sidebar history | Voice calls (waiting on transcript access) |
| Serverless `onConversationCreate` → adoption tracking and escalation | AI Actions for Agent Studio (stretch goal if time allows) |
| Backend: `/precheck`, `/conversation`, `/playbook/refresh`, `/dashboard/*` | Multiple languages |
| Playbook learned from seeded top-performer tickets, with top performers chosen by seeded CSAT | Production scaling and rate-limit batching |
| Manager dashboard: coverage, verdict mix, catches prevented, adoption rate, override rate | Coaching digests by email |

**Already built in this repo, and reused:** Freshdesk REST client, Claude client, scorer, JSON store, playbook extraction script, 18 seed tickets across 3 agents (Priya as top performer, Rahul, Meera). See `backend/` and `scripts/seed/`.

**Replaced:** the Automation-Rule webhook trigger (`backend/src/routes/webhook.js`) gives way to FDK app events.

## 2. Demo script (3 minutes)

| Time | What we show | What we say |
|---|---|---|
| 0:00–0:25 | One slide: 2–5% QA coverage, the MGM $100M figure, the 40% refund social-engineering figure | "QA checks 2–5% of replies, weeks later. The most expensive mistakes happen inside the reply, and by then they can't be undone." |
| 0:25–0:50 | The playbook screen: Priya chosen from CSAT data, her word-for-word phrases, "identity verification" marked critical | "We don't write rules. Reply Guard learns what 'good' looks like from your own best agent, picked from CSAT data." |
| 0:50–1:40 | **Live:** Rahul replies to a refund request without verifying, and clicks Send → **⛔ Stop** modal with Priya's verification wording → **Apply** → corrected reply sent | "It caught the mistake before the customer saw it. One click, and the reply uses your best agent's wording." |
| 1:40–2:00 | A normal how-to reply → **✅ Pass**, nothing shown | "Most replies pass silently. It only speaks up when it matters." |
| 2:00–2:30 | The sidebar and dashboard: advice **adopted**, compliance catches prevented, pass/suggest/stop mix, override rate | "It checks whether the coaching actually worked. The QA coach only gets the exceptions." |
| 2:30–3:00 | The architecture slide | "Built entirely on documented Freshworks app hooks. No admin rules, it fails open, and it's ready for Freddy AI Agent Studio through AI Actions." |

**Fallback:** a pre-recorded screen capture of the live section, in case venue Wi-Fi or the trial tenant fails.

## 3. Success metrics

| Metric | Definition | MVP target |
|---|---|---|
| **Pre-send coverage** | Share of outgoing agent replies checked before sending | 100% (excluding fail-open timeouts, which are checked after sending) |
| **Compliance catches prevented** | Stops where the sent reply then included the missing critical step | Every critical miss in the seeded scenarios |
| **Adoption rate** | Adopted or partially adopted ÷ suggestions and stops shown | Tracked and shown on the dashboard |
| **Override rate** | Overrides ÷ stops. A high rate means too many false positives | Tracked. Target under 20% once the playbook is tuned |
| **Silent pass share** | Share of replies passed with no interruption | Most replies, to protect agent focus |
| **Pre-send latency** | p95 time from Send click to verdict | Under 3 s. Anything slower fails open |
| **Coach workload** | Share of tickets escalated to the human coach | A small minority, each with evidence |

## 4. Risks and mitigations

| Risk | Mitigation |
|---|---|
| False stops annoy agents | Stop only on critical categories with high confidence. Always overridable. Track the override rate. The coach tunes the playbook. |
| Latency at the Send click | Fast model with a cached playbook, a 3–4 s budget, and fail-open behavior with a post-send check |
| Intercept timeout isn't documented | Our own time budget. We'll measure it on the trial tenant early in the build. |
| Freshworks ships its own "Quality Coach" ([blog](https://www.freshworks.com/theworks/company-news/freddy-copilot-customer-service/)) | We're pre-send, learn from the team's own CSAT, and track adoption. We also expose AI Actions so we complement Freddy. |
| Agents feel watched | Frame it as a **safety net and coach**, not surveillance. Silent by default, and suggestions use a teammate's real words. |
| Model makes a wrong judgment | The human stays in control: agents can override, and the coach reviews escalations and signs off the playbook |
| Data privacy | Send only the draft and recent messages, and mask sensitive data like card numbers first |

## 5. Build order (summary)

1. Trial tenant, keys, seed data (existing scripts)
2. Learn the playbook, with CSAT-based top-performer selection
3. Backend `/precheck` with the fast model and caching. Test it with the seeded compliance tickets.
4. FDK app: `ticket.sendReply` intercept, stop modal, suggestion card, Apply
5. Serverless `onConversationCreate` → `/conversation` for adoption tracking and escalation
6. Dashboard
7. Rehearse the demo twice, and record the fallback

Next: [Sources →](sources.md)
