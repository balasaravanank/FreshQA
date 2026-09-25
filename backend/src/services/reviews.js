const { db, json } = require('../db');
const { computeScore, alignment, allCriteria, NA } = require('../scorecard/scoring');
const scorecards = require('./scorecards');
const evaluations = require('./evaluations');
const { badRequest } = require('../errors');

function validateAnswers(definition, answers) {
  if (!Array.isArray(answers)) return ['answers must be an array'];
  const byId = new Map(answers.map((a) => [a.criterion_id, a]));
  const errors = [];
  for (const { criterion } of allCriteria(definition)) {
    const answer = byId.get(criterion.id);
    if (!answer) {
      errors.push(`missing answer for ${criterion.id}`);
      continue;
    }
    const valid = criterion.options.some((o) => o.id === answer.option_id) || (answer.option_id === NA && criterion.allowNA);
    if (!valid) errors.push(`invalid option "${answer.option_id}" for ${criterion.id}`);
  }
  return errors;
}

// A human review replaces the final answers; the AI answers are kept so AI-vs-human
// alignment (MaestroQA's alignment formula) can be tracked per criterion over time.
function submitReview({ evaluationId, answers, reviewer, comment }) {
  if (!reviewer) throw badRequest('reviewer is required');
  const evaluation = evaluations.findById(evaluationId);
  const { definition } = scorecards.byVersion(evaluation.scorecard_version);

  const aiById = new Map(evaluation.ai_answers.map((a) => [a.criterion_id, a]));
  const merged = (answers || []).map((a) => ({
    criterion_id: a.criterion_id,
    option_id: a.option_id,
    evidence: a.evidence || (aiById.get(a.criterion_id) || {}).evidence || '',
    confidence: 'human',
  }));
  const errors = validateAnswers(definition, merged);
  if (errors.length) throw badRequest('Invalid review answers', errors);

  const { score, autoFailed } = computeScore(definition, merged);
  const aligned = alignment(definition, evaluation.ai_answers, merged).overall;

  db.prepare('INSERT INTO reviews (evaluation_id, reviewer, answers, score, alignment, comment) VALUES (?, ?, ?, ?, ?, ?)').run(
    evaluation.id,
    reviewer,
    json.stringify(merged),
    score,
    aligned,
    comment || null
  );
  db.prepare('UPDATE evaluations SET final_answers = ?, final_score = ?, auto_failed = ?, reviewed = 1 WHERE id = ?').run(
    json.stringify(merged),
    score,
    autoFailed ? 1 : 0,
    evaluation.id
  );
  return evaluations.findById(evaluation.id);
}

module.exports = { submitReview, validateAnswers };
