const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing env var ${name}. Copy backend/.env.example to backend/.env and fill it in.`);
  }
  return process.env[name];
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  dbPath: path.join(__dirname, '..', process.env.DB_PATH || 'data/native-qa.db'),
  grader: process.env.GRADER || 'claude',
  graderEffort: process.env.GRADER_EFFORT || 'low',
  apiSecret: process.env.QA_API_SECRET || '',
  queueScoreThreshold: Number(process.env.QUEUE_SCORE_THRESHOLD) || 70,
  queueRandomSamplePct: Number(process.env.QUEUE_RANDOM_SAMPLE_PCT) || 5,
  freshdesk() {
    return { domain: requireEnv('FRESHDESK_DOMAIN'), apiKey: requireEnv('FRESHDESK_API_KEY') };
  },
  anthropicApiKey() {
    return requireEnv('ANTHROPIC_API_KEY');
  },
};
