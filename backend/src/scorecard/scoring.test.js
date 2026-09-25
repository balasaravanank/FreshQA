const test = require('node:test');
const assert = require('node:assert/strict');
const { computeScore, alignment, validateScorecard } = require('./scoring');
const template = require('./template.json');

const opts = (max) => [
  { id: 'full', label: 'Full', points: max },
  { id: 'none', label: 'None', points: 0 },
];

// 35 max points: 15 + 10 + 5 + 5
const card = {
  name: 'Test',
  scoringMethod: 'total_points',
  sections: [
    {
      id: 's1',
      name: 'S1',
      type: 'standard',
      criteria: [
        { id: 'a', question: 'a', allowNA: false, options: [...opts(15), { id: 'part', label: 'Part', points: 6 }] },
        { id: 'b', question: 'b', allowNA: false, options: opts(10) },
        { id: 'c', question: 'c', allowNA: true, options: opts(5) },
        { id: 'd', question: 'd', allowNA: false, options: opts(5) },
      ],
    },
    { id: 'bonus', name: 'Bonus', type: 'bonus', criteria: [{ id: 'x', question: 'x', options: opts(3) }] },
    {
      id: 'af',
      name: 'Auto-fail',
      type: 'auto_fail',
      criteria: [
        { id: 'v', question: 'v', options: [{ id: 'pass', label: 'Pass', points: 0 }, { id: 'fail', label: 'Fail', points: 0, autoFail: true }] },
      ],
    },
  ],
};

const base = [
  { criterion_id: 'a', option_id: 'part' },
  { criterion_id: 'b', option_id: 'full' },
  { criterion_id: 'c', option_id: 'full' },
  { criterion_id: 'd', option_id: 'none' },
  { criterion_id: 'x', option_id: 'none' },
  { criterion_id: 'v', option_id: 'pass' },
];

test('total points: 21 of 35 = 60% (MaestroQA example)', () => {
  assert.equal(computeScore(card, base).score, 60);
});

test('N/A removes a 5-point criterion from earned and max: 16 of 30', () => {
  const answers = base.map((a) => (a.criterion_id === 'c' ? { ...a, option_id: 'na' } : a));
  assert.equal(computeScore(card, answers).score, 53.3);
});

test('N/A on a zero-earned criterion: 21 of 30 = 70% (MaestroQA example)', () => {
  const answers = base.map((a) => (a.criterion_id === 'd' ? { ...a, option_id: 'na' } : a));
  assert.equal(computeScore(card, answers).score, 70);
});

test('bonus points add to earned without raising max', () => {
  const answers = base.map((a) => (a.criterion_id === 'x' ? { ...a, option_id: 'full' } : a));
  assert.equal(computeScore(card, answers).score, 68.6);
});

test('any auto-fail answer sets the score to 0', () => {
  const answers = base.map((a) => (a.criterion_id === 'v' ? { ...a, option_id: 'fail' } : a));
  const result = computeScore(card, answers);
  assert.equal(result.score, 0);
  assert.equal(result.autoFailed, true);
});

test('weighted sections: earned/max * weight, renormalised over scored sections', () => {
  const weighted = {
    name: 'W',
    scoringMethod: 'weighted_sections',
    sections: [
      { id: 'w1', name: 'W1', type: 'standard', weight: 60, criteria: [{ id: 'p', question: 'p', options: opts(10) }] },
      { id: 'w2', name: 'W2', type: 'standard', weight: 40, criteria: [{ id: 'q', question: 'q', options: opts(10) }] },
    ],
  };
  const score = computeScore(weighted, [
    { criterion_id: 'p', option_id: 'full' },
    { criterion_id: 'q', option_id: 'none' },
  ]).score;
  assert.equal(score, 60);
});

test('alignment: 10/15 vs 7/15 = 80% (MaestroQA example)', () => {
  const single = {
    name: 'A',
    scoringMethod: 'total_points',
    sections: [
      {
        id: 's',
        name: 'S',
        type: 'standard',
        criteria: [
          {
            id: 'q',
            question: 'q',
            options: [
              { id: 'ten', label: '10', points: 10 },
              { id: 'seven', label: '7', points: 7 },
              { id: 'max', label: '15', points: 15 },
            ],
          },
        ],
      },
    ],
  };
  const result = alignment(single, [{ criterion_id: 'q', option_id: 'ten' }], [{ criterion_id: 'q', option_id: 'seven' }]);
  assert.equal(result.overall, 80);
});

test('alignment: identical answers are 100%', () => {
  assert.equal(alignment(card, base, base).overall, 100);
});

test('shipped template is a valid scorecard with 35 standard points', () => {
  assert.deepEqual(validateScorecard(template), []);
  const allYes = template.sections.flatMap((s) =>
    s.criteria.map((c) => ({ criterion_id: c.id, option_id: s.type === 'auto_fail' ? 'pass' : c.options[0].id }))
  );
  assert.equal(computeScore(template, allYes).score, 108.6);
});

test('validation rejects duplicate criterion ids and bad section types', () => {
  const bad = {
    name: 'Bad',
    scoringMethod: 'total_points',
    sections: [
      { id: 's', name: 'S', type: 'weird', criteria: [{ id: 'a', question: 'a', options: opts(1) }, { id: 'a', question: 'a', options: opts(1) }] },
    ],
  };
  const errors = validateScorecard(bad);
  assert.ok(errors.some((e) => e.includes('type must be')));
  assert.ok(errors.some((e) => e.includes('duplicate')));
});
