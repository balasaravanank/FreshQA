# 03 · Setup guide: every API, key and setting FreshQA needs

[← Back to overview](README.md)

This is the complete, in-order checklist to run FreshQA against a real Freshdesk tenant and real Claude grading. Follow it top to bottom — each section says exactly where to find or create the value, and which file it goes into.

## What you need, at a glance

| # | What | Where it comes from | Goes into |
|---|---|---|---|
| 1 | Freshdesk domain + API key | Your Freshdesk account | `backend/.env` → `FRESHDESK_DOMAIN`, `FRESHDESK_API_KEY` |
| 2 | A custom ticket field `cf_quality_score` | Created once, by hand, in Freshdesk Admin | Freshdesk itself (no `.env` entry) |
| 3 | Anthropic (Claude) API key | console.anthropic.com | `backend/.env` → `ANTHROPIC_API_KEY` |
| 4 | A shared secret you invent | Any random string | `backend/.env` → `QA_API_SECRET`, and the FDK app's install screen → **API secret** |
| 5 | A public HTTPS URL for the backend | ngrok (or any tunnel/host) | The FDK app's install screen → **Native QA backend host** |
| 6 | Freshworks Developer Kit (FDK) CLI | npm | Your machine, to run/publish `fdk-app/` |

Nothing else is required — no Freshservice, no OAuth app, no Freshworks Marketplace account, for local/demo use.

---

## 1. Freshdesk domain and API key

1. Log in to your Freshdesk account (or start a trial at [freshdesk.com](https://freshdesk.com) if you don't have one — the free trial is enough for this project).
2. Your **domain** is the subdomain in your Freshdesk URL: if you access Freshdesk at `https://acme.freshdesk.com`, your domain is `acme`.
3. Get your **API key**: click your profile picture (top right) → **Profile settings** → the API key is shown on the right-hand side of that page. ([Official: how to find your API key](https://support.freshdesk.com/support/solutions/articles/215517-how-to-find-your-api-key))
4. Put both into `backend/.env`:
   ```
   FRESHDESK_DOMAIN=acme
   FRESHDESK_API_KEY=xxxxxxxxxxxxxxxxxxxx
   ```

**Quick check** — this should return your ticket list as JSON:
```bash
curl -u YOUR_API_KEY:X https://YOUR_DOMAIN.freshdesk.com/api/v2/tickets
```

## 2. Create the `cf_quality_score` ticket field (one-time, by hand)

FreshQA writes each ticket's score into a custom Number field. Freshdesk's API can't create ticket fields, so this one step is manual:

1. In Freshdesk, go to **Admin** (gear icon) → **Workflows** → **Ticket Fields**.
2. Click **New field** → choose type **Number**.
3. Set the field **label** to `Quality score` (the internal name becomes `cf_quality_score` automatically — that's what `backend/src/services/freshdeskClient.js` writes to).
4. Save. You don't need to add it to the ticket form for it to be written via the API, but adding it lets you see the score in Freshdesk's own ticket list views.

## 3. Anthropic (Claude) API key

1. Go to [console.anthropic.com](https://console.anthropic.com), sign in, and open **API Keys**.
2. Create a key and copy it (it's only shown once).
3. Put it in `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
   ```
4. Set the grader to use it for real (not the offline stand-in):
   ```
   GRADER=claude
   GRADER_EFFORT=low
   ```
   `GRADER_EFFORT` can be `low`, `medium` or `high` — `low` is cheapest and is what the cost figures in [docs/02-native-qa-design.md](02-native-qa-design.md) assume. This project uses `claude-sonnet-5` for grading and coaching drafts (see `backend/src/services/claudeClient.js`).

**Quick check** — with the key exported, this should return a short reply, not an auth error:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}'
```

## 4. Invent a shared secret

The FDK app authenticates to your backend with a header (`X-QA-Secret`) rather than exposing your Freshdesk/Anthropic keys to the browser. Pick any random string, for example:

```
QA_API_SECRET=a-long-random-string-you-make-up
```

Put the **same value** in `backend/.env` and, later, in the FDK app's install screen (step 7 below). If you leave `QA_API_SECRET` blank, auth is disabled — fine for local testing, not for anything public.

## 5. Fill in `backend/.env` completely

```bash
cd backend
cp .env.example .env
```

Then edit `backend/.env` so it looks like this:

```
FRESHDESK_DOMAIN=acme
FRESHDESK_API_KEY=xxxxxxxxxxxxxxxxxxxx

ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

GRADER=claude
GRADER_EFFORT=low

QA_API_SECRET=a-long-random-string-you-make-up

QUEUE_SCORE_THRESHOLD=70
QUEUE_RANDOM_SAMPLE_PCT=5

PORT=4000
DB_PATH=data/native-qa.db
```

`QUEUE_SCORE_THRESHOLD` and `QUEUE_RANDOM_SAMPLE_PCT` control the human review queue (see [docs/02-native-qa-design.md](02-native-qa-design.md) § Human review queue) — the defaults are fine to start.

Install and test:

```bash
npm install
npm test              # scoring-math unit tests — should all pass, no API keys needed
npm run seed:local    # grades the 18 demo tickets with REAL Claude grading (uses ANTHROPIC_API_KEY, costs a few cents)
npm start              # http://localhost:4000
```

Open `http://localhost:4000/preview/workspace.html` to see the coach dashboard with real AI-graded scores, and `http://localhost:4000/reports/cost` (via `curl` or the dashboard's cost tile) to see the real per-ticket cost.

## 6. Expose the backend over HTTPS (ngrok)

Freshdesk's FDK app runs inside Freshdesk's own domain and calls your backend over the internet, so `localhost` isn't reachable from it. Use a tunnel:

```bash
ngrok http 4000
```

Copy the `https://xxxx.ngrok-free.app` URL it prints (domain only, no `https://` prefix, when you enter it into the FDK install screen — see next step).

If you don't have ngrok, sign up free at [ngrok.com](https://ngrok.com) and follow their `ngrok config add-authtoken` step first.

## 7. Install the Freshworks Developer Kit (FDK) and run the app

```bash
npm install -g https://cdn.freshdev.io/fdk/latest.tgz
fdk version           # confirm it installed
```

Then, from the `fdk-app/` folder:

```bash
cd fdk-app
fdk validate          # checks manifest.json — fix anything it flags (see fdk-app/README.md)
fdk run
```

`fdk run` starts a local Freshdesk test harness and prints a URL (usually `https://localhost:10001`). Open it, and on the app's install/configuration screen enter:

- **Native QA backend host**: your ngrok domain from step 6, e.g. `xxxx.ngrok-free.app` (no `https://`)
- **API secret**: the exact same value as `QA_API_SECRET` in `backend/.env`

Once installed, the coach workspace appears as a left-nav icon in Freshdesk, and the agent sidebar appears on every ticket.

## 8. Seed demo data into your real Freshdesk tenant (optional but recommended for a demo)

With `backend/.env` filled in and the backend running:

```bash
cd backend
npm run seed:push
```

This creates 3 demo agents (Priya, Rahul, Meera) and 18 tickets with realistic replies, then marks each Resolved — which fires `onTicketUpdate` and grades every one automatically if the FDK app is installed and running. If the FDK app isn't installed yet, run `npm run seed:local` instead (grades from local JSON, doesn't touch Freshdesk).

## 9. End-to-end check

1. In Freshdesk, open a ticket that was just seeded (or reply to any ticket and mark it Resolved).
2. Within a few seconds, the ticket should get a private note with the QA score, and the `Quality score` field should be filled in.
3. Open the ticket — the sidebar should show the score and evidence per criterion, with an **Appeal** button.
4. Open the coach workspace (left-nav icon) → **Dashboard** — coverage should read 100%, and the agent leaderboard and heatmap should be populated.
5. Go to **Review queue** → open a low-scoring or auto-failed ticket → confirm or change an answer → **Confirm review**. The alignment percentage on the dashboard should update.

If a step doesn't work, check the backend's terminal output first — grading and write-back errors are logged there (e.g. `[write-back] note failed for ticket …`).

## Reference: every setting in one place

| Setting | File | Required for |
|---|---|---|
| `FRESHDESK_DOMAIN`, `FRESHDESK_API_KEY` | `backend/.env` | Fetching tickets, writing notes/scores back |
| `ANTHROPIC_API_KEY` | `backend/.env` | Real AI grading (`GRADER=claude`) |
| `GRADER`, `GRADER_EFFORT` | `backend/.env` | `claude` = real grading, `mock` = offline stand-in with no API calls |
| `QA_API_SECRET` | `backend/.env` **and** FDK install screen | Backend ↔ FDK app authentication |
| `QUEUE_SCORE_THRESHOLD`, `QUEUE_RANDOM_SAMPLE_PCT` | `backend/.env` | What lands in the human review queue |
| `PORT`, `DB_PATH` | `backend/.env` | Local server port and SQLite file location |
| `backend_host` | FDK install screen | Where the FDK app sends its API calls |
| `api_secret` | FDK install screen | Must match `QA_API_SECRET` |
| `cf_quality_score` custom field | Freshdesk Admin → Ticket Fields | Only manual step inside Freshdesk itself |

Everything else (the scorecard, the review queue rules, agent/team data) is created automatically by the app — nothing else needs to be configured by hand in Freshdesk.
