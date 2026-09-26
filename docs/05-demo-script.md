# 05 · Demo script

[← Back to overview](README.md)

This uses the **real, currently-graded data** in the demo tenant (`handoffiq.freshdesk.com`) — no slides needed for the numbers, they're live. It's built entirely around the `/preview/` pages (the exact same UI as the in-Freshdesk app, opened directly in a browser) so recording doesn't depend on the FDK local-testing session staying connected.

## Current live state (for reference while rehearsing)

| | |
|---|---|
| Tickets graded | 19 (100% coverage) |
| Agents | Priya S. (~106% avg, 0 auto-fails), Rahul (RP) (real pre-existing account), Meera P., Rahul K. (~26% avg, 1 auto-fail) |
| Cost per ticket | $0.0082 → ≈ $9/agent/month vs. MaestroQA's $23,520/year median |
| Hero ticket | **#19**, Rahul K., "Need my password reset now" — **0%, auto-failed**, caught two real violations |

## Before you hit record

Open three tabs and leave them ready:

1. `https://handoffiq.freshdesk.com/a/tickets/19` — the real ticket, to show the private note + Quality score field FreshQA actually wrote back (proves it's a real integration).
2. `http://localhost:4000/preview/sidebar.html?ticket=19` — the agent's sidebar view (score ring, evidence, appeal button).
3. `http://localhost:4000/preview/workspace.html` — the coach dashboard.

Confirm the backend is running first: `http://localhost:4000/preview/workspace.html` should just load (no need to touch `fdk run`, ngrok, or the Freshdesk local-testing session for this recording).

## 3-minute script

**0:00–0:20 — The hook**
> "A Quality Coach can manually review maybe 5% of support tickets. MaestroQA sells AI grading as a $23,500-a-year add-on that syncs into a separate tool. I built the same job — same scorecard, same scoring math — natively, and it grades 100% of tickets for about $9 a seat a month."

**0:20–1:00 — The catch**
1. Show ticket #19 in real Freshdesk (tab 1) — point at the private note and the Quality score field: "This got written automatically the second this ticket was resolved. No one sampled it."
2. Switch to tab 2 (sidebar view): point at the red **0% — Auto-fail** ring.
3. Read the evidence out loud: *"Only asked for the email on the account before resetting the password"* — and note it separately caught the new password exposed in plain text in the same reply.
4. > "This ticket was graded the moment it was resolved. No one had to notice it."

**1:00–1:30 — The contrast (proves it's reasoning, not keyword-matching)**
1. Switch to tab 3, scroll to the agent leaderboard: Priya S. ~106%, zero auto-fails, vs. Rahul K. ~26%, one auto-fail.
2. > "Same scorecard, same AI — it correctly did *not* flag a customer's subscription cancellation as identity-sensitive, because no money moved and no access escalated. That's a judgment call, not a regex."

**1:30–2:00 — The efficiency, one screen**
1. Point at the tiles: **100% coverage** vs. the 5% manual baseline, **$0.0082/ticket**.
2. Point at the agent × criterion heatmap: "A coach doesn't have to guess where to spend their time — it's already mapped out."

**2:00–2:30 — Human still in charge**
1. Open the Review queue tile, click into one queued ticket, show the scorecard pre-filled with AI evidence.
2. > "The AI does the first pass on every ticket. A coach only spends time where it actually matters, with the evidence already in front of them."

**2:30–3:00 — Close**
> "One scoring engine, MaestroQA-identical math, running natively instead of a $23.5k/year separate tool. Coverage: 5% to 100%. Cost: about $9 a seat."

## Optional add-ons if there's time

- **Appeal flow**: from the ticket-19 sidebar (tab 2), click **Appeal** on a criterion → switch to the dashboard's **Appeals** tab → accept it → show the score change.
- **Coaching**: **Coaching** tab → pick Rahul K. → **Draft with AI** → read the generated coaching note (it's grounded in his real graded tickets, not generic advice).
- **Scorecard tab**: shows the rubric isn't a black box — every category and its AI grading instruction is visible and editable.

## Rehearsal checklist

- [ ] `backend` running (`http://localhost:4000/preview/workspace.html` loads)
- [ ] `http://localhost:4000/preview/sidebar.html?ticket=19` loads and shows the 0% auto-fail
- [ ] Real ticket #19 on `handoffiq.freshdesk.com` shows the private note + Quality score field
- [ ] Have a **screen recording backup** of this exact flow in case anything (wifi, a live API call) fails during a live take
