# 01 · How MaestroQA works

[← Back to overview](README.md)

MaestroQA is the QA tool many Freshdesk teams pay for today. This doc describes its workflow step by step, from its own help center, so we can rebuild the same job natively.

## The workflow

| # | Step | How MaestroQA does it | Source |
|---|---|---|---|
| 1 | **Data in** | Syncs Freshdesk tickets and fields (channel, tags, status, group, agents, CSAT) into its own web app. The first sync takes up to 12 h, then it runs about hourly, and only for tickets updated in the last 45 days by agents marked "Available". Agent-mapping rules decide who gets graded (the recommended default is "solved + public comments"). | [Syncing tickets](https://help.maestroqa.com/en/articles/3162869-syncing-tickets-with-maestroqa), [Ticket attributes](https://help.maestroqa.com/en/articles/4346812-standard-ticket-attributes), [Agent association](https://help.maestroqa.com/en/articles/3168348-agent-ticket-association-controls) |
| 2 | **Scorecard** | Sections, which hold criteria (questions), which have options (answers). Section types are **standard**, **bonus** (can push the score past 100%) and **auto-fail** (any auto-fail answer sets the score to 0%). **N/A** removes a question from both earned and maximum points. Scoring is total points (earned ÷ max × 100) or weighted sections (Σ section % × weight). Rubrics are versioned. | [Structure](https://help.maestroqa.com/en/articles/4537176-rubric-scorecard-structure), [Question types](https://help.maestroqa.com/en/articles/4520461-rubric-question-option-types), [Total points](https://help.maestroqa.com/en/articles/4544009-how-do-total-point-rubrics-work), [Weighted](https://help.maestroqa.com/en/articles/4547978-how-do-custom-weighted-sections-rubrics-work), [Versioning](https://help.maestroqa.com/en/articles/6804026-rubric-versioning) |
| 3 | **Sampling** | "Automations" **randomly** pick N tickets per agent or per grader from filters (date, tags, CSAT…) on a daily, weekly or monthly schedule, and assign them to graders | [Automations](https://help.maestroqa.com/en/articles/4764111-how-to-create-grader-based-automations), [Assignment types](https://help.maestroqa.com/en/articles/4323600-assignment-types) |
| 4 | **Grading** | A human grader works through a queue one ticket at a time ("Quick Grade"), answers every question by hand, highlights text and adds comments. Grading time is tracked. | [Quick Grade](https://help.maestroqa.com/en/articles/5803317-quick-grade-the-new-grading-workflow), [Annotating](https://help.maestroqa.com/en/articles/1319486-annotating-tickets) |
| 5 | **AutoQA** | An AI add-on (LLM, phrase-match and process-based metrics) that scores 100% of tickets. It fits best for simple questions; knowledge and resolution questions still need humans. | [AutoQA](https://www.maestroqa.com/features/auto-qa), [AutoQA guide](https://www.maestroqa.com/guides/mastering-autoqa-scorecards) |
| 6 | **Feedback and appeals** | Graded tickets are shared with agents by scheduled email or PDF. An agent appeals a specific question with a reason. Approval passes through several people by email (agent → approver → reviewer). An optional deadline can be set. | [Sharing grades](https://help.maestroqa.com/en/articles/1319418-automate-sharing-graded-tickets), [Multi-approval appeals](https://help.maestroqa.com/en/articles/6701855-multi-approval-agent-qa-appeals), [Deadlines](https://help.maestroqa.com/en/articles/9020280-setting-appeal-deadlines-for-agent-qa) |
| 7 | **Calibration** | In team calibration, graders score the same ticket blind. In grader QA, a benchmark grader re-grades a sample. **Alignment per question = 100% − \|original − benchmark\| ÷ question max**, weighted by the question's share of points (for example, 10/15 vs 7/15 = 80%). | [Team calibration](https://help.maestroqa.com/en/articles/3063157-team-calibration-workflow), [Grader QA](https://help.maestroqa.com/en/articles/4364854-what-is-grader-qa-and-why-is-it-important), [Alignment score](https://help.maestroqa.com/en/articles/4364995-what-is-an-alignment-score) |
| 8 | **Coaching** | A coaching session records the medium, date, coaching points tied to KPIs, to-dos and notes, and can email the agent | [Coaching sessions](https://help.maestroqa.com/en/articles/5398852-intro-coaching-sessions) |
| 9 | **Reporting** | Team trends, team overview, a QA breakdown by rubric, question or attribute, a raw export (one row per question per ticket), and grader stats | [Team trends](https://help.maestroqa.com/en/articles/3345459-team-trends-overview-report), [QA breakdown](https://help.maestroqa.com/en/articles/3345704-qa-breakdown), [Raw export](https://help.maestroqa.com/en/articles/1363737-exporting-raw-scores) |

## What it costs

| Item | Figure | Source |
|---|---|---|
| Median annual contract | **$23,520** (range $6,720–$131,020, 106 purchases) | [Vendr](https://www.vendr.com/marketplace/maestroqa) |
| Implementation | $2,000–10,000 extra; renewals typically +5–10% a year | [Vendr](https://www.vendr.com/marketplace/maestroqa) |
| AI features | Extra purchase ("drives the cost up significantly") | [G2 review snippet](https://www.g2.com/products/maestroqa/reviews?qs=pros-and-cons) |
| Market benchmark for QA tools | About $35/agent/month (Zendesk QA, EvaluAgent) | [EvaluAgent pricing](https://www.evaluagent.com/pricing/) |
| Human grading throughput | About 20–40 tickets an hour, roughly $1+ per ticket, which is why coverage stays at 2–5% | [Lorikeet](https://www.lorikeetcx.ai/articles/how-to-qa-100-percent-tickets-human-ai-guide) |

## How it connects to Freshdesk

- The Marketplace listing is v1.0, about 10 years old, installed via "Visit site", and supports Freshdesk and Freshdesk Omni only. **Freshservice isn't supported** ([listing](https://www.freshworks.com/apps/maestroqa/)).
- Grading, reports and appeals all happen in **MaestroQA's own web app**, not inside Freshdesk.

> **Note:** a competitor's article reports that MaestroQA rebranded to **Rippit** in Feb–Mar 2026 and is moving away from QA ([Oversai](https://www.oversai.com/news/maestroqa-rebranded-rippit-2026)). This comes from a competitor, so verify it before relying on it.

Next: [02 · Native QA design →](02-native-qa-design.md)
