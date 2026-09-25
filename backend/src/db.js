const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS scorecards (
    version     INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    definition  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id          TEXT NOT NULL UNIQUE,
    agent_id           TEXT,
    agent_name         TEXT,
    subject            TEXT,
    channel            TEXT,
    transcript         TEXT NOT NULL,
    scorecard_version  INTEGER NOT NULL,
    ai_answers         TEXT NOT NULL,
    ai_score           REAL NOT NULL,
    final_answers      TEXT NOT NULL,
    final_score        REAL NOT NULL,
    auto_failed        INTEGER NOT NULL DEFAULT 0,
    summary            TEXT,
    queue_reasons      TEXT NOT NULL DEFAULT '[]',
    reviewed           INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id  INTEGER NOT NULL REFERENCES evaluations(id),
    reviewer       TEXT NOT NULL,
    answers        TEXT NOT NULL,
    score          REAL NOT NULL,
    alignment      REAL,
    comment        TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appeals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id  INTEGER NOT NULL REFERENCES evaluations(id),
    criterion_id   TEXT NOT NULL,
    reason         TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'open',
    resolution     TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS coaching_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id        TEXT NOT NULL,
    agent_name      TEXT,
    points          TEXT NOT NULL,
    notes           TEXT,
    evaluation_ids  TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usage (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    kind                TEXT NOT NULL,
    model               TEXT NOT NULL,
    ticket_id           TEXT,
    input_tokens        INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens   INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens       INTEGER NOT NULL DEFAULT 0,
    cost_usd            REAL NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS batches (
    id          TEXT PRIMARY KEY,
    status      TEXT NOT NULL DEFAULT 'submitted',
    tickets     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const json = {
  parse: (value) => (value == null ? null : JSON.parse(value)),
  stringify: (value) => JSON.stringify(value),
};

module.exports = { db, json };
