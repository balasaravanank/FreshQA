const { db, json } = require('../db');
const template = require('../scorecard/template.json');
const { validateScorecard } = require('../scorecard/scoring');
const { badRequest, notFound } = require('../errors');

function save(definition) {
  const errors = validateScorecard(definition);
  if (errors.length) throw badRequest('Invalid scorecard', errors);
  db.prepare('INSERT INTO scorecards (name, definition) VALUES (?, ?)').run(definition.name, json.stringify(definition));
  return active();
}

function active() {
  const row = db.prepare('SELECT version, definition, created_at FROM scorecards ORDER BY version DESC LIMIT 1').get();
  if (!row) return save(template);
  return { version: row.version, definition: json.parse(row.definition), created_at: row.created_at };
}

function byVersion(version) {
  const row = db.prepare('SELECT version, definition, created_at FROM scorecards WHERE version = ?').get(version);
  if (!row) throw notFound(`Scorecard version ${version} not found`);
  return { version: row.version, definition: json.parse(row.definition), created_at: row.created_at };
}

function history() {
  return db.prepare('SELECT version, name, created_at FROM scorecards ORDER BY version DESC').all();
}

module.exports = { active, byVersion, save, history };
