# 02 · Freshworks platform research

[← Back to overview](README.md)

This doc answers one question: **what do Freshdesk and Freshservice already do about agent quality, and what do they leave open?** Every fact links to an official Freshworks page (support.freshdesk.com, support.freshservice.com, developers.freshworks.com, freshworks.com). Anything we couldn't confirm is marked **not confirmed**.

## 1. What is native today

### Freddy AI Copilot (for agents)

| Product | Copilot features | Source |
|---|---|---|
| Freshdesk | Writing assistant (expand, rephrase, tone), summarizer, reply suggester, sentiment analysis, canned-response and article suggesters, auto triage, assist bot, live translate, thank-you detector, usage reports | [Overview of Freddy AI for Ticketing](https://support.freshdesk.com/support/solutions/articles/50000010359-overview-of-freddy-ai-for-ticketing) |
| Freshservice | Reply suggester (also multilingual), writing assistant (tone, clarity, grammar), ticket summaries, resolution notes, post-incident reports, similar-incident suggestions, translation | [Freddy AI feature overview](https://support.freshservice.com/support/solutions/articles/50000011728-freddy-ai-feature-overview) |

**Takeaway:** Copilot helps agents *write faster and in a better tone*. None of the listed features check a reply against a quality or compliance rubric, and none track whether coaching was followed. The Writing Assistant rewrites **tone**, not **content correctness** ([Writing Assistant](https://support.freshdesk.com/support/solutions/articles/50000010370-improve-response-quality-with-freddy-ai-s-writing-assistant)).

### Freddy AI Insights

Covers "proactive insights" and "conversational analytics": trends and anomalies at desk level, not scoring of individual agents ([Freddy AI for Ticketing](https://support.freshdesk.com/support/solutions/articles/50000010359-overview-of-freddy-ai-for-ticketing)).

### Evaluate AI agent

Grades the **Freddy bot's** answers (thumbs up/down, Accepted/Rejected), not human agents ([Evaluate AI agent](https://support.freshdesk.com/support/solutions/articles/50000011715-evaluate-ai-agent)).

### XLAs (Experience Level Agreements), Freshservice, launched May 2026

Each ticket gets a **Unified Experience Score** from 0 to 100, weighted from Service Reliability, Service Quality and Requester Effort. Agents see it while the ticket is open. It measures the **ticket experience**, not whether an agent's reply was correct or compliant. A per-agent rollup is not confirmed ([XLAs](https://support.freshservice.com/support/solutions/articles/50000013895-experience-level-agreements-xlas-)).

### MCP servers (both products, generally available since 10 Sep 2026)

| | Freshdesk | Freshservice |
|---|---|---|
| Tools | 41 read + write tools (tickets, conversations, contacts, agents…) | 40+ read + write tools (tickets, assets, catalog…) |
| Auth | API key only | OAuth 2.0 or API key |
| Limits | Growth 25/min & 1,200/yr · Pro 50/min & 6,000/yr · Enterprise 100/min & 12,000/yr | Same tiers |
| Source | [Freshdesk MCP](https://support.freshdesk.com/support/solutions/articles/50000012670-model-context-protocol-mcp-integration-in-freshdesk-eap-) | [Freshservice MCP](https://support.freshservice.com/support/solutions/articles/50000012678-model-context-protocol-mcp-integration-in-freshservice) |

**Takeaway:** MCP lets external AI tools *read and act on* tickets. It has no hook into the Send button, and the yearly action caps make it unsuitable for checking every reply. We use it for **setup and demo scripting**, not for the real-time path.

### Freddy AI Agent Studio

- **Freshservice** (launched 14 May 2026): no-code custom agents that run step-by-step workflows through 30 built-in integrations, available in the portal, Teams and Slack ([Agent Studio FAQs](https://support.freshservice.com/support/solutions/articles/50000013885-ai-agent-studio-faqs)). Outbound MCP to Atlassian, Notion and Linear is in early access ([May 2026 launch](https://www.freshworks.com/theworks/company-news/may-2026-launch/)). Connecting an arbitrary custom MCP server: **not confirmed**.
- **Freshdesk:** Agent Studio for customer-facing bots ([Freshdesk Agent Studio](https://support.freshdesk.com/support/solutions/articles/50000011711-freddy-ai-agent-studio-configure-automate-and-scale-with-ai)). Its "API actions" can call external REST APIs ([API actions](https://support.freshdesk.com/support/solutions/articles/50000011661-connect-to-external-systems-using-api-actions)).
- **For app developers:** since July 2026, Marketplace apps can expose **AI Actions** (`actions.json` plus server callbacks) that Agent Studio agents can call. Supported on Freshdesk Omni and Freshservice ITSM/ESM, as custom apps only ([FDK AI Actions](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/ai-actions/), [What's new](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/whats-new/)).

### Calls (Freshdesk Contact Center / Freshcaller)

- Call recordings attach to the ticket as a **private note with audio** ([Converting calls to tickets](https://support.freshdesk.com/support/solutions/articles/169203-converting-phone-calls-to-tickets)).
- The **Voice Transcription Summarizer**, a paid Copilot add-on for Pro and Enterprise, summarizes call transcripts and appends the summary as a private note when the agent clicks "summarize" ([Voice Transcription Summarizer](https://crmsupport.freshworks.com/support/solutions/articles/50000008383-voice-transcription-summarizer)).
- Full transcript text stored on the ticket: **not confirmed**. FDK call events (`onCallCreate` / `onCallUpdate`) don't document a transcript field ([FDK call events](https://developers.freshworks.com/docs/app-sdk/v3.0/call/serverless-apps/product-events/oncall/)).

## 2. What developers can hook into (the gap we use)

| Capability | Freshdesk | Freshservice | Source |
|---|---|---|---|
| Intercept the **Send reply** click and read the draft | ✅ `ticket.sendReply`, `intercept: true`; payload has `body` and `full_text` | ❌ Only click and change events are supported | [FD events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/events-method/) · [FS events](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/front-end-apps/events-method/) |
| Put suggested text into the reply editor | ✅ `interface.trigger("click", {id:"reply", text})` | ✅ `click` with `openReply` + `text` | [FD interface](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/) · [FS interface](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/front-end-apps/interface-methods/) |
| React to every new message **without automation rules** | ✅ `onConversationCreate` | ✅ `onConversationCreate` | [FD onConversation](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/product-events/onConversation/) · [FS onconversation](https://developers.freshworks.com/docs/app-sdk/v3.0/service_ticket/serverless-apps/product-events/onconversation/) |
| Expose actions to Freddy AI Agent Studio | ✅ Omni | ✅ ITSM/ESM | [AI Actions](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/ai-actions/) |
| Per-agent CSAT data | ✅ `GET /api/v2/surveys/satisfaction_ratings` returns `agent_id` and `ratings` | CSAT endpoints exist in the v2 API | [Freshdesk API](https://developers.freshdesk.com/api/) |

## 3. Risk we disclose openly

A Freshworks blog post (first published Feb 2024, updated Aug 2026) names a **"Real-Time Quality Coach"** and a **"Post-Resolution Quality Coach"**, the latter giving supervisors reports that evaluate agents' performance ([Freshworks blog](https://www.freshworks.com/theworks/company-news/freddy-copilot-customer-service/)).

- **Neither appears** in the current Freddy AI support docs linked above, so we can't confirm they ship today.
- **How we're different, even if they do ship:**
  1. We check **before sending** and can **stop** a critical compliance miss.
  2. The rubric is **learned from the team's own top performer, chosen by CSAT data**, not a generic model.
  3. We **track whether each piece of advice was adopted** and escalate only persistent or critical issues.
- **What it means strategically:** Freshworks clearly sees value here, which supports the pitch. Building Reply Guard as a Marketplace app that also exposes **AI Actions** makes it complementary to Freddy rather than a competitor.

## 4. Summary

| Question | Answer |
|---|---|
| Does Freshworks natively check agent replies against a quality/compliance rubric? | **No**, based on current support docs |
| Does anything natively act *before* a reply is sent? | **No**. The Writing Assistant is optional and changes tone only. |
| Can an app act before sending? | **Yes in Freshdesk** (`ticket.sendReply` intercept). **No in Freshservice** (post-send only). |
| Can this work without admin automation rules? | **Yes**, using front-end events and serverless product events declared by the app |
| Can Freddy's own agents use it? | **Yes**, through AI Actions (Freshdesk Omni, Freshservice ITSM/ESM) |

Next: [03 · Market and novelty →](03-market-and-novelty.md)
