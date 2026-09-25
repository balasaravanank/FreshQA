// Seeds a Freshdesk trial tenant: creates 3 demo agents, one ticket per file in ./tickets with the
// agent's reply posted through the real reply API, then marks each ticket Resolved. With the Native QA
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
  priya: { name: 'Priya S.', email: 'priya.s.nativeqa@example-agents.dev' },
  rahul: { name: 'Rahul K.', email: 'rahul.k.nativeqa@example-agents.dev' },
  meera: { name: 'Meera P.', email: 'meera.p.nativeqa@example-agents.dev' },
};
const SOURCE = { email: 1, phone: 3, chat: 7 };
const RESOLVED = 4;

function describe(err) {
  return err.response ? JSON.stringify(err.response.data) : err.message;
}

async function ensureAgent(def) {
  const { data: agents } = await fd.get('/agents', { params: { email: def.email } });
  if (agents.length) return agents[0].id;
  const { data } = await fd.post('/agents', { email: def.email, ticket_scope: 1, occasional: false });
  await fd.put(`/contacts/${data.contact.id}`, { name: def.name }).catch(() => {});
  return data.id;
}

async function main() {
  const agentIds = {};
  for (const [key, def] of Object.entries(AGENTS)) {
    agentIds[key] = await ensureAgent(def);
    console.log(`Agent ready: ${def.name} (${agentIds[key]})`);
  }

  const dir = path.join(__dirname, 'tickets');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const seed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    try {
      const { data: ticket } = await fd.post('/tickets', {
        subject: seed.subject,
        description: seed.customer_opening,
        email: 'demo.customer@example-agents.dev',
        priority: 1,
        status: 2,
        source: SOURCE[seed.channel] || 1,
        responder_id: agentIds[seed.agentKey],
        tags: [seed.channel],
      });
      await fd.post(`/tickets/${ticket.id}/reply`, { body: seed.agent_reply });
      await fd.put(`/tickets/${ticket.id}`, { status: RESOLVED });
      console.log(`Ticket ${ticket.id} created and resolved <- ${file}`);
    } catch (err) {
      console.error(`Failed ${file}: ${describe(err)}`);
    }
  }
}

main().catch((err) => {
  console.error('Seeding failed:', describe(err));
  process.exit(1);
});
