# 04 · Technical deep dive

[← Back to overview](README.md)

This doc explains **exactly how FreshQA works**: every tool used, the full request flow for a ticket, every backend module, every screen in the app, and — since that's the whole point of the project — a direct check against MaestroQA's own documented behavior to confirm we do the same job, more efficiently.

## 1. Tech stack

| Layer | Tool | Why this one |
|---|---|---|
| Backend runtime | Node.js 22 | Native `node:sqlite` (no external DB driver needed), modern `fetch`/test runner built in |
| Web server | Express 4 | Thin REST API, nothing fancier needed |
| Database | SQLite via the built-in `node:sqlite` module | Zero setup, one file (`backend/data/freshqa.db`), enough for a hackathon's data volume |
| AI grading | **Claude Sonnet 5** (`claude-sonnet-5`) via `@anthropic-ai/sdk` | Fast + cheap enough to grade every ticket in real time; strong enough to judge tone/empathy/compliance, not just keywords |
| Bulk backfill | Claude **Message Batches API** | Same model, 50% cheaper, for grading a backlog of tickets that weren't caught live |
| Structured output | `zod` schemas + `client.messages.parse()` (Anthropic SDK's structured-output helper) | Every grading call returns **guaranteed-valid JSON** matching our schema — no regex-parsing model text |
| Freshdesk access | Freshdesk REST API v2 (via `axios`) | Read tickets/conversations, write private notes + a custom field back |
| In-Freshdesk app | Freshworks Developer Kit (FDK), App SDK v3.0 | The only documented way to place UI inside Freshdesk itself (left-nav app + ticket sidebar) and react to ticket events without admin-configured automation rules |
| Local tunnel (dev only) | ngrok | Freshdesk (a live SaaS) can't reach `localhost`, so a tunnel exposes the backend during development/demo |
| Front end | Plain HTML/CSS/vanilla JS, no framework | Small enough surface area that React/Vue would be pure overhead; the FDK app bundle stays tiny |

**No LangChain, no vector DB, no queue system.** The whole "AI" part is one well-structured prompt per ticket, called through the official SDK.

## 2. The full flow for one ticket

```
1. Agent resolves a ticket in Freshdesk
        │
        ▼
2. FDK serverless handler `onTicketUpdate` fires (fdk-app/server/server.js)
   - checks payload.data.ticket.changes.status for a change TO Resolved/Closed
   - POSTs { ticket_id } to the backend's /api/events/ticket-resolved
        │
        ▼
3. Backend (backend/src/routes/api.js) responds 202 immediately (FDK functions
   time out at 20s — we must not block), then grades asynchronously:
   evaluations.evaluateFreshdeskTicket(ticketId)
        │
        ▼
4. freshdeskClient.getTicketTranscript(ticketId)
   - GET /tickets/:id  and  GET /tickets/:id/conversations
   - strips HTML, tags each message speaker: customer | agent
   - resolves the agent's display name (Freshdesk name, or a local override —
     see §7, "the agent-rename limitation")
        │
        ▼
5. scorecards.active() — loads the current scorecard (versioned JSON, §5)
        │
        ▼
6. claudeClient.gradeTicket(scorecard, transcript)  — Claude Sonnet 5
   - system prompt = grading instructions + the full scorecard, ~1,500 tokens,
     marked `cache_control: ephemeral` so repeat calls reuse the cached prefix
     at ~10% of input price
   - user message = the ticket transcript
   - output_config.format = a Zod schema (answers[], summary) — the SDK's
     `messages.parse()` guarantees the response matches it or throws
        │
        ▼
7. scoring.js computeScore(scorecard, answers) — pure function, no AI:
   MaestroQA-identical math (§5) → { score, autoFailed }
        │
        ▼
8. Persist: an `evaluations` row (SQLite) + a `usage` row (real token counts
   and $ cost from the API response, for the cost meter)
        │
        ▼
9. Write back to Freshdesk: a private note (human-readable score + evidence)
   and the `cf_quality_score` custom field — both via freshdeskClient
        │
        ▼
10. The agent's ticket sidebar and the coach's dashboard both read this same
    evaluation row — one grading pipeline, two views (§6)
```

**Everything after step 3 also runs identically** when a coach clicks the sidebar's manual "grade" path, or when the nightly backfill collects Batch API results — it's the same `evaluations` service either way. There's exactly one grading code path (`backend/src/services/evaluations.js`), not one for "live" and a different one for "bulk."

## 3. Every backend module, in one table

| File | Responsibility |
|---|---|
| `src/config.js` | Reads `.env`, exposes typed getters (`config.freshdesk()`, `config.anthropicApiKey()`, etc.), throws a clear error if a required key is missing |
| `src/db.js` | Opens the SQLite file, creates all tables if missing (idempotent `CREATE TABLE IF NOT EXISTS`) |
| `src/errors.js` | Two helpers, `badRequest()` / `notFound()`, so route handlers can `throw` and one error middleware turns it into the right HTTP status |
| `src/scorecard/template.json` | The default scorecard shipped with the project (§5) |
| `src/scorecard/scoring.js` | Pure scoring math — total points, weighted sections, bonus, auto-fail, and the AI-vs-human alignment formula. **Zero AI calls, zero I/O** — this is why it's unit-testable and 100% predictable |
| `src/scorecard/scoring.test.js` | 10 tests, including MaestroQA's own documented worked examples (60%, 70% with N/A, 80% alignment) |
| `src/services/freshdeskClient.js` | All Freshdesk REST calls: fetch a ticket's transcript, list resolved tickets (for backfill), write the private note + custom field, resolve an agent's display name |
| `src/services/claudeClient.js` | All Claude calls: `gradeTicket` (real-time, Sonnet, cached scorecard), `submitGradingBatch` / `collectGradingBatch` (Batch API), `draftCoaching` (turns an agent's weak criteria into a coaching note) |
| `src/services/costs.js` | Turns a Claude API `usage` object into a dollar figure, using the real per-model list prices and the batch discount |
| `src/services/mockGrader.js` | A regex-based stand-in grader (`GRADER=mock`) for testing the UI/API with zero cost and no API key — **not used for real grading** |
| `src/services/scorecards.js` | Scorecard CRUD: every save creates a new version; old evaluations stay pinned to the version they were actually graded with |
| `src/services/evaluations.js` | The orchestrator described in §2: `evaluateFreshdeskTicket`, the review queue, the backfill/batch lifecycle |
| `src/services/reviews.js` | A human coach overriding AI answers; recomputes the score and the alignment-vs-AI number in the same call |
| `src/services/appeals.js` | An agent's appeal on one criterion; accepting one is just a `reviews.submitReview()` call under the hood, so it's the same audit trail |
| `src/services/coaching.js` | Finds an agent's worst-scoring criteria across their tickets, asks Claude to draft a coaching note grounded in the actual evidence quotes |
| `src/services/reports.js` | Every number the dashboard shows — coverage, per-agent/criterion breakdowns, trends, alignment, cost — computed from the SQLite tables, no caching layer needed at this scale |
| `src/routes/api.js` | The whole REST surface (table in §4), plus the `X-QA-Secret` auth check |
| `src/server.js` | Express bootstrap; also serves `/preview/*` — a browser-only copy of the FDK screens for testing without the FDK CLI (§8) |

## 4. Full API reference

| Method & path | Called by | What it does |
|---|---|---|
| `POST /api/events/ticket-resolved` | FDK `onTicketUpdate` | Grades one ticket (async, 202 response) |
| `POST /api/events/backfill` | FDK scheduled event (nightly) | Finds recently-resolved-but-ungraded tickets, submits them as one Claude Batch |
| `POST /api/events/backfill/collect` | Same schedule, next run | Collects a finished batch's results into `evaluations` |
| `GET /api/scorecards/active` / `GET /api/scorecards` | Scorecard tab | Current scorecard / version history |
| `PUT /api/scorecards/active` | Scorecard tab | Validates and saves a new version |
| `GET /api/evaluations` | Dashboard/coaching | List, optionally filtered by agent |
| `GET /api/evaluations/ticket/:id` | Sidebar, grade view | Full detail: transcript, AI answers, final answers, reviews, appeals |
| `GET /api/queue` | Review queue tab | Tickets needing a human (§5, review queue) |
| `POST /api/reviews` | Grade view "Confirm review" | Coach's corrected answers → recomputed score + alignment |
| `GET/POST /api/appeals`, `PATCH /api/appeals/:id` | Sidebar "Appeal", grade view | Open / list / accept-or-reject an appeal |
| `GET /api/coaching`, `POST /api/coaching/draft`, `POST /api/coaching` | Coaching tab | History / AI-drafted note / save a session |
| `GET /api/reports/{overview,agents,breakdown,trends,alignment,cost}` | Dashboard | Every number and chart on it |

All of these (except the two `/events/*` ones, which the FDK app calls) require the `X-QA-Secret` header to match `QA_API_SECRET` in `.env`.

## 5. The scorecard and scoring math (identical to MaestroQA's)

Structure — sections → criteria → options, exactly like MaestroQA's rubric model:

```json
{
  "name": "Support QA Scorecard",
  "scoringMethod": "total_points",
  "sections": [
    { "id": "empathy", "name": "Greeting & Empathy", "type": "standard", "criteria": [ ... ] },
    { "id": "compliance", "name": "Process & Compliance", "type": "auto_fail", "criteria": [
      { "id": "identity_verification", "question": "...", "aiInstruction": "...",
        "allowNA": true, "options": [
          { "id": "pass", "label": "Pass", "points": 0 },
          { "id": "fail", "label": "Fail", "points": 0, "autoFail": true }
        ]
      }
    ]}
  ]
}
```

The one field MaestroQA's human-only rubric doesn't need, and ours does: **`aiInstruction`** — plain-English grading guidance per criterion, inserted into Claude's system prompt so the model judges each question the way *your* team would, not a generic reading of the question text.

**Scoring formulas**, implemented in `scoring.js` and covered by unit tests:

| Rule | Formula |
|---|---|
| Total points | Σ earned ÷ Σ max × 100 |
| N/A | Removes that criterion from both earned and max |
| Weighted sections | Σ (section earned ÷ section max × weight), renormalized over sections that have scored criteria |
| Bonus section | Adds earned points without raising the max (score can exceed 100%) |
| Auto-fail | Any auto-fail answer ⇒ score = 0 |
| Alignment (AI vs. human) | 1 − \|AI points − human points\| ÷ criterion max, weighted by the criterion's share of total points |

These match MaestroQA's own published examples exactly (21/35 = 60%; 21/30 = 70% with one N/A; 10/15 vs. 7/15 = 80% alignment) — see [docs/01](01-how-maestroqa-works.md) for the source links.

**The human review queue** (replacing MaestroQA's *random* sample) — a ticket needs a human if **any** of:
- an auto-fail was triggered
- the score is below `QUEUE_SCORE_THRESHOLD` (default 70)
- any AI answer came back `confidence: "low"`
- it has an open appeal
- it falls in a `QUEUE_RANDOM_SAMPLE_PCT` (default 5%) random slice, kept purely so the alignment metric has an ongoing calibration signal even when nothing else is flagged

## 6. The dashboard, screen by screen

Both screens are one FDK app (`fdk-app/`): a `full_page_app` (left-nav icon → the coach workspace) and a `ticket_sidebar` (the agent's view). Same front-end code (`fdk-app/app/scripts/*.js`) renders both.

| Tab | What it shows | Backed by |
|---|---|---|
| **Dashboard** | Stat tiles (tickets graded, coverage vs. the 5% manual baseline, average score, auto-fails, review-queue size, AI-vs-human alignment, cost per ticket), an agent leaderboard with score bars, an agent × criterion heatmap, and alignment-by-criterion bars | `GET /api/reports/{overview,agents,breakdown,alignment,cost}` |
| **Review queue** | Every ticket needing a human, with why it's there (auto-fail / low score / low confidence / appeal / calibration sample). Click one → | `GET /api/queue` → grade view |
| **Grade view** | The transcript next to the scorecard, **pre-filled by AI** with an evidence quote and a confidence level per criterion, and the AI's own answer shown alongside for comparison. The coach confirms or overrides, then "Confirm review" | `GET /api/evaluations/ticket/:id`, `POST /api/reviews` |
| **Appeals** | Every appeal an agent has raised from their sidebar, resolvable inline (which reuses the grade view's accept/reject flow) | `GET /api/appeals` |
| **Coaching** | Pick an agent → "Draft with AI" → a coaching note grounded in their actual weakest criteria and real evidence quotes, editable, then saved to history | `POST /api/coaching/draft`, `POST /api/coaching` |
| **Scorecard** | Read-only view of the current rubric plus a raw-JSON editor; saving creates a new version | `GET/PUT /api/scorecards/active` |
| **Agent sidebar** (on every ticket) | This ticket's score, per-criterion evidence, and an **Appeal** button | `GET /api/evaluations/ticket/:id`, `POST /api/appeals` |

Colors follow a validated sequential-blue ramp for magnitude (score %, heatmap cells) and a fixed status palette for critical/warning states — never color alone, always paired with a label (`⛔ Auto-fail`, not just red).

## 7. Cost mechanics (measured, not just estimated)

Every graded ticket logs its **real** `usage` object from the Claude API response into a `usage` table — input tokens, cache-read tokens, cache-write tokens, output tokens — and `costs.js` turns that into dollars using Sonnet 5's real list price ($2/$10 per million input/output tokens), a 0.1× multiplier for cache reads, and a 0.5× multiplier for anything graded through the Batch API.

Measured in this project's own testing: **≈$0.007–0.008 per ticket**, i.e. roughly **$7–9 per agent per month** at ~1,100 tickets/agent/month — against MaestroQA's median contract of $23,520/year ([source](https://www.vendr.com/marketplace/maestroqa)). The dashboard's cost tile shows this as a live number, not a slide estimate.

## 8. Known limitations (found by actually running this)

- **Freshdesk won't let the API rename an agent's profile** ("Not allowed to edit Agent's profile information") — discovered while seeding demo agents. Worked around with a local `backend/data/agent-directory.json` override that `freshdeskClient.getAgentName()` checks before falling back to Freshdesk's own contact name (see `scripts/seed/push-to-freshdesk.js`).
- **The FDK CLI requires an exact Node major version** (9.x wants Node 18.x; the newer `-v24` build wants Node 24.x) — neither matched this machine's Node 22. Worked around with a portable Node 18 binary invoking the CLI's `index.js` directly.
- **`fdk run`'s local test harness doesn't register a real Freshdesk webhook.** Tickets updated via the API in the background (like bulk seeding) won't trigger `onTicketUpdate` the way a real installed app would — only a ticket you actively open with `?dev=true` fires it live. The **nightly backfill / Batch API path exists for exactly this case**, and was used to grade the seeded demo tickets.
- **ngrok's free tier issues a new URL on every restart**, so the FDK app's `backend_host` install value needs re-entering after any tunnel restart — a real constraint for the local/dev setup, not for a properly hosted deployment.

Next: for the actual demo flow, see the walkthrough in chat, or ask for it to be written up as `docs/05-demo-script.md`.
