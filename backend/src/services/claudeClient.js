const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod/v4');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const config = require('../config');

const MODEL = 'claude-sonnet-5';

let _client;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: config.anthropicApiKey() });
  return _client;
}

const GradeSchema = z.object({
  answers: z.array(
    z.object({
      criterion_id: z.string(),
      option_id: z.string(),
      evidence: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
    })
  ),
  summary: z.string(),
});
const gradeFormat = zodOutputFormat(GradeSchema);

const GRADER_INSTRUCTIONS = `You are a senior customer-support Quality Assurance (QA) analyst. You grade how well a human support AGENT handled a ticket, using the team's scorecard below. You replace a manual QA reviewer, so be as consistent and fair as an experienced human grader would be.

How to grade:
- Grade ONLY the agent's messages. The customer's tone or mistakes never lower the agent's score.
- Answer EVERY criterion in the scorecard exactly once, using its criterion_id and one of its option ids.
- Use option_id "na" only when the criterion says N/A is allowed AND it genuinely does not apply to this ticket.
- Follow each criterion's grading instruction literally. When the instruction names specific evidence (for example "at least one additional verification factor"), look for that evidence in the transcript.
- evidence: quote the agent's exact words that justify your answer (under 30 words). If the answer is based on something missing, state what is missing, e.g. "No identity check before resetting the password."
- confidence: "high" when the transcript clearly supports the answer, "medium" when it is a judgement call, "low" when the transcript is ambiguous or missing context a human would need (a human reviewer will check low-confidence answers).
- summary: two sentences a QA coach could read in five seconds: what the agent did well and the single most important thing to improve.

Section types:
- standard: normal scored questions.
- bonus: extra credit; only award it for something genuinely beyond the ask.
- auto_fail: compliance checks. Choosing an option marked AUTO-FAIL sets the whole ticket score to 0%, so only choose it when the transcript clearly shows the violation.

Scorecard:
`;

function renderScorecard(scorecard) {
  return scorecard.sections
    .map((section) => {
      const criteria = section.criteria
        .map((c) => {
          const options = c.options
            .map((o) => `      - option_id "${o.id}": ${o.label} (${o.points} pts${o.autoFail ? ', AUTO-FAIL' : ''})`)
            .join('\n');
          return [
            `  - criterion_id "${c.id}": ${c.question}`,
            c.aiInstruction ? `    Grading instruction: ${c.aiInstruction}` : null,
            `    N/A allowed: ${c.allowNA ? 'yes (option_id "na")' : 'no'}`,
            '    Options:',
            options,
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n');
      return `Section "${section.name}" (type: ${section.type})\n${criteria}`;
    })
    .join('\n\n');
}

function transcriptText(transcript) {
  return transcript.turns.map((t) => `${t.speaker.toUpperCase()}: ${t.body}`).join('\n\n');
}

function gradeParams(scorecard, transcript, format) {
  return {
    model: MODEL,
    max_tokens: 8000,
    system: [
      { type: 'text', text: GRADER_INSTRUCTIONS + renderScorecard(scorecard), cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Ticket #${transcript.ticketId}\nSubject: ${transcript.subject}\nChannel: ${transcript.channel}\n\nTranscript:\n${transcriptText(transcript)}`,
      },
    ],
    output_config: { effort: config.graderEffort, format },
  };
}

function assertUsable(response) {
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to grade this ticket');
  if (response.stop_reason === 'max_tokens') throw new Error('Grading response was cut off (max_tokens)');
}

async function gradeTicket(scorecard, transcript) {
  const response = await client().messages.parse(gradeParams(scorecard, transcript, gradeFormat));
  assertUsable(response);
  if (!response.parsed_output) throw new Error('Grading response did not match the expected schema');
  return { ...response.parsed_output, usage: response.usage, model: MODEL };
}

async function submitGradingBatch(scorecard, transcripts) {
  const rawFormat = { type: gradeFormat.type, schema: gradeFormat.schema };
  const batch = await client().messages.batches.create({
    requests: transcripts.map((t) => ({
      custom_id: `ticket-${t.ticketId}`,
      params: gradeParams(scorecard, t, rawFormat),
    })),
  });
  return batch.id;
}

async function collectGradingBatch(batchId) {
  const batch = await client().messages.batches.retrieve(batchId);
  if (batch.processing_status !== 'ended') return null;

  const results = [];
  for await (const item of await client().messages.batches.results(batchId)) {
    const ticketId = item.custom_id.replace(/^ticket-/, '');
    if (item.result.type !== 'succeeded') {
      results.push({ ticketId, error: item.result.type });
      continue;
    }
    const message = item.result.message;
    try {
      assertUsable(message);
      const text = message.content.find((c) => c.type === 'text');
      const parsed = GradeSchema.parse(JSON.parse(text.text));
      results.push({ ticketId, ...parsed, usage: message.usage, model: MODEL });
    } catch (err) {
      results.push({ ticketId, error: err.message });
    }
  }
  return results;
}

const CoachingSchema = z.object({
  summary: z.string(),
  points: z.array(
    z.object({
      criterion_id: z.string(),
      observation: z.string(),
      suggestion: z.string(),
      example_ticket_id: z.string(),
    })
  ),
});
const coachingFormat = zodOutputFormat(CoachingSchema);

async function draftCoaching(agentName, weakCriteria) {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system:
      'You are a support QA coach preparing a short, encouraging 1:1 coaching session. For each weak scorecard criterion, write one observation grounded in the quoted evidence, one concrete suggestion the agent can apply on their next ticket (include example wording), and the ticket id that best illustrates it. Start with a two-sentence summary. Be specific and kind; never shame.',
    messages: [
      {
        role: 'user',
        content: `Agent: ${agentName}\n\nWeakest criteria (from AI + human QA evaluations):\n${JSON.stringify(weakCriteria, null, 2)}`,
      },
    ],
    output_config: { effort: 'low', format: coachingFormat },
  });
  assertUsable(response);
  if (!response.parsed_output) throw new Error('Coaching response did not match the expected schema');
  return { ...response.parsed_output, usage: response.usage, model: MODEL };
}

module.exports = { MODEL, gradeTicket, submitGradingBatch, collectGradingBatch, draftCoaching };
