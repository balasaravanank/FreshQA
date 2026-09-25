# FreshQA: MaestroQA-class quality assurance, built into Freshdesk

**What we're building:** the QA workflow support teams pay MaestroQA for (scorecards, grading, calibration, appeals, coaching, reports), running **natively inside Freshdesk**.

**Why:** MaestroQA grades tickets in a separate app, syncs them hourly, and relies on a human-graded random sample of 2–5%. Its median contract is **$23,520 a year** plus $2–10k to implement.

**How ours is more efficient:**

| | MaestroQA | FreshQA |
|---|---|---|
| Coverage | Random 2–5% sample graded by people (AI is a paid add-on) | **100%**: AI grades every resolved ticket |
| Getting data in | Hourly sync into a separate app | **Instant**: graded the moment a ticket is resolved |
| Grader work | Answer every question by hand | Confirm a scorecard **pre-filled by AI** with evidence |
| Where people work | MaestroQA's web app, plus email for appeals | **Inside Freshdesk**: coach workspace and agent sidebar |
| Calibration | Graders re-grade samples | AI-vs-human alignment measured automatically |
| Running cost | Median $23.5k a year | ≈ **$0.006 per ticket** in AI cost (≈ $7 per agent per month) |

## Docs

1. [How MaestroQA works](01-how-maestroqa-works.md): its 9-step workflow and price, from its own help center
2. [FreshQA design](02-freshqa-design.md): how each step is done natively, the architecture, scoring math and cost
3. [Setup guide](03-setup-guide.md): every API key, Freshdesk setting and command needed to run FreshQA for real
4. [Technical deep dive](04-technical-deep-dive.md): the tech stack, the full grading flow, every backend module and API endpoint, the dashboard screen by screen, cost mechanics, and limitations found while building it
5. [Demo script](05-demo-script.md): a rehearsed 3-minute walkthrough using the real live-graded data

## Hackathon final submission

**[FreshQA_Final_Submission.docx](FreshQA_Final_Submission.docx)** — the consolidated submission document: problem, market fit, solution & agentic design, architecture, Freshworks integration, business case & cost, product/UX, live demo results, business impact, and a rubric self-assessment, all in one place.

Earlier ideas are kept in [archive/](archive/) for reference only.
