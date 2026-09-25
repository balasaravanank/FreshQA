const config = require('../config');
const { db, json } = require('../db');
const { computeScore, allCriteria, NA } = require('../scorecard/scoring');
const scorecards = require('./scorecards');
const claudeClient = require('./claudeClient');
const mockGrader = require('./mockGrader');
const freshdesk = require('./freshdeskClient');
const { costUsd } = require('./costs');
const { notFound } = require('../errors');

function rowToEvaluation(row) {
  if (!row) return null;
  return {
    ...row,
    transcript: json.parse(row.transcript),
    ai_answers: json.parse(row.ai_answers),
    final_answers: json.parse(row.final_answers),
    queue_reasons: json.parse(row.queue_reasons),
    auto_failed: Boolean(row.auto_failed),
    reviewed: Boolean(row.reviewed),
  };
}

function findByTicket(ticketId) {
  return rowToEvaluation(db.prepare('SELECT * FROM evaluations WHERE ticket_id = ?').get(String(ticketId)));
}

function findById(id) {
  const evaluation = rowToEvaluation(db.prepare('SELECT * FROM evaluations WHERE id = ?').get(id));
  if (!evaluation) throw notFound(`Evaluation ${id} not found`);
  return evaluation;
}

// Keep only one valid answer per criterion. Anything the model got wrong becomes a
// low-confidence blank so it scores 0 for that criterion and lands in the human review queue.
function normalizeAnswers(definition, rawAnswers) {
  const byId = new Map(rawAnswers.map((a) => [a.criterion_id, a]));
  return allCriteria(definition).map(({ criterion }) => {
    const answer = byId.get(criterion.id);
    const validOption =
      answer && (criterion.options.some((o) => o.id === answer.option_id) || (answer.option_id === NA && criterion.allowNA));
    if (!validOption) {
      return { criterion_id: criterion.id, option_id: null, evidence: 'The AI did not return a valid answer for this criterion.', confidence: 'low' };
    }
    return { criterion_id: criterion.id, option_id: answer.option_id, evidence: answer.evidence, confidence: answer.confidence };
  });
}

function queueReasons(answers, score, autoFailed) {
  const reasons = [];
  if (autoFailed) reasons.push('auto_fail');
  if (score < config.queueScoreThreshold) reasons.push('low_score');
  if (answers.some((a) => a.confidence === 'low')) reasons.push('low_confidence');
  if (Math.random() * 100 < config.queueRandomSamplePct) reasons.push('calibration_sample');
  return reasons;
}

function recordUsage(kind, graded, ticketId, { batch = false } = {}) {
  if (!graded.usage) return;
  const u = graded.usage;
  db.prepare(
    `INSERT INTO usage (kind, model, ticket_id, input_tokens, cache_read_tokens, cache_write_tokens, output_tokens, cost_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    kind,
    graded.model,
    ticketId ? String(ticketId) : null,
    u.input_tokens || 0,
    u.cache_read_input_tokens || 0,
    u.cache_creation_input_tokens || 0,
    u.output_tokens || 0,
    costUsd(graded.model, u, { batch })
  );
}

function store(transcript, scorecard, graded, { batch = false } = {}) {
  const answers = normalizeAnswers(scorecard.definition, graded.answers);
  const { score, autoFailed } = computeScore(scorecard.definition, answers);
  db.prepare(
    `INSERT INTO evaluations
       (ticket_id, agent_id, agent_name, subject, channel, transcript, scorecard_version,
        ai_answers, ai_score, final_answers, final_score, auto_failed, summary, queue_reasons)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    transcript.ticketId,
    transcript.agentId,
    transcript.agentName,
    transcript.subject,
    transcript.channel,
    json.stringify(transcript.turns),
    scorecard.version,
    json.stringify(answers),
    score,
    json.stringify(answers),
    score,
    autoFailed ? 1 : 0,
    graded.summary,
    json.stringify(queueReasons(answers, score, autoFailed))
  );
  recordUsage(batch ? 'grade_batch' : 'grade', graded, transcript.ticketId, { batch });
  return findByTicket(transcript.ticketId);
}

async function grade(definition, transcript) {
  if (config.grader === 'mock') return mockGrader.grade(definition, transcript);
  return claudeClient.gradeTicket(definition, transcript);
}

async function evaluateTranscript(transcript) {
  const existing = findByTicket(transcript.ticketId);
  if (existing) return existing;
  const scorecard = scorecards.active();
  const graded = await grade(scorecard.definition, transcript);
  return store(transcript, scorecard, graded);
}

function noteHtml(evaluation, definition) {
  const byId = new Map(evaluation.final_answers.map((a) => [a.criterion_id, a]));
  const rows = allCriteria(definition)
    .map(({ criterion }) => {
      const answer = byId.get(criterion.id);
      const option = criterion.options.find((o) => o.id === (answer && answer.option_id));
      const label = answer && answer.option_id === NA ? 'N/A' : option ? option.label : 'No answer';
      return `<li><b>${criterion.question}</b> ${label}${answer && answer.evidence ? ` <i>"${answer.evidence}"</i>` : ''}</li>`;
    })
    .join('');
  return (
    `<p><b>FreshQA score: ${evaluation.final_score}%</b>${evaluation.auto_failed ? ' <b>(AUTO-FAIL)</b>' : ''}</p>` +
    `<p>${evaluation.summary || ''}</p><ul>${rows}</ul>`
  );
}

async function writeBack(evaluation) {
  const { definition } = scorecards.byVersion(evaluation.scorecard_version);
  await freshdesk.addPrivateNote(evaluation.ticket_id, noteHtml(evaluation, definition)).catch((err) => {
    console.error(`[write-back] note failed for ticket ${evaluation.ticket_id}: ${err.message}`);
  });
  await freshdesk.setQualityScoreField(evaluation.ticket_id, evaluation.final_score).catch((err) => {
    console.error(`[write-back] cf_quality_score failed for ticket ${evaluation.ticket_id}: ${err.message}`);
  });
}

const inFlight = new Set();
async function evaluateFreshdeskTicket(ticketId) {
  ticketId = String(ticketId);
  if (findByTicket(ticketId) || inFlight.has(ticketId)) return findByTicket(ticketId);
  inFlight.add(ticketId);
  try {
    const transcript = await freshdesk.getTicketTranscript(ticketId);
    const evaluation = await evaluateTranscript(transcript);
    await writeBack(evaluation);
    return evaluation;
  } finally {
    inFlight.delete(ticketId);
  }
}

async function startBackfill(days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const ids = (await freshdesk.listResolvedTicketIds(since)).filter((id) => !findByTicket(id)).slice(0, 200);
  if (ids.length === 0) return { submitted: 0 };

  const transcripts = [];
  for (const id of ids) transcripts.push(await freshdesk.getTicketTranscript(id));

  if (config.grader === 'mock') {
    for (const t of transcripts) await writeBack(await evaluateTranscript(t));
    return { submitted: transcripts.length, graded: transcripts.length };
  }

  const scorecard = scorecards.active();
  const batchId = await claudeClient.submitGradingBatch(scorecard.definition, transcripts);
  db.prepare('INSERT INTO batches (id, tickets) VALUES (?, ?)').run(
    batchId,
    json.stringify({ scorecardVersion: scorecard.version, transcripts })
  );
  return { submitted: transcripts.length, batchId };
}

async function collectBackfills() {
  const pending = db.prepare("SELECT id, tickets FROM batches WHERE status = 'submitted'").all();
  let stored = 0;
  for (const batch of pending) {
    const results = await claudeClient.collectGradingBatch(batch.id);
    if (!results) continue;
    const { scorecardVersion, transcripts } = json.parse(batch.tickets);
    const scorecard = scorecards.byVersion(scorecardVersion);
    for (const result of results) {
      const transcript = transcripts.find((t) => t.ticketId === result.ticketId);
      if (result.error || !transcript || findByTicket(result.ticketId)) {
        if (result.error) console.error(`[batch ${batch.id}] ticket ${result.ticketId}: ${result.error}`);
        continue;
      }
      await writeBack(store(transcript, scorecard, result, { batch: true }));
      stored += 1;
    }
    db.prepare("UPDATE batches SET status = 'collected' WHERE id = ?").run(batch.id);
  }
  return { pendingBatches: pending.length, stored };
}

function list({ agentId, limit = 200 } = {}) {
  const rows = agentId
    ? db.prepare('SELECT * FROM evaluations WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?').all(String(agentId), limit)
    : db.prepare('SELECT * FROM evaluations ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(rowToEvaluation);
}

function queue() {
  const rows = db
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM appeals a WHERE a.evaluation_id = e.id AND a.status = 'open') AS open_appeals
       FROM evaluations e
       WHERE (e.reviewed = 0 AND e.queue_reasons != '[]')
          OR EXISTS (SELECT 1 FROM appeals a WHERE a.evaluation_id = e.id AND a.status = 'open')
       ORDER BY e.auto_failed DESC, open_appeals DESC, e.final_score ASC`
    )
    .all();
  return rows.map((row) => {
    const evaluation = rowToEvaluation(row);
    if (row.open_appeals > 0 && !evaluation.queue_reasons.includes('appeal')) evaluation.queue_reasons.push('appeal');
    return evaluation;
  });
}

function detail(ticketId) {
  const evaluation = findByTicket(ticketId);
  if (!evaluation) throw notFound(`Ticket ${ticketId} has not been evaluated yet`);
  return {
    ...evaluation,
    scorecard: scorecards.byVersion(evaluation.scorecard_version).definition,
    reviews: db.prepare('SELECT * FROM reviews WHERE evaluation_id = ? ORDER BY created_at').all(evaluation.id).map((r) => ({ ...r, answers: json.parse(r.answers) })),
    appeals: db.prepare('SELECT * FROM appeals WHERE evaluation_id = ? ORDER BY created_at').all(evaluation.id),
  };
}

module.exports = {
  evaluateTranscript,
  evaluateFreshdeskTicket,
  startBackfill,
  collectBackfills,
  findById,
  findByTicket,
  list,
  queue,
  detail,
  recordUsage,
  writeBack,
};
