const config = require('../config');
const { db, json } = require('../db');
const scorecards = require('./scorecards');
const evaluations = require('./evaluations');
const claudeClient = require('./claudeClient');
const mockGrader = require('./mockGrader');
const { criterionPercents } = require('./reports');
const { badRequest } = require('../errors');

function weakCriteria(agentId, limit = 3) {
  const evals = evaluations.list({ agentId });
  if (evals.length === 0) throw badRequest(`No evaluations for agent ${agentId}`);
  const { definition } = scorecards.active();
  const stats = criterionPercents(definition, evals);

  return stats
    .filter((s) => s.average_pct !== null && s.average_pct < 100)
    .sort((a, b) => a.average_pct - b.average_pct)
    .slice(0, limit)
    .map((s) => ({
      criterion_id: s.criterion_id,
      question: s.question,
      average_pct: s.average_pct,
      examples: evals
        .map((e) => ({ ticket_id: e.ticket_id, answer: e.final_answers.find((a) => a.criterion_id === s.criterion_id) }))
        .filter((x) => x.answer && x.answer.evidence)
        .slice(0, 3)
        .map((x) => ({ ticket_id: x.ticket_id, answer: x.answer.option_id, evidence: x.answer.evidence })),
    }));
}

async function draft(agentId) {
  const evals = evaluations.list({ agentId });
  const agentName = evals[0] ? evals[0].agent_name : `Agent ${agentId}`;
  const weak = weakCriteria(agentId);
  if (weak.length === 0) return { agent_id: agentId, agent_name: agentName, summary: 'No weak criteria found.', points: [] };

  const result = config.grader === 'mock' ? mockGrader.draftCoaching(agentName, weak) : await claudeClient.draftCoaching(agentName, weak);
  evaluations.recordUsage('coaching', result, null);
  return { agent_id: agentId, agent_name: agentName, summary: result.summary, points: result.points, evaluation_ids: evals.map((e) => e.id) };
}

function save({ agentId, agentName, points, notes, evaluationIds }) {
  if (!agentId || !Array.isArray(points)) throw badRequest('agentId and points are required');
  const { lastInsertRowid } = db
    .prepare('INSERT INTO coaching_sessions (agent_id, agent_name, points, notes, evaluation_ids) VALUES (?, ?, ?, ?, ?)')
    .run(String(agentId), agentName || null, json.stringify(points), notes || null, json.stringify(evaluationIds || []));
  return list().find((s) => s.id === Number(lastInsertRowid));
}

function list(agentId) {
  const rows = agentId
    ? db.prepare('SELECT * FROM coaching_sessions WHERE agent_id = ? ORDER BY created_at DESC').all(String(agentId))
    : db.prepare('SELECT * FROM coaching_sessions ORDER BY created_at DESC').all();
  return rows.map((r) => ({ ...r, points: json.parse(r.points), evaluation_ids: json.parse(r.evaluation_ids) }));
}

module.exports = { draft, save, list };
