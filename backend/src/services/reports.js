const { db, json } = require('../db');
const { allCriteria, criterionMax, alignment, NA } = require('../scorecard/scoring');
const scorecards = require('./scorecards');

const TICKETS_PER_AGENT_PER_MONTH = 1100;
const MANUAL_QA_COVERAGE_PCT = 5;
const BENCHMARKS = {
  maestroqa_median_annual_usd: 23520,
  maestroqa_source: 'https://www.vendr.com/marketplace/maestroqa',
  market_per_agent_month_usd: 35,
  market_source: 'https://www.evaluagent.com/pricing/',
};

function round1(n) {
  return n == null ? null : Math.round(n * 10) / 10;
}

function allEvaluations() {
  return db
    .prepare('SELECT id, ticket_id, agent_id, agent_name, final_answers, final_score, ai_score, auto_failed, reviewed, created_at FROM evaluations')
    .all()
    .map((r) => ({ ...r, final_answers: json.parse(r.final_answers) }));
}

// Points criteria: average % of max. Auto-fail criteria (0 points): pass rate %.
function criterionPercents(definition, evals) {
  return allCriteria(definition).map(({ section, criterion }) => {
    const max = criterionMax(criterion);
    const values = [];
    for (const e of evals) {
      const answer = e.final_answers.find((a) => a.criterion_id === criterion.id);
      if (!answer || answer.option_id === NA) continue;
      const option = criterion.options.find((o) => o.id === answer.option_id);
      if (max === 0) values.push(option && option.autoFail ? 0 : 100);
      else values.push(option ? (option.points / max) * 100 : 0);
    }
    return {
      criterion_id: criterion.id,
      question: criterion.question,
      section: section.name,
      section_type: section.type,
      average_pct: values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null,
      answered: values.length,
    };
  });
}

function costTotals() {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS cost, COALESCE(SUM(input_tokens), 0) AS input,
              COALESCE(SUM(cache_read_tokens), 0) AS cache_read, COALESCE(SUM(cache_write_tokens), 0) AS cache_write,
              COALESCE(SUM(output_tokens), 0) AS output
       FROM usage`
    )
    .get();
  const graded = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(cost_usd), 0) AS cost FROM usage WHERE kind IN ('grade', 'grade_batch')").get();
  return { ...row, graded_calls: graded.n, grading_cost: graded.cost };
}

function overview() {
  const evals = allEvaluations();
  const count = evals.length;
  const costs = costTotals();
  const perTicket = costs.graded_calls ? costs.grading_cost / costs.graded_calls : 0;
  const alignmentRow = db.prepare('SELECT AVG(alignment) AS avg, COUNT(*) AS n FROM reviews').get();

  return {
    evaluated_tickets: count,
    ai_coverage_pct: count ? 100 : 0,
    manual_equivalent_tickets: Math.round((count * MANUAL_QA_COVERAGE_PCT) / 100),
    manual_qa_coverage_pct: MANUAL_QA_COVERAGE_PCT,
    average_score: count ? round1(evals.reduce((s, e) => s + e.final_score, 0) / count) : null,
    auto_fails: evals.filter((e) => e.auto_failed).length,
    human_reviewed: evals.filter((e) => e.reviewed).length,
    review_queue: db
      .prepare(
        `SELECT COUNT(*) AS n FROM evaluations e WHERE (e.reviewed = 0 AND e.queue_reasons != '[]')
           OR EXISTS (SELECT 1 FROM appeals a WHERE a.evaluation_id = e.id AND a.status = 'open')`
      )
      .get().n,
    open_appeals: db.prepare("SELECT COUNT(*) AS n FROM appeals WHERE status = 'open'").get().n,
    ai_human_alignment_pct: round1(alignmentRow.avg),
    reviews: alignmentRow.n,
    total_cost_usd: costs.cost,
    cost_per_ticket_usd: perTicket,
  };
}

function agents() {
  const evals = allEvaluations();
  const { definition } = scorecards.active();
  const byAgent = new Map();
  for (const e of evals) {
    const key = e.agent_id || 'unassigned';
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key).push(e);
  }
  return [...byAgent.entries()]
    .map(([agentId, list]) => {
      const criteria = criterionPercents(definition, list).filter((c) => c.average_pct !== null);
      const weakest = criteria.sort((a, b) => a.average_pct - b.average_pct)[0];
      return {
        agent_id: agentId,
        agent_name: list[0].agent_name,
        tickets: list.length,
        average_score: round1(list.reduce((s, e) => s + e.final_score, 0) / list.length),
        auto_fails: list.filter((e) => e.auto_failed).length,
        weakest_criterion: weakest ? { criterion_id: weakest.criterion_id, question: weakest.question, average_pct: weakest.average_pct } : null,
      };
    })
    .sort((a, b) => b.average_score - a.average_score);
}

function breakdown() {
  const evals = allEvaluations();
  const { definition } = scorecards.active();
  const agentList = agents();
  return {
    criteria: criterionPercents(definition, evals),
    agents: agentList.map((a) => ({
      agent_id: a.agent_id,
      agent_name: a.agent_name,
      criteria: criterionPercents(
        definition,
        evals.filter((e) => (e.agent_id || 'unassigned') === a.agent_id)
      ).map((c) => ({ criterion_id: c.criterion_id, average_pct: c.average_pct })),
    })),
  };
}

function trends() {
  return db
    .prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS tickets, ROUND(AVG(final_score), 1) AS average_score,
              SUM(auto_failed) AS auto_fails
       FROM evaluations GROUP BY date(created_at) ORDER BY day`
    )
    .all();
}

function alignmentReport() {
  const rows = db
    .prepare('SELECT r.answers, e.ai_answers, e.scorecard_version FROM reviews r JOIN evaluations e ON e.id = r.evaluation_id')
    .all();
  const perCriterion = new Map();
  let overallSum = 0;
  for (const row of rows) {
    const { definition } = scorecards.byVersion(row.scorecard_version);
    const result = alignment(definition, json.parse(row.ai_answers), json.parse(row.answers));
    overallSum += result.overall;
    for (const c of result.perCriterion) {
      if (!perCriterion.has(c.criterion_id)) perCriterion.set(c.criterion_id, []);
      perCriterion.get(c.criterion_id).push(c.alignment);
    }
  }
  const { definition } = scorecards.active();
  return {
    reviews: rows.length,
    overall_pct: rows.length ? round1(overallSum / rows.length) : null,
    criteria: allCriteria(definition).map(({ criterion }) => {
      const values = perCriterion.get(criterion.id) || [];
      return {
        criterion_id: criterion.id,
        question: criterion.question,
        reviews: values.length,
        alignment_pct: values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null,
      };
    }),
  };
}

function cost() {
  const totals = costTotals();
  const perTicket = totals.graded_calls ? totals.grading_cost / totals.graded_calls : 0;
  const perAgentMonth = perTicket * TICKETS_PER_AGENT_PER_MONTH;
  return {
    ...totals,
    by_kind: db.prepare('SELECT kind, model, COUNT(*) AS calls, SUM(cost_usd) AS cost FROM usage GROUP BY kind, model').all(),
    cost_per_ticket_usd: perTicket,
    assumed_tickets_per_agent_month: TICKETS_PER_AGENT_PER_MONTH,
    projected_cost_per_agent_month_usd: perAgentMonth,
    benchmarks: BENCHMARKS,
  };
}

module.exports = { overview, agents, breakdown, trends, alignmentReport, cost, criterionPercents };
