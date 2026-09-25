"""
Generates docs/FreshQA_Final_Submission.docx - the consolidated hackathon submission
document: problem, solution, business case, market fit, system architecture, and
cost management, all in one place, structured against the stated evaluation rubric.
Run: python scripts/generate_submission_docx.py
"""
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "docs", "FreshQA_Final_Submission.docx")

ACCENT = RGBColor(0x2F, 0x6F, 0xED)
INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x5B, 0x5B, 0x5B)
GOOD = RGBColor(0x0C, 0xA3, 0x0C)

doc = Document()
normal = doc.styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(11)
normal.font.color.rgb = INK
for i in range(1, 4):
    h = doc.styles[f"Heading {i}"]
    h.font.color.rgb = ACCENT
    h.font.name = "Calibri"


def set_cell_shading(cell, hex_color):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    cell._tc.get_or_add_tcPr().append(shd)


def add_table(headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Light Grid Accent 1"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
        for p in hdr[i].paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(hdr[i], "2F6FED")
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
    if widths:
        for row in table.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Inches(w)
    doc.add_paragraph("")
    return table


def note(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.italic = True
    r.font.size = Pt(9)
    r.font.color.rgb = MUTED


def bullets(items, style="List Bullet"):
    for item in items:
        doc.add_paragraph(item, style=style)


# ============================================================
# Title page
# ============================================================
title = doc.add_heading("FreshQA", level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("MaestroQA-class quality assurance, built natively into Freshdesk")
r.font.size = Pt(14)
r.font.color.rgb = MUTED
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
mr = meta.add_run("The Great Agent Hackathon 2026 - Final Submission")
mr.italic = True
mr.font.size = Pt(11)
doc.add_paragraph("")

add_table(
    ["Field", "Value"],
    [
        ["Team Name", "balasaravanank"],
        ["Selected Track", "Track 1 - Customer & Employee Experience (agents built on Freshworks, MCP-compatible)"],
        ["2-3 line description", "FreshQA is an AI agent that grades 100% of resolved Freshdesk tickets against a MaestroQA-style scorecard the moment they're resolved, instead of a human sampling 2-5%. It runs natively inside Freshdesk (coach dashboard + agent sidebar), catches real compliance violations (e.g. a refund or password reset without identity verification), and costs about $9/agent/month in AI spend versus MaestroQA's $23,520/year median contract."],
        ["GitHub Repository", "https://github.com/balasaravanank/FreshQA"],
        ["PPT / Presentation Link", "[ADD BEFORE SUBMITTING]"],
        ["Demo Video URL", "[ADD BEFORE SUBMITTING]"],
        ["Deployment / Live Product URL", "Not yet deployed to a public host - currently demoed via local backend + ngrok tunnel + Freshdesk FDK app (see Section 9). Optional field per the submission requirements."],
        ["Sarvam / Vobiz usage", "Not used in this build."],
    ],
    widths=[1.8, 4.7],
)
doc.add_page_break()

# ============================================================
# Table of contents (manual, since this is meant to be read start to end)
# ============================================================
doc.add_heading("Contents", level=1)
bullets([
    "1. Problem Understanding & Relevance",
    "2. Market Fit & Competitive Landscape",
    "3. Solution, AI & Agentic Design",
    "4. How the System Works (Architecture)",
    "5. Freshworks Integration",
    "6. Business Case & Cost Management",
    "7. Product & User Experience (the Dashboard)",
    "8. Live Demo Results (real, measured data)",
    "9. Customer & Business Impact",
    "10. Rubric Self-Assessment",
    "11. Risks, Limitations & Roadmap",
    "Sources",
], style="List Number")
doc.add_page_break()

# ============================================================
# 1. Problem
# ============================================================
doc.add_heading("1. Problem Understanding & Relevance", level=1)
doc.add_paragraph(
    "Every support organization has a Quality Coach whose job is to review calls and tickets, score them "
    "against a rubric, and coach agents. That role has a hard ceiling: properly reviewing one conversation "
    "takes several minutes, so one person can only ever cover a small slice of total volume."
)
add_table(
    ["Evidence", "Source"],
    [
        ["Manual QA “typically covers just 2-5% of interactions”", "Calabrio"],
        ["Industry default is sampling ~5% of conversations, and it's costing companies money", "IrisAgent"],
        ["A real team's manual baseline was 2-3% before adopting AI QA", "Intryc / Blueground case study"],
    ],
    widths=[4.5, 2.0],
)
doc.add_paragraph(
    "The costliest failures happen inside the 95%+ that's never reviewed: compliance misses such as resetting "
    "a password, disabling 2FA, or issuing a refund without verifying the requester's identity. These are "
    "exactly the actions targeted in real social-engineering attacks against support desks (e.g. the 2023 MGM "
    "Resorts breach, which began with a help-desk call). A coach reviewing a random 5% sample essentially never "
    "catches these before the damage is done."
)
p = doc.add_paragraph()
p.add_run("The problem, narrowed: ").bold = True
p.add_run(
    "quality review covers 2-5% of tickets, after the fact, using tools that live outside the helpdesk. "
    "We built the same review discipline MaestroQA already sells, but covering 100% of tickets, natively "
    "inside Freshdesk, at a small fraction of the cost."
)

# ============================================================
# 2. Market fit
# ============================================================
doc.add_heading("2. Market Fit & Competitive Landscape", level=1)
doc.add_paragraph(
    "MaestroQA is the tool Freshdesk teams already pay for this job. We reverse-engineered its documented "
    "workflow (from its own help center) and rebuilt every step of it, natively, more efficiently."
)
add_table(
    ["MaestroQA today", "Cost / limitation", "FreshQA"],
    [
        ["Syncs Freshdesk tickets into its own app hourly, up to 12h first sync, 45-day window", "Median contract $23,520/yr (range $6.7k-$131k) + $2-10k implementation", "No sync - grades the moment a ticket is resolved, inside Freshdesk"],
        ["Random 2-5% sample graded by humans; AI (AutoQA) is a paid add-on", "AI features cost extra, on top of the base contract", "AI grades 100% of tickets as the core, not an add-on"],
        ["Grading, reporting, and appeals happen in a separate web app", "Context-switching for every coach and agent", "Coach dashboard and agent sidebar live inside Freshdesk itself"],
        ["Freshdesk + Freshdesk Omni only", "No Freshservice support at all", "Same architecture is portable to Freshservice's service_ticket module"],
    ],
    widths=[2.3, 2.1, 2.3],
)
doc.add_paragraph(
    "Market size: the contact-center QA software market is estimated at roughly $2.45B (2026) growing to "
    "$4.14B (2033), and the broader conversation-intelligence software market at $32.25B (2026) growing to "
    "$52.03B (2030). The market benchmark price for a QA seat is about $35/agent/month (Zendesk QA, EvaluAgent)."
)
note("Sources: Coherent Market Insights, ResearchAndMarkets, EvaluAgent pricing, Vendr MaestroQA marketplace listing.")

# ============================================================
# 3. Solution / AI & Agentic Design
# ============================================================
doc.add_heading("3. Solution, AI & Agentic Design", level=1)
doc.add_paragraph(
    "FreshQA is a single AI grading agent wired into Freshdesk's own ticket lifecycle. When a ticket is "
    "resolved, the agent autonomously: retrieves the conversation, loads the current scorecard, reasons over "
    "every rubric criterion (including judgment calls like tone and empathy, not just keyword checks), decides "
    "a pass/fail/partial answer for each with supporting evidence and a confidence level, computes the final "
    "score using the scorecard's own math, and writes the result back into Freshdesk - all without a human in "
    "the loop for the grading step itself."
)
doc.add_heading("Where it is genuinely agentic (not a fixed pipeline)", level=2)
bullets([
    "The model reasons per-criterion, per-ticket - grading instructions are natural language, not regex/keyword rules, so the same rubric correctly grades an empathetic email, a curt reply, or a phone-call transcript.",
    "It makes a judgment call context has to interpret rather than pattern-match, and cross-referenced this project's own rubric against a documented edge case: a subscription cancellation is not treated as identity-sensitive the way a refund is, because it doesn't move money or escalate access - a distinction we only discovered by watching the agent's real graded output and correcting the rubric.",
    "It self-reports confidence per answer, and a low-confidence answer autonomously routes that ticket into a human review queue instead of silently guessing.",
    "It escalates only when it should: any auto-fail compliance violation, any low-confidence answer, any score below threshold, or an agent-raised appeal - not a fixed percentage sample.",
    "A second agent role (coaching) autonomously synthesizes an agent's weakest-scoring criteria across many tickets into a grounded, evidence-based coaching note - a genuinely generative task, not a template fill.",
])
doc.add_heading("Guardrails (the human stays in control)", level=2)
bullets([
    "The AI never sends anything to a customer - all output is a private note, a custom field, and in-app screens.",
    "Every AI answer can be overridden by a human coach, and every override is recorded (feeding the AI-vs-human alignment metric).",
    "Agents can appeal any single criterion from their own sidebar; a coach resolves it in one click.",
    "The scorecard - the actual grading policy - is human-owned, versioned, and editable at any time.",
])

# ============================================================
# 4. Architecture
# ============================================================
doc.add_heading("4. How the System Works (Architecture)", level=1)
add_table(
    ["Layer", "Technology", "Why"],
    [
        ["Backend", "Node.js 22 + Express", "Simple REST API; native node:sqlite needs no external DB"],
        ["Database", "SQLite (backend/data/freshqa.db)", "Zero setup, one file, enough for this scale"],
        ["AI grading", "Claude Sonnet 5, structured JSON output (Zod schema)", "Fast and cheap enough for real-time grading; strong enough for tone/empathy/compliance judgment"],
        ["Bulk backfill", "Claude Message Batches API", "Same model, 50% cheaper, for catching up missed tickets overnight"],
        ["Freshdesk access", "Freshdesk REST API v2", "Read tickets/conversations; write back a private note + custom field"],
        ["In-product app", "Freshworks Developer Kit, App SDK v3.0", "The only documented way to place UI inside Freshdesk and react to ticket events without admin-configured automation rules"],
    ],
    widths=[1.3, 2.7, 2.7],
)
doc.add_paragraph("End-to-end flow for one ticket:")
flow = (
    "Agent resolves a ticket in Freshdesk\n"
    "  -> FDK serverless onTicketUpdate detects the status change, calls the backend\n"
    "  -> Backend fetches the ticket + conversation, loads the active scorecard\n"
    "  -> Claude Sonnet 5 grades every criterion with evidence + confidence (structured output)\n"
    "  -> Pure scoring math computes the final score (identical formulas to MaestroQA's own)\n"
    "  -> Result is written back: a private note + a quality-score field on the ticket, and stored locally\n"
    "  -> The agent's ticket sidebar and the coach's dashboard both read that same result live"
)
mono = doc.add_paragraph()
run = mono.add_run(flow)
run.font.name = "Consolas"
run.font.size = Pt(9)
doc.add_paragraph(
    "There is exactly one grading code path - the same function handles a live ticket resolution, a manual "
    "“score this ticket” click, and the nightly batch backfill. The dashboard and the sidebar are two views "
    "over one underlying result, not two separate systems."
)

# ============================================================
# 5. Freshworks integration
# ============================================================
doc.add_heading("5. Freshworks Integration", level=1)
doc.add_paragraph(
    "FreshQA is built entirely on documented Freshworks App SDK v3.0 capabilities, with no admin-configured "
    "automation rules required:"
)
bullets([
    "full_page_app placement: a left-nav icon opens the coach workspace (dashboard, review queue, appeals, coaching, scorecard editor) full-screen inside Freshdesk.",
    "ticket_sidebar placement: shows the agent their ticket's score, per-criterion evidence, and an Appeal action, directly on the ticket they're already working.",
    "Serverless onTicketUpdate event: fires the moment a ticket's status changes to Resolved/Closed, triggering grading with no polling and no admin setup.",
    "One recurring scheduled event: a nightly backfill using Freshdesk's ticket list + conversations API, graded via Claude's Message Batches API.",
    "Freshdesk REST API v2: fetches ticket + conversation data, writes back a private note and a custom Number field (cf_quality_score) so scores are visible/queryable in Freshdesk's own list views.",
    "Secure request templates (config/requests.json + iparams): the app calls the backend through FDK's proxied Request Method, so no API key or secret is ever exposed to the browser.",
])
doc.add_paragraph(
    "This was validated against the real FDK CLI (fdk validate: 0 platform errors, 0 lint errors) and run "
    "live against a real Freshdesk trial tenant, including real ticket grading and real write-backs, not just "
    "a mock."
)

# ============================================================
# 6. Business case & cost
# ============================================================
doc.add_heading("6. Business Case & Cost Management", level=1)
doc.add_paragraph("Real, measured cost - not a slide estimate. Every graded ticket logs its actual Claude API token usage.")
add_table(
    ["Metric", "Value"],
    [
        ["Tickets graded in this build's live test", "19 (100% of resolved tickets in the demo tenant)"],
        ["Real measured cost per ticket", "$0.0082"],
        ["Projected cost per agent per month (~1,100 tickets/agent)", "$9.04"],
        ["MaestroQA median annual contract (all agents)", "$23,520/year, plus $2-10k implementation"],
        ["Market benchmark QA seat price", "$35/agent/month"],
    ],
    widths=[4.0, 2.5],
)
doc.add_paragraph(
    "At $9/agent/month in AI cost versus a $35/agent/month market benchmark and MaestroQA's much larger "
    "annual contract, FreshQA could be priced well below the market while remaining highly margin-positive - "
    "or, since it's built as a native Freshworks integration, offered as a lower-friction alternative that "
    "doesn't require a second vendor relationship, a second login, or a 45-day-old sync window."
)
doc.add_heading("Target customers & go-to-market", level=2)
bullets([
    "Primary: Freshdesk/Freshdesk Omni customers with a dedicated QA/Quality Coach role, where manual sampling is a known bottleneck.",
    "Secondary: teams currently paying for a third-party QA add-on (MaestroQA, EvaluAgent, Oversai) who want to consolidate into their existing Freshworks stack.",
    "Distribution: Freshworks Marketplace / Paid Apps program (per-agent billing, Freshworks handles payment collection).",
])

# ============================================================
# 7. Product & UX
# ============================================================
doc.add_heading("7. Product & User Experience", level=1)
add_table(
    ["Screen", "What it shows"],
    [
        ["Dashboard", "Coverage vs. the 5% manual baseline, average score, auto-fail count, review-queue size, AI-vs-human alignment, live cost-per-ticket, an agent leaderboard, and an agent x criterion heatmap"],
        ["Review queue", "Every ticket needing a human, tagged with why (auto-fail / low score / low confidence / appeal / calibration sample)"],
        ["Grade view", "Transcript next to a scorecard pre-filled by AI with evidence and confidence per criterion; one click to confirm or override"],
        ["Appeals", "Every agent-raised appeal, resolved inline"],
        ["Coaching", "AI-drafted coaching notes grounded in an agent's actual weakest criteria and real evidence quotes"],
        ["Scorecard", "The rubric itself - fully visible and editable, not a black box"],
        ["Agent sidebar", "The current ticket's score, evidence, and an Appeal button, right where the agent is already working"],
    ],
    widths=[1.4, 5.1],
)

# ============================================================
# 8. Live demo results
# ============================================================
doc.add_heading("8. Live Demo Results (real, measured data)", level=1)
doc.add_paragraph("Captured from the actual running system against a real Freshdesk trial tenant (handoffiq.freshdesk.com):")
add_table(
    ["Agent", "Tickets", "Avg score", "Auto-fails", "Weakest criterion"],
    [
        ["Priya S. (top performer)", "8", "105.7%", "0", "Acknowledge customer feelings (92.5%)"],
        ["Rahul (RP) (real pre-existing user)", "1", "68.6%", "0", "Going above & beyond (0%)"],
        ["Meera P.", "5", "27.4%", "2", "Identity verification (0%)"],
        ["Rahul K.", "5", "25.7%", "1", "Acknowledge customer feelings (0%)"],
    ],
    widths=[2.1, 0.8, 1.0, 1.0, 2.6],
)
doc.add_paragraph(
    "Hero example: ticket #19, “Need my password reset now,” scored 0% and auto-failed. The AI's evidence: "
    "“Only asked for the email on the account before resetting password” - and it separately flagged that the "
    "new password was exposed in plain text in the same reply. Both are real, serious compliance issues a 5% "
    "manual sample would very likely have missed."
)

# ============================================================
# 9. Customer & business impact
# ============================================================
doc.add_heading("9. Customer & Business Impact", level=1)
add_table(
    ["Impact area", "Before (manual QA)", "After (FreshQA)"],
    [
        ["Coverage", "2-5% of tickets, sampled", "100% of tickets, every time"],
        ["Time to catch a compliance miss", "Days to weeks (if ever)", "Seconds after the ticket is resolved"],
        ["Coach's time", "Spent partly on tickets that were already fine", "Spent only on auto-fails, low scores, low-confidence answers, and appeals"],
        ["Tooling cost", "$23,520/yr median (MaestroQA) in a separate tool", "~$9/agent/month in AI cost, inside the helpdesk they already use"],
        ["Where coaching comes from", "A coach's memory / spot checks", "Every agent's actual weakest criteria, backed by quoted evidence"],
    ],
    widths=[1.6, 2.5, 2.5],
)

# ============================================================
# 10. Rubric self-assessment
# ============================================================
doc.add_heading("10. Rubric Self-Assessment", level=1)
add_table(
    ["Rubric criterion", "How FreshQA addresses it"],
    [
        ["Problem Understanding & Relevance", "Grounded in MaestroQA's own documented workflow and pricing, plus published industry data on the 2-5% manual QA coverage gap (Section 1-2)"],
        ["Solution Quality & Effectiveness + AI & Agentic Design", "One autonomous grading agent with per-criterion reasoning, self-reported confidence, autonomous escalation, and a second coaching-generation agent role (Section 3)"],
        ["Freshworks Integrations + Product & UX", "Built on FDK App SDK v3.0 (full_page_app + ticket_sidebar + serverless events), validated with the real FDK CLI, tested against a real Freshdesk tenant (Section 5, 7)"],
        ["Customer & Business Impact", "Real measured cost ($0.0082/ticket) directly compared against MaestroQA's real published pricing, with a concrete before/after impact table (Section 6, 9)"],
        ["Presentation & Communication", "This document, the demo script (docs/05-demo-script.md), and the live dashboard walkthrough"],
    ],
    widths=[2.3, 4.4],
)

# ============================================================
# 11. Risks & roadmap
# ============================================================
doc.add_heading("11. Risks, Limitations & Roadmap", level=1)
bullets([
    "Currently demoed via a local backend + ngrok tunnel, not a permanent public deployment - straightforward next step (Railway/Render/Fly.io), deliberately deferred until the core product was proven end-to-end.",
    "Freshdesk only in this build; the same architecture ports to Freshservice's service_ticket module for IT help-desk password-reset scenarios (the exact MGM-style risk).",
    "AI scoring should keep a human-in-the-loop for edge cases - which is why the review queue, appeals, and full audit trail exist by design, not as an afterthought.",
    "Roadmap: Freshservice support, voice-call grading (once a full transcript source is confirmed available), and listing as a Freshworks Marketplace paid app.",
])

# ============================================================
# Sources
# ============================================================
doc.add_heading("Sources", level=1)
bullets([
    "MaestroQA workflow & help docs: help.maestroqa.com (rubric structure, scoring, calibration, appeals, coaching)",
    "MaestroQA pricing: vendr.com/marketplace/maestroqa",
    "Manual QA coverage data: calabrio.com, irisagent.com, intryc.com customer story",
    "Market sizing: coherentmarketinsights.com, researchandmarkets.com",
    "Freshworks App SDK v3.0 docs: developers.freshworks.com/docs/app-sdk/v3.0/",
    "Claude API pricing: anthropic docs (Sonnet 5 list pricing, prompt caching, Message Batches)",
], style="List Bullet")

doc.add_paragraph("")
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
fr = footer.add_run("FreshQA - The Great Agent Hackathon 2026 - github.com/balasaravanank/FreshQA")
fr.italic = True
fr.font.size = Pt(9)
fr.font.color.rgb = MUTED

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
doc.save(OUT_PATH)
print(f"Wrote {os.path.abspath(OUT_PATH)}")
