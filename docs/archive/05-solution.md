# 05 · Solution: Reply Guard

[← Back to overview](README.md)

## 1. What it is

Reply Guard is a **Freshdesk Marketplace app plus a small backend service**. It does four things, all driven by the team's own data:

| # | Capability | When it runs |
|---|---|---|
| 1 | **Learn the playbook** from the team's top performer, chosen by CSAT | Once at install, then on a schedule |
| 2 | **Check every reply before sending** and return pass, suggest or stop | Every time an agent clicks Send |
| 3 | **Track adoption**: did the agent follow the advice? | After every sent reply |
| 4 | **Escalate exceptions** to the QA coach, with evidence | When issues are critical or keep repeating |

## 2. How each part works

### 2.1 Learning the playbook (data-driven, no hand-written rules)

1. **Find the top performers from data.** Pull per-agent CSAT through `GET /api/v2/surveys/satisfaction_ratings` (returns `agent_id` and `ratings`) ([Freshdesk API](https://developers.freshdesk.com/api/)). Rank agents by average CSAT, weighted by volume. Give extra credit for **recoveries**: tickets where the customer's first message was negative and the final rating was high.
2. **Collect their best tickets.** Fetch the conversations on those high-rated tickets.
3. **Extract the playbook with an LLM.** A strong model reads the conversations and outputs a structured rubric of 5–6 categories. Each category has a description, **word-for-word example phrases** from the top performer, anti-patterns, and a flag marking whether it's a **critical compliance** category (for example, identity verification before account or payment changes).
4. **Human sign-off.** The QA coach reviews the playbook once before it goes live and can edit it.
5. **Keep it current.** A scheduled job re-runs steps 1–3 as new CSAT data arrives. The FDK allows one recurring scheduled event per install, which is enough ([FDK scheduled events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/scheduled-events/)).

### 2.2 The pre-send check

1. The agent clicks **Send**. The app intercepts the click (`ticket.sendReply` with `intercept: true`) and reads the draft (`body` / `full_text`) ([FDK events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/events-method/)).
2. The draft, plus the recent customer messages for context, goes to the backend.
3. A **fast LLM** compares it against the playbook and returns a structured verdict:

| Verdict | Condition | What the agent sees | How the app responds |
|---|---|---|---|
| ✅ **Pass** | No important issue | Nothing | `event.helper.done()`: the reply sends |
| 💡 **Suggest** | Could be clearly better (missing empathy, no next step, vague timeline) | Sidebar card: what's missing, plus the top-performer version. Buttons: **Apply** / **Send as is** | Send continues if they choose "Send as is". **Apply** puts the rewrite into the editor |
| ⛔ **Stop** | A **critical compliance** category is violated **with high confidence** | Modal: what's missing and why, the corrected wording, and an **override with reason** option | `event.helper.fail("…")` blocks the send until they fix it or override |

4. The **Apply** button uses `client.interface.trigger("click", {id: "reply", text})` to open the reply editor with the corrected text ([FDK interface methods](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/)).

### 2.3 Adoption tracking (closing the loop)

When the reply is actually sent, the serverless event `onConversationCreate` fires with the sent text (`body_text`, `user_id`, `incoming: false`) ([FDK onConversation](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/product-events/onConversation/)). The backend compares the sent reply with the earlier verdict:

| Result | Meaning |
|---|---|
| **Adopted** | The flagged issue is fixed in the sent reply |
| **Partially adopted** | Some of the issues are fixed |
| **Ignored** | A suggestion was shown and the reply went out unchanged |
| **Overridden** | A stop was overridden, with the agent's stated reason |

This event also covers replies that bypass the pre-send check (for example, if the check timed out) and **all Freshservice replies**, where pre-send isn't available (see [06](06-integration-architecture.md)).

### 2.4 Escalation to the QA coach

The backend opens an escalation (a private note and a tag on the ticket, plus an entry in the coach's queue) when any of these happen:

- A **critical stop was overridden**, and the stated reason doesn't hold up
- The **same critical category** is ignored or overridden repeatedly by one agent
- A critical issue is found **after** sending (a missed pre-send check, or Freshservice)

Everything else is handled at the moment of sending. The coach's time goes only to cases that need a human.

## 3. Why this isn't rule-based

| Part | Static-rules approach (what we avoid) | Reply Guard |
|---|---|---|
| What "good" means | A hand-written checklist | **Learned** from the team's own top performer's tickets, re-learned on a schedule |
| Who the top performer is | Hand-picked by a manager | **Chosen from CSAT data**, and updates automatically |
| Judging a reply | Keyword matching ("contains 'sorry'?") | An **LLM reasons** about the draft in context, against the playbook |
| Triggers | Admin-configured Automation Rules and webhooks | **App events** declared in the app manifest: `ticket.sendReply` and `onConversationCreate` |

## 4. Guardrails

1. **Never writes to the customer.** Reply Guard never sends or edits a customer-facing message by itself. The agent always clicks Send.
2. **Fails open.** If the check doesn't return within a time budget of about 3–4 seconds, the reply sends normally and is checked after sending instead. Support is never blocked by our outage. The docs don't state a timeout for intercepted events, so we enforce our own ([FDK events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/events-method/)).
3. **Stops only when it's critical and the model is confident.** Everything else is an optional suggestion.
4. **Always overridable.** Every stop can be overridden with a reason, and every override is logged and visible to the coach.
5. **Minimizes data.** Only the draft and recent messages are sent to the model, and obvious sensitive data like card numbers is masked first.
6. **Human sign-off on the playbook** before it goes live.

## 5. Why it's new, and why it's feasible

| New | Feasible |
|---|---|
| Stops a bad reply **before** the customer sees it, **inside Freshdesk** | `ticket.sendReply` intercept, with the draft in the payload: official FDK v3.0 |
| Rubric **learned from the team's own best agent via CSAT** | `satisfaction_ratings` API returns `agent_id` |
| **Adoption tracking**, with escalation only for exceptions | `onConversationCreate` gives the sent text, with no automation rules needed |
| Can be called by **Freddy AI Agent Studio** | AI Actions for Marketplace apps (July 2026) |
| Works across Freshworks products | Freshservice supports `onConversationCreate` and inserting text into the reply editor (post-send coaching) |

## 6. Explicit non-goals

- **Not** another reply writer. Freddy Copilot already drafts replies, and we don't compete with it.
- **Not** an after-the-fact scoring dashboard alone. Scoring is a side effect of the check, not the product.
- **Not** real-time voice coaching in the MVP. Call transcripts aren't confirmed to be available to apps. Calls are phase 2, using the Voice Transcription Summarizer's private note as input.

Next: [06 · Integration architecture →](06-integration-architecture.md)
