# FreshQA

MaestroQA-style quality assurance, running natively inside Freshdesk. AI grades **100% of resolved tickets** against your scorecard, and coaches review only what needs a human. Built for The Great Agent Hackathon 2026 (Freshworks track).

→ **Start with [docs/README.md](docs/README.md)** for the why, and for how it compares with MaestroQA.
→ **Setting up real Freshdesk/Anthropic access?** Go straight to [docs/03-setup-guide.md](docs/03-setup-guide.md).

## Repo layout

```
backend/        Node 22 + Express + built-in SQLite: grading, scoring, queue, appeals, coaching, reports
  src/scorecard/  scorecard template + MaestroQA-compatible scoring math (unit-tested)
fdk-app/        Freshdesk app: full-page coach workspace, ticket sidebar, serverless events
scripts/seed/   18 demo tickets, local grading script, Freshdesk seeding script
docs/           research and design docs (docs/archive = earlier ideas)
reference/      hackathon handbook, cookbook, presentation template
```

## Run it locally (no Freshdesk account needed)

```bash
cd backend
cp .env.example .env          # set GRADER=mock to try it offline, or add ANTHROPIC_API_KEY for real AI grading
npm install
npm test                      # scoring math tests
npm run seed:local            # grade the 18 demo tickets
npm start                     # http://localhost:4000
```

Then open:
- Coach workspace: http://localhost:4000/preview/workspace.html
- Agent sidebar: http://localhost:4000/preview/sidebar.html?ticket=seed-r2-password-reset-no-verification

Needs Node 22.5 or later (it uses the built-in `node:sqlite`).

## Run it in Freshdesk

1. Create a Freshdesk trial. Add a **Number** ticket field named `quality_score` (API name `cf_quality_score`).
2. In `backend/.env`, set `FRESHDESK_DOMAIN`, `FRESHDESK_API_KEY`, `ANTHROPIC_API_KEY` and `QA_API_SECRET`. Run `npm start` and expose it over HTTPS (for example `ngrok http 4000`).
3. Install the FDK CLI (`npm install https://cdn.freshdev.io/fdk/latest.tgz -g`), then run `cd fdk-app && fdk validate && fdk run`. Enter the backend domain and secret on the install page. See [fdk-app/README.md](fdk-app/README.md).
4. Run `cd backend && npm run seed:push` to create the demo agents and tickets and resolve them. Every ticket is graded automatically.
