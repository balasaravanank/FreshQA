const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Freshdesk's API refuses to change an agent's profile name ("Not allowed to edit Agent's
// profile information") — that's only editable by the agent themself after accepting their
// invite. This local override lets seed/demo scripts give agents a friendly display name
// without depending on that. See scripts/seed/push-to-freshdesk.js.
const AGENT_DIRECTORY_PATH = path.join(__dirname, '..', '..', 'data', 'agent-directory.json');
function agentDirectory() {
  try {
    return JSON.parse(fs.readFileSync(AGENT_DIRECTORY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

const SOURCES = { 1: 'email', 2: 'portal', 3: 'phone', 7: 'chat', 9: 'feedback_widget', 10: 'outbound_email' };
const RESOLVED_STATUSES = [4, 5];

let _http;
function http() {
  if (!_http) {
    const { domain, apiKey } = config.freshdesk();
    _http = axios.create({
      baseURL: `https://${domain}.freshdesk.com/api/v2`,
      auth: { username: apiKey, password: 'X' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
  }
  return _http;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const agentNames = new Map();
async function getAgentName(agentId) {
  if (!agentId) return 'Unassigned';
  const override = agentDirectory()[String(agentId)];
  if (override) return override;
  if (!agentNames.has(agentId)) {
    try {
      const { data } = await http().get(`/agents/${agentId}`);
      agentNames.set(agentId, (data.contact && data.contact.name) || `Agent ${agentId}`);
    } catch {
      agentNames.set(agentId, `Agent ${agentId}`);
    }
  }
  return agentNames.get(agentId);
}

async function getTicketTranscript(ticketId) {
  const [{ data: ticket }, { data: conversations }] = await Promise.all([
    http().get(`/tickets/${ticketId}`),
    http().get(`/tickets/${ticketId}/conversations`),
  ]);

  const turns = [
    { speaker: 'customer', body: stripHtml(ticket.description_text || ticket.description), at: ticket.created_at },
    ...conversations
      .filter((c) => !c.private)
      .map((c) => ({ speaker: c.incoming ? 'customer' : 'agent', body: stripHtml(c.body_text || c.body), at: c.created_at })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));

  const agentId = ticket.responder_id ? String(ticket.responder_id) : null;
  return {
    ticketId: String(ticket.id),
    subject: ticket.subject,
    channel: (ticket.tags || []).includes('phone') ? 'phone' : SOURCES[ticket.source] || 'ticket',
    agentId,
    agentName: await getAgentName(agentId),
    turns: turns.map(({ speaker, body }) => ({ speaker, body })),
  };
}

async function listResolvedTicketIds(sinceIso) {
  const ids = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data } = await http().get('/tickets', {
      params: { updated_since: sinceIso, per_page: 100, page, order_by: 'updated_at', order_type: 'asc' },
    });
    ids.push(...data.filter((t) => RESOLVED_STATUSES.includes(t.status)).map((t) => String(t.id)));
    if (data.length < 100) break;
  }
  return ids;
}

async function addPrivateNote(ticketId, html) {
  await http().post(`/tickets/${ticketId}/notes`, { body: html, private: true });
}

// Requires a Number custom field named "quality_score" (API name cf_quality_score) created once in Admin > Ticket Fields.
async function setQualityScoreField(ticketId, score) {
  await http().put(`/tickets/${ticketId}`, { custom_fields: { cf_quality_score: Math.round(score) } });
}

module.exports = { getTicketTranscript, listResolvedTicketIds, addPrivateNote, setQualityScoreField, RESOLVED_STATUSES };
