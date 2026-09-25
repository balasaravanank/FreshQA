# Reply Guard: a pre-send AI quality coach for Freshdesk and Freshservice

> The Great Agent Hackathon 2026 · Track 1 (Customer & Employee Experience) · Research current as of September 2026

## The problem in one sentence

When a support agent replies to a customer, **nobody checks the reply before it goes out**, and Quality Assurance (QA) only reviews **2–5% of replies, weeks later** ([Calabrio](https://www.calabrio.com/blog/call-center-quality-assurance-best-practices/), [Intryc/Blueground](https://www.intryc.com/customer-stories/how-blueground-freed-40-hours-per-week-while-doubling-qa-coverage-and-boosting-csat-by-5-points)).

## Why it matters

The most expensive mistakes happen **inside the reply**. A typical case: an agent resets a password or approves a refund without verifying who they're talking to.

- MGM Resorts reported about **$100M** in losses after attackers impersonated an employee in a call to its IT help desk ([Specops summary](https://specopssoft.com/blog/mgm-resorts-service-desk-hack/)).
- **40% of consumers** say they have used social-engineering tactics to get refunds from support reps ([Kount](https://kount.com/resources/data-reports/social-engineering-trends-refund-return-process)).

Today QA finds these mistakes weeks later, if it finds them at all. By then the refund has been paid or the account has been taken over.

## The solution in one sentence

**Reply Guard** checks every reply **at the moment the agent clicks Send**. It uses a playbook learned from the team's own best agent, and it picks that agent automatically from CSAT data. Each reply gets one of three outcomes:

| Outcome | What the agent sees |
|---|---|
| ✅ **Pass** | Nothing. The reply sends normally. This covers most replies. |
| 💡 **Suggest** | A better version in the top performer's style, which the agent can apply with one click or ignore |
| ⛔ **Stop** | A critical step is missing (for example, no identity check before a refund). The agent fixes the reply or overrides with a logged reason. |

After the reply is sent, Reply Guard checks **whether the agent took the advice**. It alerts the human QA coach **only** when problems repeat or are serious.

```
Agent writes a reply ──► clicks Send
                           │
             Reply Guard intercepts the send  (FDK event: ticket.sendReply)
                           │ draft text
                           ▼
      Check against the team playbook (learned from the best agent, chosen by CSAT)
          │                   │                        │
        PASS               SUGGEST                    STOP
     reply sends     one-click better version   critical step missing
                        (agent decides)          → fix it, or override with a reason
                           │
             After sending  (FDK event: onConversationCreate)
                           ▼
      Advice adopted?          → coaching record for the agent
      Repeated/critical misses → escalated to the QA coach, with evidence
      On a schedule            → re-learn the playbook from the latest CSAT data
```

## Why it's new

We found no product that checks a human agent's draft **before it's sent**, inside Freshdesk, against a rubric **learned from the team's own CSAT data**, and then **tracks whether the coaching was adopted**. Existing tools either score after the fact (Zendesk AutoQA, EvaluAgent, Oversai, MaestroQA), change only the tone (Freddy Writing Assistant, Intercom), or give real-time guidance without integrating with Freshdesk (Cresta). See [03 · Market and novelty](03-market-and-novelty.md).

## Why it's feasible

Every hook it needs is in Freshworks' **official** developer docs, and none of it requires admin-configured automation rules:

- An app can **intercept the Send click** and read the draft (`ticket.sendReply` with `intercept: true`) ([FDK events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/events-method/)).
- It can **insert a suggested rewrite** into the reply editor ([FDK interface methods](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/interface-methods/)).
- It can **react to every sent message** (`onConversationCreate`) ([FDK product events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/product-events/onConversation/)).
- It can **expose its capabilities to Freddy AI Agent Studio** as AI Actions ([FDK AI Actions](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/ai-actions/)).

See [06 · Integration architecture](06-integration-architecture.md).

## Read next

| # | Doc | What it covers |
|---|---|---|
| 01 | [Problem](01-problem.md) | Who is hurt, the evidence, and the narrowed problem statement |
| 02 | [Freshworks platform research](02-freshworks-platform-research.md) | What Freshdesk and Freshservice already do, and what they leave open |
| 03 | [Market and novelty](03-market-and-novelty.md) | Competitors, market size, and what exactly is new |
| 04 | [Personas and journeys](04-personas-and-journeys.md) | Who uses it, with a before/after walk-through of one risky ticket |
| 05 | [Solution](05-solution.md) | How Reply Guard works, its guardrails, and why it isn't rule-based |
| 06 | [Integration architecture](06-integration-architecture.md) | Exact Freshworks hooks, platform limits, and component design |
| 07 | [MVP, demo and metrics](07-mvp-scope-demo-and-metrics.md) | What we build in 24 hours, the demo script, and how we measure success |
| — | [Sources](sources.md) | Every reference, labeled by reliability |

> An earlier write-up, `AI_Quality_Coach_Research_and_Solution.docx`, describes a post-hoc scoring design. These Markdown docs replace it.
