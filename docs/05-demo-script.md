# 05 · Demo script

[← Back to overview](README.md)

This uses the **real, currently-graded data** in the demo tenant (`handoffiq.freshdesk.com`) — no slides needed for the numbers, they're live.

## Current live state (for reference while rehearsing)

| | |
|---|---|
| Tickets graded | 19 (100% coverage) |
| Agents | Priya S. (105.7% avg, 0 auto-fails), Rahul (RP) (68.6%, real pre-existing account), Meera P. (27.4%, 2 auto-fails), Rahul K. (25.7%, 1 auto-fail) |
| Cost per ticket | $0.0082 → ≈ $9/agent/month vs. MaestroQA's $23,520/year median |
| Hero ticket | **#19**, Rahul K., "Need my password reset now" — **0%, auto-failed**, caught two real violations |

## 3-minute script

**0:00–0:20 — The hook**
> "A Quality Coach can manually review maybe 5% of tickets. MaestroQA gets AI involved, but as a $23,500-a-year add-on that syncs hourly into a separate tool. We built the same job — same scorecard, same scoring math — natively inside Freshdesk, for about $9 per agent a month."

**0:20–1:10 — The catch, live**
1. Open `https://handoffiq.freshdesk.com/a/tickets/19?dev=true`
2. Point at the sidebar: **score 0%, ⛔ Auto-fail**
3. Read the evidence out loud: *"Only asked for the email on the account before resetting the password"* — and note the AI **also** caught a second issue in the same reply: the new password was exposed in plain text.
4. > "This ticket was graded automatically the moment it was resolved. No one sampled it, no one had to notice it — it's just there."

**1:10–1:40 — The contrast (this is the AI actually understanding the job, not keyword matching)**
1. Switch to the coach workspace (left-nav icon) → **Dashboard**
2. Point at the agent table: Priya S. 105.7%, zero auto-fails, vs. Rahul K. 25.7%, one auto-fail
3. > "Same scorecard, same AI, radically different scores — because it's reading what actually happened, not scanning for a magic phrase. It correctly did **not** flag Priya's subscription-cancellation reply, because cancelling a plan isn't the same risk as a refund or a password reset — that's a judgment call, not a keyword."

**1:40–2:10 — The efficiency, in one screen**
1. Point at the tiles: **100% coverage** vs. **5% manual baseline**, **$0.0082/ticket**
2. Point at the **criterion breakdown heatmap** — instantly shows *which* skill is weakest for *which* agent (e.g. Meera P. and Rahul K. both near 0% on `identity_verification`)
3. > "A coach doesn't have to guess where to spend their time — the heatmap already tells them."

**2:10–2:40 — The human is still in charge**
1. Open **Review queue** (13 tickets) → open one → show the scorecard **pre-filled by AI** with evidence
2. Change one answer → **Confirm review** → point out the **AI–human alignment** number appearing on the dashboard
3. > "The AI doesn't replace the coach — it does the first pass on 100% of tickets, and the coach spends their time only where it matters, with full evidence in front of them."

**2:40–3:00 — Close**
> "One scoring engine, MaestroQA-identical math so results are trustworthy and comparable, running natively inside Freshdesk instead of a $23.5k-a-year separate tool. Coverage: 5% to 100%. Cost: about $9 a seat."

## Optional add-ons if there's time

- **Appeal flow**: from the ticket-19 sidebar, click **Appeal** on a criterion → switch to the coach workspace **Appeals** tab → accept it → show the score change.
- **Coaching**: **Coaching** tab → pick Rahul K. → **Draft with AI** → read the generated coaching note (it's grounded in his real graded tickets, not generic advice).
- **Scorecard tab**: shows the rubric isn't a black box — every category and its AI grading instruction is visible and editable.

## Rehearsal checklist

- [ ] `backend` running (`localhost:4000/health` → `{"ok":true}`)
- [ ] `fdk run` running (`localhost:10001` reachable)
- [ ] ngrok tunnel running and its URL matches what's saved in the Freshdesk app install screen
- [ ] Have a **screen recording backup** of this exact flow in case venue wifi or a live API call fails on stage
