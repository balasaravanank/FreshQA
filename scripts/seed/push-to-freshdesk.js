// Seeds a Freshdesk trial tenant: creates 3 demo agents, one ticket per file in ./tickets with the
// agent's reply posted through the real reply API, then marks each ticket Resolved. With the FreshQA
// app installed, resolving fires onTicketUpdate and every ticket is graded automatically.
// Run from backend/: npm run seed:push

const fs = require('fs');
const path = require('path');
const axios = require(require.resolve('axios', { paths: [path.join(__dirname, '..', '..', 'backend')] }));
const config = require('../../backend/src/config');

const { domain, apiKey } = config.freshdesk();
const fd = axios.create({
  baseURL: `https://${domain}.freshdesk.com/api/v2`,
  auth: { username: apiKey, password: 'X' },
  headers: { 'Content-Type': 'application/json' },
});

const AGENTS = {
  // mailinator.com has real MX records and silently accepts all mail (no bounce), unlike a
  // made-up domain — Freshdesk sends a real agent-invite email and a real reply-to-requester
  // email for every seed ticket, so a non-existent domain here bounces and spams the account owner.
  priya: { name: 'Priya S.', email: 'priya.s.freshqa@mailinator.com' },
  rahul: { name: 'Rahul K.', email: 'rahul.k.freshqa@mailinator.com' },
  meera: { name: 'Meera P.', email: 'meera.p.freshqa@mailinator.com' },
};
const SOURCE = { email: 1, phone: 3, chat: 7 };
const RESOLVED = 4;

const AGENT_DIRECTORY_PATH = path.join(__dirname, '..', '..', 'backend', 'data', 'agent-directory.json');

function describe(err) {
  return err.response ? JSON.stringify(err.response.data) : err.message;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Freshdesk's API rejects PUT /agents/{id} with name/phone/title ("Not allowed to edit Agent's
// profile information") - only the agent themself can set that, after accepting their invite.
// So seeded agents keep Freshdesk's own email-derived display name in Freshdesk's UI; this file
// gives them a friendly name inside FreshQA's own dashboard/sidebar instead (freshdeskClient.js
// checks it before falling back to Freshdesk's contact name).
function saveAgentDirectory(entries) {
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(AGENT_DIRECTORY_PATH, 'utf8'));
  } catch {
    /* no directory yet */
  }
  fs.writeFileSync(AGENT_DIRECTORY_PATH, JSON.stringify({ ...existing, ...entries }, null, 2));
}

async function ensureAgent(def) {
  const { data: agents } = await fd.get('/agents', { params: { email: def.email } });
  if (agents.length) return agents[0].id;
  const { data } = await fd.post('/agents', { email: def.email, ticket_scope: 1, occasional: false });
  return data.id;
}

async function main() {
  const agentIds = {};
  const directoryEntries = {};
  for (const [key, def] of Object.entries(AGENTS)) {
    agentIds[key] = await ensureAgent(def);
    directoryEntries[agentIds[key]] = def.name;
    console.log(`Agent ready: ${def.name} (${agentIds[key]})`);
  }
  saveAgentDirectory(directoryEntries);
  console.log(`Wrote friendly names to ${AGENT_DIRECTORY_PATH}`);

  const dir = path.join(__dirname, 'tickets');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const seed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    try {
      const { data: ticket } = await fd.post('/tickets', {
        subject: seed.subject,
        description: seed.customer_opening,
        email: 'demo.customer.freshqa@mailinator.com',
        priority: 1,
        status: 2,
        source: SOURCE[seed.channel] || 1,
        responder_id: agentIds[seed.agentKey],
        tags: [seed.channel],
      });
      await sleep(400);
      await fd.post(`/tickets/${ticket.id}/reply`, { body: seed.agent_reply });
      await sleep(400);
      await fd.put(`/tickets/${ticket.id}`, { status: RESOLVED });
      console.log(`Ticket ${ticket.id} created and resolved <- ${file}`);
    } catch (err) {
      console.error(`Failed ${file}: ${describe(err)}`);
    }
    await sleep(500); // stay comfortably under the trial plan's per-minute rate limit
  }
}

main().catch((err) => {
  console.error('Seeding failed:', describe(err));
  process.exit(1);
});
