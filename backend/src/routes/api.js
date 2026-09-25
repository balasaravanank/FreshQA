const express = require('express');
const config = require('../config');
const scorecards = require('../services/scorecards');
const evaluations = require('../services/evaluations');
const reviews = require('../services/reviews');
const appeals = require('../services/appeals');
const coaching = require('../services/coaching');
const reports = require('../services/reports');
const { badRequest } = require('../errors');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.use((req, res, next) => {
  if (config.apiSecret && req.get('X-QA-Secret') !== config.apiSecret) {
    return res.status(401).json({ error: 'Invalid or missing X-QA-Secret header' });
  }
  next();
});

// ---- Events (called by the FDK app's serverless handlers) ----

// Grading takes several seconds; FDK serverless functions time out at 20 s, so acknowledge first.
router.post('/events/ticket-resolved', (req, res) => {
  const ticketId = req.body && req.body.ticket_id;
  if (!ticketId) throw badRequest('ticket_id is required');
  res.status(202).json({ accepted: true, ticket_id: String(ticketId) });
  evaluations.evaluateFreshdeskTicket(ticketId).catch((err) => {
    console.error(`[events] grading ticket ${ticketId} failed: ${err.message}`);
  });
});

router.post('/events/backfill', wrap(async (req, res) => {
  res.json(await evaluations.startBackfill(Number(req.body && req.body.days) || 7));
}));

router.post('/events/backfill/collect', wrap(async (req, res) => {
  res.json(await evaluations.collectBackfills());
}));

// ---- Scorecards ----

router.get('/scorecards/active', (req, res) => res.json(scorecards.active()));
router.get('/scorecards', (req, res) => res.json(scorecards.history()));
router.put('/scorecards/active', (req, res) => res.json(scorecards.save(req.body)));

// ---- Evaluations & review queue ----

router.get('/evaluations', (req, res) => {
  res.json(evaluations.list({ agentId: req.query.agent_id, limit: Number(req.query.limit) || 200 }));
});
router.get('/evaluations/ticket/:ticketId', (req, res) => res.json(evaluations.detail(req.params.ticketId)));
router.get('/queue', (req, res) => res.json(evaluations.queue()));

router.post('/reviews', (req, res) => {
  const { evaluation_id, answers, reviewer, comment } = req.body || {};
  res.json(reviews.submitReview({ evaluationId: evaluation_id, answers, reviewer, comment }));
});

// ---- Appeals ----

router.get('/appeals', (req, res) => res.json(appeals.list({ status: req.query.status })));
router.post('/appeals', (req, res) => {
  const { evaluation_id, criterion_id, reason } = req.body || {};
  res.status(201).json(appeals.openAppeal({ evaluationId: evaluation_id, criterionId: criterion_id, reason }));
});
router.patch('/appeals/:id', (req, res) => {
  const { status, option_id, resolution, reviewer } = req.body || {};
  res.json(appeals.resolveAppeal(Number(req.params.id), { status, optionId: option_id, resolution, reviewer }));
});

// ---- Coaching ----

router.get('/coaching', (req, res) => res.json(coaching.list(req.query.agent_id)));
router.post('/coaching/draft', wrap(async (req, res) => {
  const agentId = req.body && req.body.agent_id;
  if (!agentId) throw badRequest('agent_id is required');
  res.json(await coaching.draft(String(agentId)));
}));
router.post('/coaching', (req, res) => {
  const { agent_id, agent_name, points, notes, evaluation_ids } = req.body || {};
  res.status(201).json(coaching.save({ agentId: agent_id, agentName: agent_name, points, notes, evaluationIds: evaluation_ids }));
});

// ---- Reports ----

router.get('/reports/overview', (req, res) => res.json(reports.overview()));
router.get('/reports/agents', (req, res) => res.json(reports.agents()));
router.get('/reports/breakdown', (req, res) => res.json(reports.breakdown()));
router.get('/reports/trends', (req, res) => res.json(reports.trends()));
router.get('/reports/alignment', (req, res) => res.json(reports.alignmentReport()));
router.get('/reports/cost', (req, res) => res.json(reports.cost()));

module.exports = router;
