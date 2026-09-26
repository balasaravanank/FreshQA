# FreshQA

AI that grades 100% of resolved Freshdesk tickets against a MaestroQA-style scorecard, natively inside Freshdesk.

## What it is

A native Freshdesk app, built on the Freshworks Developer Kit (App SDK v3.0), that acts as an AI Quality Assurance coach. Support teams already pay MaestroQA to sample and score tickets against a rubric; FreshQA rebuilds that exact workflow — sections, criteria, auto-fail rules, bonus points, the same scoring math — but runs it natively inside Freshdesk and grades every ticket instead of a small sample.

## What it does (business objective)

- Grades 100% of resolved tickets automatically, the moment they're resolved — no sync window, no sampling.
- Uses MaestroQA-identical scoring math: total-points or weighted sections, auto-fail sections (any auto-fail answer forces the score to 0%), N/A handling, bonus sections.
- Writes the score straight back onto the real Freshdesk ticket (a private note + a custom `cf_quality_score` field), so it's visible and filterable in Freshdesk's own views.
- Routes only the tickets that actually need a human — auto-fails, low scores, low AI confidence, agent appeals, plus a small random calibration slice — into a coach's review queue, instead of a random sample of everything.
- Lets an agent appeal a specific scorecard answer from their own ticket sidebar; a coach accepts or rejects it in one click.
- Drafts AI-generated coaching notes grounded in an agent's own weakest-scoring criteria and real evidence quotes.
- Tracks real, measured per-ticket AI cost and compares it live against MaestroQA's published pricing.
- Business goal: take a team's QA coverage from the industry-typical ~2-5% to 100%, at roughly $9/agent/month in AI cost versus MaestroQA's $23,520/year median contract — with no second tool for anyone to log into.

## What it doesn't do (out of scope)

- Doesn't grade tickets outside Freshdesk in this build (no Freshservice, no other helpdesk) — the architecture is portable to Freshservice's `service_ticket` module, but that port isn't built.
- Doesn't grade live phone calls in real time — only transcripts already attached to a ticket.
- Never sends anything to a customer — all AI output stays internal (a private note, a custom field, in-app screens only).
- Doesn't replace a human coach — every AI answer can be overridden by a coach, and every override feeds an AI-vs-human alignment score.
- Not yet on a permanent public host — the hackathon demo runs a local backend behind an ngrok tunnel.

## Product Integrations

| Product | Used for |
|---|---|
| **Freshworks Developer Kit (App SDK v3.0)** | `full_page_app` placement (coach dashboard, review queue, appeals, coaching, scorecard editor); `ticket_sidebar` placement (agent's own score + evidence + appeal button); serverless `onTicketUpdate` event (fires grading the moment a ticket resolves); one recurring scheduled event (nightly Message-Batches backfill); secure request templates so the backend URL/secret never reach the browser |
| **Freshdesk REST API v2** | Reading ticket + full conversation data; writing back a private note and the `cf_quality_score` custom field |
| **Anthropic Claude (Sonnet 5)** | Grading every ticket against the scorecard with structured, evidence-backed per-criterion output; drafting agent coaching notes; nightly backfill grading via the Message Batches API (50% cheaper) |
| Sarvam, Vobiz, Databricks | Not used in this build |

## System Interaction Diagram

```
Freshdesk (handoffiq.freshdesk.com)
 │
 │ 1. Agent resolves a ticket
 ▼
FDK serverless onTicketUpdate  ──────────────►  FreshQA backend (Node/Express)
 (App SDK v3.0 event)                             │
                                                   │ 2. fetch ticket + conversation (Freshdesk REST API v2)
                                                   │ 3. load active scorecard
                                                   ▼
                                          Anthropic Claude Sonnet 5
                                          (per-criterion answer + evidence + confidence,
                                           structured output, prompt-cached scorecard)
                                                   │
                                                   │ 4. MaestroQA-style scoring math
                                                   ▼
                                          SQLite (evaluations, reviews, appeals, coaching, usage)
                                                   │
                              ┌────────────────────┴────────────────────┐
                              ▼                                         ▼
                  write-back to Freshdesk                    serve the two FDK placements
                  (private note + cf_quality_score,                     │
                   Freshdesk REST API v2)              ┌────────────────┴────────────────┐
                                                        ▼                                 ▼
                                          ticket_sidebar (agent)             full_page_app (coach)
                                          score ring, evidence,              dashboard, review queue,
                                          Appeal button                     appeals, coaching, scorecard
```

---

## Run it

### Locally, no Freshdesk account needed

```bash
cd backend
cp .env.example .env          # set GRADER=mock to try it offline, or add ANTHROPIC_API_KEY for real AI grading
npm install
npm test                      # scoring math unit tests
npm run seed:local            # grade the 18 demo tickets
npm start                     # http://localhost:4000
```

Then open:
- Coach dashboard: http://localhost:4000/preview/workspace.html
- Agent sidebar: http://localhost:4000/preview/sidebar.html?ticket=seed-r2-password-reset-no-verification

Needs Node 22.5+ (uses the built-in `node:sqlite`).

### Inside a real Freshdesk tenant

1. Create a Freshdesk trial. Add a **Number** ticket field named `quality_score` (API name becomes `cf_quality_score`).
2. In `backend/.env`, set `FRESHDESK_DOMAIN`, `FRESHDESK_API_KEY`, `ANTHROPIC_API_KEY` and `QA_API_SECRET`. Run `npm start` and expose it over HTTPS (e.g. `ngrok http 4000`).
3. Install the FDK CLI (`npm install https://cdn.freshdev.io/fdk/latest.tgz -g`), then `cd fdk-app && fdk validate && fdk run`. Enter the backend domain and secret on the install page — see [fdk-app/README.md](fdk-app/README.md). **FDK 9.x requires Node 18.x exactly** — see [docs/03-setup-guide.md](docs/03-setup-guide.md) if your system Node is newer.
4. Run `cd backend && npm run seed:push` to create demo agents/tickets and resolve them — every ticket grades automatically.

### More reading

- [docs/README.md](docs/README.md) — why this exists, and how it compares to MaestroQA step by step
- [docs/03-setup-guide.md](docs/03-setup-guide.md) — every credential/setting needed, in order
- [docs/04-technical-deep-dive.md](docs/04-technical-deep-dive.md) — full data flow, every module, every API route
- [docs/05-demo-script.md](docs/05-demo-script.md) — the rehearsed demo walkthrough
- [docs/FreshQA_Flow_And_Dashboard_Guide.docx](docs/FreshQA_Flow_And_Dashboard_Guide.docx) — one real ticket traced start to finish, plus the dashboard explained screen by screen

## Repo layout

```
backend/        Node 22 + Express + built-in SQLite: grading, scoring, queue, appeals, coaching, reports
  src/scorecard/  scorecard template + MaestroQA-compatible scoring math (unit-tested)
fdk-app/        Freshdesk app: full-page coach workspace, ticket sidebar, serverless events
scripts/seed/   18 demo tickets, local grading script, Freshdesk seeding script
docs/           research and design docs (docs/archive = earlier ideas)
reference/      hackathon handbook, cookbook, presentation template
```
