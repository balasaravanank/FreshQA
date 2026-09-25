// Grades the seed tickets in ./tickets straight from JSON (no Freshdesk tenant needed), through the
// same evaluation pipeline the backend uses for real resolved tickets. Use GRADER=mock in backend/.env
// to run fully offline, or GRADER=claude with ANTHROPIC_API_KEY for real AI grading.
// Run from backend/: npm run seed:local

const fs = require('fs');
const path = require('path');
const evaluations = require('../../backend/src/services/evaluations');

const AGENTS = {
  priya: { id: 'seed-agent-priya', name: 'Priya S.' },
  rahul: { id: 'seed-agent-rahul', name: 'Rahul K.' },
  meera: { id: 'seed-agent-meera', name: 'Meera P.' },
};

const dir = path.join(__dirname, 'tickets');

async function main() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    const seed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const agent = AGENTS[seed.agentKey];
    const transcript = {
      ticketId: `seed-${path.basename(file, '.json')}`,
      subject: seed.subject,
      channel: seed.channel,
      agentId: agent.id,
      agentName: agent.name,
      turns: [
        { speaker: 'customer', body: seed.customer_opening },
        { speaker: 'agent', body: seed.agent_reply },
      ],
    };
    try {
      const evaluation = await evaluations.evaluateTranscript(transcript);
      const flags = evaluation.auto_failed ? ' AUTO-FAIL' : '';
      console.log(`${transcript.ticketId.padEnd(42)} ${agent.name.padEnd(9)} ${String(evaluation.final_score).padStart(6)}%${flags}`);
    } catch (err) {
      console.error(`${transcript.ticketId}: ${err.message}`);
    }
  }
}

main();
