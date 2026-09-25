# 06 · Integration architecture

[← Back to overview](README.md)

## 1. Overview

```
┌──────────────────────── Freshdesk (agent's browser) ────────────────────────┐
│                                                                              │
│  Ticket view                                                                 │
│   ├─ Reply editor ──[Send]──► Reply Guard front end (FDK)                    │
│   │                            • client.events.on("ticket.sendReply",        │
│   │                                 cb, {intercept: true})                   │
│   │                            • reads draft: body / full_text               │
│   │                            • 3–4 s budget → no answer = let it send      │
│   │                            • PASS → event.helper.done()                  │
│   │                            • STOP → event.helper.fail(msg) + modal       │
│   │                            • Apply → interface.trigger("click",          │
│   │                                       {id:"reply", text})                │
│   └─ Ticket sidebar: Reply Guard card (verdict, suggestion, history)         │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ request template (HTTPS, API keys stay server-side)
                ▼
┌──────────────────────── Reply Guard backend (Node.js) ──────────────────────┐
│  POST /precheck      fast model + cached playbook  → pass / suggest / stop  │
│  POST /conversation  deeper model → post-send score, adoption, escalation   │
│  POST /playbook/refresh  strongest model → re-learn playbook from CSAT      │
│  GET  /dashboard/*   coverage, verdict mix, catches, adoption, overrides    │
│  Store: playbook, verdicts, adoption records, escalations                   │
└───────────────▲─────────────────────────────▲────────────────────────────────┘
                │                             │
   FDK serverless (runs in Freshworks)        │ Freshdesk REST v2 (API key)
   • onConversationCreate → /conversation     │ • satisfaction_ratings (CSAT)
   • scheduled event (1 recurring)            │ • tickets / conversations
       → /playbook/refresh                    │ • private notes, tags (escalation)
   • AI Actions (actions.json) ◄── Freddy AI Agent Studio
```

## 2. Components and the official hooks they use

| Component | What it does | Official hook | Source |
|---|---|---|---|
| **Pre-send interceptor** | Catches the Send click, reads the draft, allows or blocks the send | `ticket.sendReply` with `{intercept: true}`; `event.helper.getData()`, `done()`, `fail(msg)` | [FDK events (Freshdesk)](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/events-method/) |
| **One-click rewrite** | Opens the reply editor with the suggested text | `client.interface.trigger("click", {id: "reply", text})`. `setValue` on `editor` works only for apps at `ticket_conversation_editor` | [FDK interface methods](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/) |
| **Stop modal / notices** | Explains a stop and collects the override reason | `showModal`, `showConfirm` (10 s timeout), `showNotify` (title up to 30 characters, message up to 100) | same as above |
| **Sidebar card** | Shows the latest verdict, suggestion and history for the ticket | `ticket_sidebar` placeholder; `client.data.get("ticket")` | [FDK data method](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/data-method/) |
| **Post-send watcher** | Adoption tracking, post-send checks, escalation. Covers timeouts and Freshservice | Serverless `onConversationCreate`. Payload: `body`, `body_text`, `incoming`, `private`, `user_id`, `source`, `is_body_truncated` (10 KB limit) | [FDK onConversation (Freshdesk)](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/product-events/onConversation/) · [(Freshservice)](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/serverless-apps/product-events/onconversation/) |
| **Playbook refresher** | Re-learns the playbook from the latest CSAT data | `$schedule.create` with `repeat` (1 recurring schedule per install) | [FDK scheduled events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/scheduled-events/) |
| **Calling the backend** | Secure HTTPS calls without exposing keys | Request templates (`config/requests.json`) and `invokeTemplate` | [FDK request method](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/request-method/) |
| **Agent Studio bridge** (stretch goal) | Lets Freddy AI agents ask, e.g., "get coaching summary for agent X" or "list open QA escalations" | AI Actions: `actions.json` plus server callbacks. Freshdesk Omni and Freshservice ITSM/ESM, custom apps only | [FDK AI Actions](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/ai-actions/) |
| **CSAT source** | Picks top performers from data | `GET /api/v2/surveys/satisfaction_ratings` (`agent_id`, `ratings`) | [Freshdesk API](https://developers.freshdesk.com/api/) |
| **Escalation writer** | Private note and tag on the ticket, plus the coach's queue | Freshdesk REST v2: notes, ticket update | [Freshdesk API](https://developers.freshdesk.com/api/) |

## 3. Platform limits, and how the design fits them

| Limit (official) | Value | How we fit it |
|---|---|---|
| Intercept timeout | **Not stated in the docs** | Our own front-end budget of about 3–4 s. After that we call `done()` and let the post-send watcher check the reply instead (fail open). |
| Request template timeout | 15 s default, up to 30 s ([request method](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/request-method/)) | The pre-send path uses a **fast, small model** with a **prompt-cached playbook** and short structured output |
| Request rate | 50 requests/min per app ([request method](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/request-method/)) | Fine at MVP scale. For large teams, front-end calls can go straight to the backend domain, or be batched. We'd revisit this before production. |
| Serverless execution | 20 s (40 s with extended request timeout), no `setTimeout`/`setInterval` ([product events](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/serverless-apps/product-events/)) | The serverless handler just forwards the event to the backend and returns. Heavy work happens in the backend. |
| Conversation payload | Body truncated at 10 KB (`is_body_truncated`) | If truncated, the backend fetches the full conversation via REST |
| Scheduled events | 1,000 one-time and **1 recurring** per install; 4 KB payload ([rate limits](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/rate-limits-and-constraints/)) | One recurring job: the playbook refresh |
| Key-value store | 50 requests/min, up to 40 KB per key+value ([rate limits](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/rate-limits-and-constraints/)) | State lives in the backend, not in the app's key-value store |
| MCP action caps | For example, Pro plan: 50/min and 6,000/yr ([Freshdesk MCP](https://support.freshdesk.com/support/solutions/articles/50000012670-model-context-protocol-mcp-integration-in-freshdesk-eap-)) | MCP is **not** used on the real-time path, only for setup and demo scripting |

## 4. Model tiers (fast where latency matters, strong where quality matters)

| Path | Latency need | Model tier | Why |
|---|---|---|---|
| Pre-send check | About 2–3 s | **Fast**, e.g. Claude Haiku 4.5 | Must fit inside the Send-click budget. The playbook is cached across calls. |
| Post-send scoring and adoption | Seconds to minutes | **Balanced**, e.g. Claude Sonnet 5 | Deeper reasoning, and the agent isn't waiting |
| Playbook learning | Minutes, rare | **Strongest**, e.g. Claude Opus 5.5 | Runs rarely, and quality matters most here |

## 5. Freshdesk vs Freshservice

| Capability | Freshdesk (Omni) | Freshservice |
|---|---|---|
| Pre-send check (stop/suggest before sending) | ✅ | ❌ No interceptable events documented ([FS events](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/front-end-apps/events-method/)) |
| Post-send check, adoption tracking, escalation | ✅ | ✅ `onConversationCreate` |
| One-click rewrite into the reply editor | ✅ `id: "reply"` | ✅ `id: "openReply"` ([FS interface](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/front-end-apps/interface-methods/)) |
| AI Actions for Agent Studio | ✅ Omni | ✅ ITSM/ESM |
| Why it matters | Customer support refunds and account changes | IT help desk password resets. This is the MGM-style risk, caught **immediately after** sending instead of weeks later. |

**MVP decision:** build on **Freshdesk Omni** first (full pre-send). Freshservice support reuses the same backend with post-send only.

## 6. Why not Automation Rules, MCP, or only Agent Studio?

| Option | Why it isn't the core |
|---|---|
| Freshdesk Automation Rules + webhook | Needs an admin to configure it per account (a static rule), and it fires **after** sending. Useful only as a fallback. |
| MCP server | No hook into the Send click. Yearly action caps rule out checking every reply. |
| Agent Studio alone | Agents there act on workflows, not inside the agent's reply editor at Send time. We connect to it through AI Actions instead of depending on it. |
| **FDK app (chosen)** | The only documented way to act **at the Send click**, installed once, with the triggers declared in the app itself |

## 7. Unconfirmed items (verify during the build)

| Item | Status | Fallback |
|---|---|---|
| Intercept timeout for `ticket.sendReply` | Not stated in the docs | Our own 3–4 s fail-open budget |
| Custom external MCP servers in Freshservice Agent Studio | Not confirmed | Use AI Actions (documented) |
| Full call transcripts on tickets | Not confirmed | Phase 2: read the Voice Transcription Summarizer's private note |
| Raw `fetch` from serverless instead of request templates | Not confirmed | Use request templates (documented) |

Next: [07 · MVP, demo and metrics →](07-mvp-scope-demo-and-metrics.md)
