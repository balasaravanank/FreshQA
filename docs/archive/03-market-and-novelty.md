# 03 · Market and novelty

[← Back to overview](README.md)

## 1. How existing tools compare

We checked each tool against the three things Reply Guard combines:

- **Pre-send:** does it check the agent's own draft before the customer sees it?
- **Learns from our team:** is the rubric learned from the team's own top performers?
- **Freshdesk:** does it integrate with Freshdesk?

| Product | What it does | Pre-send? | Learns from our team? | Freshdesk? | Source |
|---|---|---|---|---|---|
| **Cresta** | Real-time chat and voice guidance learned from top performers' conversations | Real-time, while the conversation is live | ✅ | ❌ Not found | [cresta.com/agent-assist](https://cresta.com/agent-assist) |
| **Zendesk real-time QA insights** (early access) | Flags privacy, vulnerability, abuse, churn risk and unresolved issues on open tickets | ❌ Runs after each message is exchanged | Not stated | ❌ Zendesk only | [Zendesk help](https://support.zendesk.com/hc/en-us/articles/9745122485914-Real-time-QA-insights-EAP) |
| **Zendesk AutoQA** | Scores 100% of conversations | ❌ After the fact | Markets "understand what makes a top performer" | ❌ | [AutoQA](https://www.zendesk.com/blog/ai/workflow-automation/auto-qa/) · [Zendesk QA](https://www.zendesk.com/service/quality-assurance/) |
| **Intercom Copilot** | Rephrase, tone and grammar tools in the inbox | Optional, used before sending | ❌ No rubric | ❌ | [Intercom help](https://www.intercom.com/help/en/articles/6955446-ai-features-available-in-the-inbox) |
| **Loris** | Real-time empathy and phrasing suggestions on chat and email | ✅ Real-time suggestions | Not stated | ❌ Not found (Zendesk, LivePerson, Salesforce) | [PR Newswire](https://www.prnewswire.com/news-releases/loris-announces-12m-series-a-to-transform-ai-for-customer-service-301533240.html) |
| **Grammarly Business** | Brand tone and style-guide checks while typing | ✅ While typing | ❌ Style guide, not learned | ❌ Not named | [Grammarly](https://www.grammarly.com/business/customer-support) |
| **Assembled Copilot** | Drafts replies in brand voice, flags drafts that need review | Partly | ❌ | Not stated | [Assembled](https://www.assembled.com/features/ai-copilot) |
| **MaestroQA** | QA scoring and coaching workflows. Starts at $15/agent/month | ❌ After the fact | ❌ | ✅ Marketplace | [Vendr](https://www.vendr.com/marketplace/maestroqa) |
| **Level AI** | QA scoring. Real-time assist is aimed at calls | ❌ for tickets | ❌ | Not stated | [Level AI](https://thelevel.ai/blog/real-time-agent-assist) |
| **EvaluAgent QA** | Shows EvaluAgent scores inside the Freshdesk ticket view | ❌ After the fact | ❌ | ✅ | [Marketplace listing](https://www.freshworks.com/apps/evaluagent_qa/) |
| **Oversai** | AI QA scoring on Freshdesk tickets, from a sample up to 100% coverage | ❌ After the fact | ❌ | ✅ (off-marketplace) | [Oversai](https://www.oversai.com/platforms/freshdesk/ai-qa) |
| **Playvox QA** | QA, coaching and training in one place | Not stated | ❌ | ✅ Marketplace | [Marketplace listing](https://www.freshworks.com/apps/freshdesk/playvox_quality_assurance/) |
| **LanguageTool** | Spelling and grammar checks | ✅ | ❌ | ✅ Marketplace | [Marketplace listing](https://www.freshworks.com/apps/languagetool_spell_and_grammar_checker/) |
| **Freddy Writing Assistant** (native) | Enhance tone, rephrase, expand | Optional, before sending | ❌ | ✅ Native | [Freshdesk support](https://support.freshdesk.com/support/solutions/articles/50000010370-improve-response-quality-with-freddy-ai-s-writing-assistant) |

An independent 2026 roundup of AI ticket-QA tools describes all of them as grading **after** the conversation ([Lorikeet](https://www.lorikeetcx.ai/articles/ai-tools-monitor-grade-support-ticket-quality-2026)).

## 2. Evidence that comparable tools deliver results

These are vendors' own published results, **not independently audited**. We use them to show what's plausible, not as promises.

| Result | Source |
|---|---|
| Blueground: QA coverage went from 2–3% to 5.5%, CSAT rose from 77% to 82%, and 40 hours a week were freed | [Intryc](https://www.intryc.com/customer-stories/how-blueground-freed-40-hours-per-week-while-doubling-qa-coverage-and-boosting-csat-by-5-points) |
| MaestroQA customer: QA score went from about 70% to 90%, and CSAT rose 11% over about six months | [mabl case study](https://www.mabl.com/customer-stories/maestroqa-case-study) |
| Observe.AI customers: about 100% automated QA coverage (DoorDash, about 19k agents; SoFi) | [Observe.AI customers](https://www.observe.ai/customers) |
| Cresta: CSAT up about 20% and ramp time roughly halved (vendor claims) | [cresta.com](https://cresta.com/) |
| Academic field study of thousands of customer-support chat agents: real-time AI suggestions learned from top performers raised resolutions per hour by **15%**, with the biggest gains for novice agents | [Brynjolfsson, Li & Raymond, *QJE* 2025](https://academic.oup.com/qje/article/140/2/889/7990658) |

**On timing, honestly:** research does **not** show that more frequent feedback is always better. In one field study, detailed monthly feedback beat weekly feedback ([Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/1475-679X.12184)). In another, real-time feedback helped experts but hurt novices' first decisions ([Management Science](https://pubsonline.informs.org/doi/10.1287/mnsc.2022.02084)). A classic meta-analysis found that over a third of feedback interventions **reduced** performance ([Kluger & DeNisi](https://www.researchgate.net/publication/232458848)).

**Our design response:** Reply Guard interrupts the agent **only** to stop critical compliance misses, the kind that must be caught before sending. Style suggestions stay optional and one-click, and broader coaching comes as a periodic digest, not constant pop-ups (see [05](05-solution.md)).

## 3. Market size

| Market | Estimate | Source |
|---|---|---|
| Contact center QA software | $2.45B (2026) → $4.14B (2033), 9.1% CAGR | [Coherent Market Insights](https://www.coherentmarketinsights.com/industry-reports/contact-center-quality-assurance-software-market) |
| Contact center QA software (alternative estimate) | $1.47B (2026) → $3.66B (2035), 10.5% CAGR | [Business Research Insights](https://www.businessresearchinsights.com/market-reports/contact-center-quality-assurance-software-market-119650) |
| Conversation intelligence software (broader) | $32.25B (2026) → $52.03B (2030), 12.7% CAGR | [ResearchAndMarkets](https://www.researchandmarkets.com/reports/6226068/conversation-intelligence-software-global-market) |

> **Reliability note:** these come from smaller research firms, not Gartner, IDC or Forrester. Use them as a sense of scale.

## 4. Verdict: what's genuinely new

| Already done by others | New in Reply Guard |
|---|---|
| Real-time guidance learned from top performers (Cresta, not on Freshdesk) | A **pre-send check inside Freshdesk** that can **stop** a critical compliance miss in the agent's own draft |
| After-the-fact QA scoring of 100% of tickets (Zendesk, Oversai, EvaluAgent, MaestroQA) | A rubric **learned automatically from the team's own top performer, chosen by CSAT data**, not a generic checklist |
| Tone and grammar rewriting (Freddy, Intercom, Grammarly) | **Adoption tracking**: did the agent actually follow the advice? Only persistent or critical issues reach the QA coach |
| Freshworks has announced "Quality Coach" features in a blog (not in current docs) | Complements Freddy: exposed to **Freddy AI Agent Studio as AI Actions** |

> **One line:** others either coach without Freshdesk, or score Freshdesk tickets after sending. **Nobody stops a bad reply at the Send button inside Freshdesk and learns what "good" looks like from your own best agent.**

Next: [04 · Personas and journeys →](04-personas-and-journeys.md)
