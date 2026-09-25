const { db } = require('../db');
const { allCriteria } = require('../scorecard/scoring');
const scorecards = require('./scorecards');
const evaluations = require('./evaluations');
const reviews = require('./reviews');
const { badRequest, notFound } = require('../errors');

function openAppeal({ evaluationId, criterionId, reason }) {
  if (!reason || !reason.trim()) throw badRequest('reason is required');
  const evaluation = evaluations.findById(evaluationId);
  const { definition } = scorecards.byVersion(evaluation.scorecard_version);
  if (!allCriteria(definition).some(({ criterion }) => criterion.id === criterionId)) {
    throw badRequest(`Unknown criterion ${criterionId}`);
  }
  const duplicate = db
    .prepare("SELECT id FROM appeals WHERE evaluation_id = ? AND criterion_id = ? AND status = 'open'")
    .get(evaluation.id, criterionId);
  if (duplicate) throw badRequest('An open appeal already exists for this criterion');

  const { lastInsertRowid } = db
    .prepare('INSERT INTO appeals (evaluation_id, criterion_id, reason) VALUES (?, ?, ?)')
    .run(evaluation.id, criterionId, reason.trim());
  return get(lastInsertRowid);
}

function get(id) {
  const appeal = db.prepare('SELECT * FROM appeals WHERE id = ?').get(id);
  if (!appeal) throw notFound(`Appeal ${id} not found`);
  return appeal;
}

// One-step resolution by the coach. Accepting applies the corrected answer as a human review,
// so the final score and the AI-vs-human alignment both update.
function resolveAppeal(id, { status, optionId, resolution, reviewer }) {
  const appeal = get(id);
  if (appeal.status !== 'open') throw badRequest('Appeal is already resolved');
  if (!['accepted', 'rejected'].includes(status)) throw badRequest('status must be accepted or rejected');
  if (!reviewer) throw badRequest('reviewer is required');

  if (status === 'accepted') {
    if (!optionId) throw badRequest('optionId is required when accepting an appeal');
    const evaluation = evaluations.findById(appeal.evaluation_id);
    const answers = evaluation.final_answers.map((a) =>
      a.criterion_id === appeal.criterion_id ? { ...a, option_id: optionId, evidence: `Changed on appeal: ${appeal.reason}` } : a
    );
    reviews.submitReview({ evaluationId: evaluation.id, answers, reviewer, comment: `Appeal #${appeal.id} accepted. ${resolution || ''}`.trim() });
  }

  db.prepare("UPDATE appeals SET status = ?, resolution = ?, resolved_at = datetime('now') WHERE id = ?").run(status, resolution || null, id);
  return get(id);
}

function list({ status } = {}) {
  const sql = `SELECT a.*, e.ticket_id, e.agent_name, e.subject, e.final_score
               FROM appeals a JOIN evaluations e ON e.id = a.evaluation_id
               ${status ? 'WHERE a.status = ?' : ''} ORDER BY a.created_at DESC`;
  return status ? db.prepare(sql).all(status) : db.prepare(sql).all();
}

module.exports = { openAppeal, resolveAppeal, list };
