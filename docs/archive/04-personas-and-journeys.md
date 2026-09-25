# 04 · Personas and journeys

[← Back to overview](README.md)

## 1. Personas

### Rahul, a frontline support agent (primary user)

> "Nobody tells me how I'm doing until something's already gone wrong."

| | |
|---|---|
| **Context** | Handles 40–60 tickets a day in Freshdesk. Eight months in the job. |
| **Goals** | Resolve tickets fast, get good CSAT, avoid mistakes that get escalated |
| **Pain today** | Feedback is rare and late. Doesn't know exactly what the team's best agent does differently. Copilot helps him write faster but never tells him whether his reply is *right*. |
| **What Reply Guard gives him** | A check at the moment he clicks Send. Silent when the reply is fine, a one-click better version when it could be better, and a clear stop only when something critical is missing |

### Ananya, a Quality Coach / QA analyst

> "I know exactly what good looks like. I just can't be everywhere."

| | |
|---|---|
| **Context** | One coach covering about 25 agents. Manually reviews a small sample each week. |
| **Goals** | Catch serious issues early, and spend her time where a human judgment call is needed |
| **Pain today** | Reviews a random 2–5% of replies, finds compliance misses weeks after they happen, and repeats the same basic feedback to many agents |
| **What Reply Guard gives her** | An escalation queue with only persistent or critical cases, each with evidence (the draft, what was flagged, whether the agent overrode it and why). Routine coaching happens automatically at the moment of sending. |

### Divya, Head of Customer Support / CX

> "I can tell you our average CSAT. I can't tell you why it's stuck."

| | |
|---|---|
| **Goals** | Consistent quality across teams, lower compliance risk, proof that coaching works |
| **Pain today** | Quality reporting rests on a small sample. Systemic issues surface only after an audit or a complaint. |
| **What Reply Guard gives her** | A dashboard: share of replies checked (100%), pass/suggest/stop mix by team, compliance catches **prevented**, advice adoption rate, and override rate |

### Priya, the top-performing agent (source of the playbook)

> "I don't even think about it anymore. I just know how to calm someone down."

| | |
|---|---|
| **Role in the product** | Not a daily user. Her resolved, highly rated tickets are what the playbook is learned from. |
| **How she's chosen** | Automatically, from CSAT data (`satisfaction_ratings` by `agent_id`) plus resolution volume. Nobody hand-picks her, and the choice updates as the data changes. |
| **What she gets** | Her real phrasing becomes the "here's how a top performer would say it" suggestion for the team, which recognizes her expertise without taking her time |

## 2. Journey: one risky refund ticket, before and after

**The ticket:** a customer writes: *"I was charged for the annual plan by mistake, please refund it to my card."* The request looks routine. Policy requires identity verification before any refund.

### Before Reply Guard (today)

| Step | What happens |
|---|---|
| 1 | Rahul is busy. He replies: "Sure, refunded $228 to your card." He never verifies the requester. |
| 2 | The reply goes out and the refund is processed. |
| 3 | Nobody reviews this ticket. It isn't in the QA sample. |
| 4 | Weeks later, a chargeback or fraud report shows the requester wasn't the account owner. The money is gone. |
| 5 | If the mistake is found at all, Rahul gets generic feedback long after the fact. |

### After Reply Guard

| Step | Who | What happens |
|---|---|---|
| 1 | Rahul | Writes the same reply and clicks **Send** |
| 2 | Reply Guard | Intercepts the send (`ticket.sendReply`) and checks the draft against the team playbook |
| 3 | Reply Guard | Returns **⛔ Stop**: "Refund processed without identity verification." It shows Priya's verification wording, e.g. *"Before I touch anything on the account, can you confirm the email on file and the last four digits of the card?"* |
| 4 | Rahul | Clicks **Apply suggestion**. The reply editor fills with the corrected draft, and he sends it. (Or he overrides with a reason, e.g. "already verified by phone", which is logged.) |
| 5 | Reply Guard | After sending (`onConversationCreate`), confirms the sent reply now includes verification and records the advice as **adopted** |
| 6 | Ananya | Sees nothing, because nothing needs a human. If Rahul had overridden critical stops repeatedly, the case would be in her escalation queue with the evidence. |
| 7 | Divya | Sees "1 compliance miss prevented" and the adoption rate on the dashboard |

### A normal ticket (most replies)

| Step | What happens |
|---|---|
| 1 | Rahul replies to a simple how-to question and clicks Send. |
| 2 | Reply Guard returns **✅ Pass** within a couple of seconds. Nothing is shown, and the reply sends. |
| 3 | The reply is counted in coverage, with no interruption for Rahul. |

## 3. Design principles that come from the personas

1. **Silent by default.** Most replies pass without showing anything (Rahul).
2. **Stop only when it matters.** A hard stop only for high-confidence, critical compliance misses (Rahul, Divya).
3. **Show, don't lecture.** Suggestions use the team's real top-performer phrasing (Rahul, Priya).
4. **Humans handle the exceptions.** The coach sees only escalations, with evidence (Ananya).
5. **Always overridable, always logged.** The agent stays in control, and every override is visible (Rahul, Ananya).

Next: [05 · Solution →](05-solution.md)
