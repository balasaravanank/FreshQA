# 01 · The problem

[← Back to overview](README.md)

## 1. How support quality is checked today

Every support team has someone in a **Quality Coach / QA analyst** role. They pick some finished tickets and calls, score them against a checklist, and coach agents on what to improve.

That role runs into a hard limit: reviewing one conversation properly takes several minutes, and one person has only so many hours. So QA reviews a small **sample**, and only **after** the conversation is over.

| Evidence | Source |
|---|---|
| Manual QA "typically covers just 2–5% of interactions" | [Calabrio](https://www.calabrio.com/blog/call-center-quality-assurance-best-practices/) |
| Sampling about 5% of conversations is the industry default, and it's costing companies money | [IrisAgent](https://irisagent.com/blog/automated-qa-for-customer-support-why-sampling-5-of-conversations-is-costing/) |
| One real team (Blueground) started from **2–3%** manual QA coverage | [Intryc case study](https://www.intryc.com/customer-stories/how-blueground-freed-40-hours-per-week-while-doubling-qa-coverage-and-boosting-csat-by-5-points) |

> **Reliability note:** these numbers come from vendors and case studies, not from an independent analyst report. They agree with each other, so treat them as a strong direction rather than a certified statistic.

## 2. Two gaps, not one

Sampling creates two separate gaps:

1. **The coverage gap:** 95%+ of replies are never looked at.
2. **The timing gap:** the 5% that are reviewed get checked days or weeks later. By then the customer already has the reply. A post-hoc review can coach the agent for next time, but it **can't undo a reply that has already been sent**.

Automated QA tools that score 100% of tickets (see [03](03-market-and-novelty.md)) close the first gap. They still score **after sending**, so the second gap stays open.

## 3. Why the timing gap is the costly one

Most quality problems are soft: a missing apology, a vague timeline. Those cost satisfaction points. The expensive problems are **compliance misses inside the reply**:

- Resetting a password or disabling two-factor login **without verifying identity**
- Approving a **refund** without the required checks
- Sharing account details with someone who hasn't been verified

Support agents are a well-known target for exactly these attacks:

| Evidence | Source |
|---|---|
| MGM Resorts reported about **$100M** in Q3 2023 losses after attackers impersonated an employee in a call to its **IT help desk** | [Specops summary](https://specopssoft.com/blog/mgm-resorts-service-desk-hack/). This is a secondary source; the original SEC filing wasn't reviewed. |
| **40%** of consumers say they've used social-engineering tactics to get refunds from customer service reps | [Kount report](https://kount.com/resources/data-reports/social-engineering-trends-refund-return-process) |

A QA review two weeks later finds this kind of mistake **after the money or the account is already gone**. The only point where it can be prevented is **before the reply is sent**.

## 4. Who is hurt

| Who | How it hurts them |
|---|---|
| **Frontline agent** | Gets feedback rarely and late, usually only after an escalation. Has no way to learn what the team's best agent does differently. |
| **QA coach** | Spends time on a random 5% sample instead of the tickets that actually need a human. Finds compliance misses only after the damage. |
| **Head of support / CX** | Quality reports rest on a small sample. Can't see which skill gap is dragging down which team. |
| **The company** | Fraud and refund losses, account-takeover risk, compliance exposure, and churn from poorly handled tickets |

## 5. The narrowed problem statement

> **Replies reach customers without any check. The QA that does exist reviews only 2–5% of replies, after they're sent, so the most expensive mistakes (compliance misses like skipped identity verification) can't be prevented, only discovered.**

We deliberately **don't** try to solve all of support quality. We focus on one moment, **the Send click**, because it's the last point where a bad reply can still be stopped, and because Freshworks' platform lets an app act at exactly that moment (see [06](06-integration-architecture.md)).

## 6. What "solved" looks like

- **100%** of outgoing agent replies are checked before they're sent, not a sample
- Critical compliance misses are **stopped before the customer receives them**
- Agents get **specific, in-context** guidance based on their own team's best agent, not a generic checklist
- The QA coach reviews **only the escalated cases**, each with evidence attached
- Managers can see whether the coaching actually changed behavior

Next: [02 · Freshworks platform research →](02-freshworks-platform-research.md)
