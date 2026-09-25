// Scoring math mirrors MaestroQA's documented rubric behaviour so results are comparable:
// - total_points: earned / max * 100, N/A removes a criterion from both (help article 4544009)
// - weighted_sections: sum(section earned / section max * weight) (help article 4547978)
// - bonus sections add earned points without raising the max; any auto-fail answer => 0% (article 4537176)
// - alignment per criterion: 1 - |a - b| / criterion max, weighted by the criterion's share of points (article 4364995)

const NA = 'na';
const SECTION_TYPES = ['standard', 'bonus', 'auto_fail'];

function criterionMax(criterion) {
  return Math.max(...criterion.options.map((o) => o.points));
}

function allCriteria(scorecard) {
  return scorecard.sections.flatMap((section) => section.criteria.map((criterion) => ({ section, criterion })));
}

function answerMap(answers) {
  return new Map(answers.map((a) => [a.criterion_id, a]));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function computeScore(scorecard, answers) {
  const byCriterion = answerMap(answers);
  let autoFailed = false;
  const sections = [];

  for (const section of scorecard.sections) {
    let earned = 0;
    let max = 0;
    for (const criterion of section.criteria) {
      const answer = byCriterion.get(criterion.id);
      if (!answer) {
        max += criterionMax(criterion);
        continue;
      }
      if (answer.option_id === NA) continue;
      const option = criterion.options.find((o) => o.id === answer.option_id);
      if (!option) {
        max += criterionMax(criterion);
        continue;
      }
      if (option.autoFail) autoFailed = true;
      earned += option.points;
      max += criterionMax(criterion);
    }
    sections.push({ id: section.id, type: section.type, weight: section.weight || 0, earned, max });
  }

  if (autoFailed) return { score: 0, autoFailed, sections };

  const standard = sections.filter((s) => s.type === 'standard');
  const bonus = sections.filter((s) => s.type === 'bonus');
  let score;

  if (scorecard.scoringMethod === 'weighted_sections') {
    const scored = standard.filter((s) => s.max > 0);
    const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
    score = totalWeight === 0 ? 100 : scored.reduce((sum, s) => sum + (s.earned / s.max) * (s.weight / totalWeight) * 100, 0);
    score += bonus.reduce((sum, s) => sum + (s.max > 0 ? (s.earned / s.max) * s.weight : 0), 0);
  } else {
    const earned = standard.reduce((sum, s) => sum + s.earned, 0) + bonus.reduce((sum, s) => sum + s.earned, 0);
    const max = standard.reduce((sum, s) => sum + s.max, 0);
    score = max === 0 ? 100 : (earned / max) * 100;
  }

  return { score: round1(score), autoFailed, sections };
}

function pointsFor(criterion, answer) {
  if (!answer || answer.option_id === NA) return null;
  const option = criterion.options.find((o) => o.id === answer.option_id);
  return option ? option.points : null;
}

function alignment(scorecard, answersA, answersB) {
  const a = answerMap(answersA);
  const b = answerMap(answersB);
  const perCriterion = [];
  let weighted = 0;
  let totalMax = 0;

  for (const { criterion } of allCriteria(scorecard)) {
    const max = criterionMax(criterion);
    const answerA = a.get(criterion.id);
    const answerB = b.get(criterion.id);
    const naA = !answerA || answerA.option_id === NA;
    const naB = !answerB || answerB.option_id === NA;
    if (naA && naB) continue;

    let value;
    if (max === 0) {
      value = !naA && !naB && answerA.option_id === answerB.option_id ? 1 : 0;
      perCriterion.push({ criterion_id: criterion.id, alignment: round1(value * 100), weighted: false });
      continue;
    }
    if (naA !== naB) value = 0;
    else value = 1 - Math.abs(pointsFor(criterion, answerA) - pointsFor(criterion, answerB)) / max;

    perCriterion.push({ criterion_id: criterion.id, alignment: round1(value * 100), weighted: true });
    weighted += value * max;
    totalMax += max;
  }

  return { overall: totalMax === 0 ? 100 : round1((weighted / totalMax) * 100), perCriterion };
}

function validateScorecard(scorecard) {
  const errors = [];
  if (!scorecard || typeof scorecard !== 'object') return ['scorecard must be an object'];
  if (!scorecard.name) errors.push('name is required');
  if (!['total_points', 'weighted_sections'].includes(scorecard.scoringMethod)) {
    errors.push('scoringMethod must be total_points or weighted_sections');
  }
  if (!Array.isArray(scorecard.sections) || scorecard.sections.length === 0) {
    errors.push('at least one section is required');
    return errors;
  }
  const ids = new Set();
  for (const section of scorecard.sections) {
    if (!section.id || !section.name) errors.push('every section needs id and name');
    if (!SECTION_TYPES.includes(section.type)) errors.push(`section ${section.id}: type must be one of ${SECTION_TYPES.join(', ')}`);
    if (scorecard.scoringMethod === 'weighted_sections' && section.type !== 'auto_fail' && !(section.weight > 0)) {
      errors.push(`section ${section.id}: weight is required for weighted_sections`);
    }
    for (const criterion of section.criteria || []) {
      if (!criterion.id || !criterion.question) errors.push(`section ${section.id}: every criterion needs id and question`);
      if (ids.has(criterion.id)) errors.push(`duplicate criterion id ${criterion.id}`);
      ids.add(criterion.id);
      if (!Array.isArray(criterion.options) || criterion.options.length < 2) {
        errors.push(`criterion ${criterion.id}: needs at least two options`);
      } else if (criterion.options.some((o) => o.id === NA)) {
        errors.push(`criterion ${criterion.id}: "na" is reserved, use allowNA instead`);
      }
    }
  }
  return errors;
}

module.exports = { NA, computeScore, alignment, validateScorecard, allCriteria, criterionMax };
