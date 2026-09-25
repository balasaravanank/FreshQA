# 02 · FreshQA design

[← Back to overview](README.md)

## Same job, done natively and more efficiently

| # | MaestroQA step | Inefficiency | FreshQA |
|---|---|---|---|
| 1 | Data in | Hourly sync into a separate app, a 45-day window, a 12 h first sync | **No sync.** The FDK serverless `onTicketUpdate` event fires when a ticket becomes Resolved/Closed, and the ticket's `responder_id` is the graded agent |
| 2 | Scorecard | Built by hand | **Same model and same math** (standard/bonus/auto-fail sections, N/A, total or weighted, versions), plus an **AI grading instruction** per criterion and a ready-made template |
| 3 | Sampling | A random 2–5% | **AI grades 100%.** Humans review a smart queue: auto-fails, low scores, low AI confidence, appeals, plus a 5% calibration sample |
| 4 | Grading | Every question answered by hand | The scorecard arrives **pre-filled by AI** with evidence quotes and confidence levels, and the coach confirms or changes answers |
| 5 | AutoQA | A paid add-on for simple questions | **AI is the core.** Claude Sonnet 5 answers every criterion, including judgment calls |
| 6 | Appeals | Email and PDF, with multi-step email approval | The agent appeals from the **ticket sidebar**, and the coach accepts or rejects in one click |
| 7 | Calibration | Takes graders' time | **AI-vs-human alignment** is calculated automatically with MaestroQA's formula on every review |
| 8 | Coaching | Written by hand | The AI drafts coaching points from the agent's weakest criteria, with quoted examples |
| 9 | Reporting | In a separate tool | A **dashboard inside Freshdesk** (full-page app), with a cost meter |

## Architecture

```
Freshdesk
 ├─ Ticket resolved ──► FDK serverless onTicketUpdate ──► POST /api/events/ticket-resolved
 ├─ full_page_app  (left nav): coach workspace
 │     dashboard · review queue · AI-prefilled grade view · appeals · coaching · scorecard
 └─ ticket_sidebar: the agent's score, evidence per criterion, Appeal button

Backend (Node 22 + Express + built-in node:sqlite)
 ├─ grading: conversation → Claude Sonnet 5 (scorecard prompt-cached, structured JSON output)
 ├─ scoring: MaestroQA-compatible math (backend/src/scorecard/scoring.js, unit-tested)
 ├─ review queue, reviews + alignment, appeals, coaching drafts, reports, cost tracking
 ├─ nightly backfill of missed tickets via the Message Batches API (50% cheaper)
 └─ write-back to the ticket: private note + cf_quality_score custom field
```

**Official hooks used:**
- `full_page_app` and `ticket_sidebar` placements ([placeholders](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/placeholders/))
- `onTicketUpdate`, where `changes.status` gives the old and new status ([onTicket](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/product-events/onTicket/))
- One recurring scheduled event per install ([scheduled events](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/serverless-apps/scheduled-events/))
- Request templates, which keep the API secret on the server side ([request method](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/request-method/))

**Why evaluations live in the backend:** FDK entity storage is capped at 10,000 records per entity, which is too small for 100% coverage ([limits](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/rate-limits-and-constraints/)).

## Scoring math (identical to MaestroQA)

- **Total points:** Σ earned ÷ Σ max × 100. N/A removes a criterion from both.
- **Weighted sections:** Σ (section earned ÷ section max × weight), with weights renormalized over the sections that have scored criteria
- **Bonus sections** add earned points without raising the max, so the score can exceed 100%
- **Auto-fail:** any auto-fail answer sets the score to 0
- **Alignment** per criterion: 1 − \|AI points − human points\| ÷ criterion max, weighted by the criterion's share of total points. Auto-fail criteria (0 points) are reported as match or mismatch.

Unit tests reproduce MaestroQA's documented examples: 21/35 = 60%, 21/30 = 70% with N/A, and 10/15 vs 7/15 = 80% alignment (`npm test`).

## Human review queue

A ticket enters the queue if any of these is true: an auto-fail answer, a score below 70%, any low-confidence AI answer, an open appeal, or a 5% random calibration sample. The threshold and sample size are configurable in `.env`.

## Cost

Claude API list prices: Sonnet 5 costs $2 per million input tokens and $10 per million output tokens. Cache reads cost about 0.1× the input price, and the Message Batches API is 50% off. Every call's real `usage` is recorded and shown on the dashboard.

| | Per ticket | Per agent per month (about 1,100 tickets) |
|---|---|---|
| Real-time grading, scorecard cached | ≈ $0.006 (estimate) | ≈ $7 |
| Nightly batch backfill | ≈ $0.003 (estimate) | ≈ $3.5 |
| MaestroQA median contract | — | $23,520 per year, all agents |
| Market benchmark | — | ≈ $35 |

The estimates assume about 2,500 input tokens (1,500 of them the cached scorecard) and 400 output tokens per ticket. The dashboard's cost meter shows the **measured** figure once real grading runs.

## Out of scope for the MVP

Screen capture, LMS, voice transcription, conversation analytics, and Freshservice (its `service_ticket` sidebar would reuse the same backend).
