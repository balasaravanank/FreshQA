(function () {
  const { esc, rampColor, inkOn, reasonBadges, scoreText, optionLabel, criteriaOf, money, toast } = UI;
  const view = document.getElementById('view');
  let reviewer = 'Coach';
  let current = 'dashboard';

  function setTab(tab) {
    current = tab;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    render();
  }

  async function refreshCounts() {
    const o = await QA.get('/reports/overview');
    document.getElementById('queue-count').textContent = o.review_queue;
    document.getElementById('appeal-count').textContent = o.open_appeals;
    return o;
  }

  async function render() {
    view.innerHTML = '<div class="empty">Loading…</div>';
    try {
      await ({ dashboard, queue, appeals, coaching, scorecard })[current]();
    } catch (err) {
      view.innerHTML = `<div class="empty">Could not load: ${esc(err.message)}</div>`;
    }
  }

  // ---------------- Dashboard ----------------

  function tile(label, value, sub) {
    return `<div class="tile"><div class="label">${esc(label)}</div><div class="value num">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  }

  async function dashboard() {
    const [o, agents, breakdown, align, cost, card] = await Promise.all([
      refreshCounts(),
      QA.get('/reports/agents'),
      QA.get('/reports/breakdown'),
      QA.get('/reports/alignment'),
      QA.get('/reports/cost'),
      QA.get('/scorecards/active'),
    ]);

    if (o.evaluated_tickets === 0) {
      view.innerHTML = '<div class="empty">No tickets graded yet. Tickets are graded automatically when they are resolved.</div>';
      return;
    }

    const scoredCriteria = criteriaOf(card.definition);
    const tiles = [
      tile('Tickets graded by AI', o.evaluated_tickets, 'Every resolved ticket'),
      tile('QA coverage', `${o.ai_coverage_pct}%`, `Manual QA ≈ ${o.manual_qa_coverage_pct}% (${o.manual_equivalent_tickets} ${o.manual_equivalent_tickets === 1 ? 'ticket' : 'tickets'})`),
      tile('Average QA score', o.average_score == null ? '–' : `${o.average_score}%`, 'Final score after human review'),
      tile('Auto-fails', o.auto_fails ? `<span class="status-critical">⛔ ${o.auto_fails}</span>` : '0', 'Compliance violations'),
      tile('Needs human review', o.review_queue, `${o.open_appeals} open appeals`),
      tile('AI–human alignment', o.ai_human_alignment_pct == null ? '–' : `${o.ai_human_alignment_pct}%`, `${o.reviews} human reviews`),
      tile(
        'AI cost per ticket',
        cost.graded_calls ? money(cost.cost_per_ticket_usd, 4) : '–',
        cost.graded_calls
          ? `≈ ${money(cost.projected_cost_per_agent_month_usd)} per agent / month · market ≈ $${cost.benchmarks.market_per_agent_month_usd}`
          : 'No billed AI calls yet'
      ),
    ].join('');

    const leaderboard = agents
      .map(
        (a) => `<tr>
          <td class="name">${esc(a.agent_name)}</td>
          <td class="num">${a.tickets}</td>
          <td><div class="bar-cell"><div class="bar-track" title="${esc(a.agent_name)}: ${a.average_score}%"><div class="bar" style="width:${Math.min(100, a.average_score)}%"></div></div><span class="num">${a.average_score}%</span></div></td>
          <td class="num">${a.auto_fails ? `<span class="status-critical">⛔ ${a.auto_fails}</span>` : '0'}</td>
          <td class="secondary">${a.weakest_criterion ? `${esc(a.weakest_criterion.question)} <span class="num">(${a.weakest_criterion.average_pct}%)</span>` : '–'}</td>
        </tr>`
      )
      .join('');

    const heatHead = scoredCriteria.map(({ criterion }) => `<th title="${esc(criterion.question)}">${esc(criterion.id.replace(/_/g, ' '))}</th>`).join('');
    const heatRows = breakdown.agents
      .map((a) => {
        const cells = a.criteria
          .map((c) => {
            const q = scoredCriteria.find((x) => x.criterion.id === c.criterion_id);
            const title = `${a.agent_name} · ${q ? q.criterion.question : c.criterion_id}: ${c.average_pct == null ? 'n/a' : c.average_pct + '%'}`;
            return `<td style="background:${rampColor(c.average_pct)};color:${inkOn(c.average_pct)}" title="${esc(title)}">${c.average_pct == null ? '–' : Math.round(c.average_pct)}</td>`;
          })
          .join('');
        return `<tr><th style="text-align:right">${esc(a.agent_name)}</th>${cells}</tr>`;
      })
      .join('');

    const alignRows = align.criteria
      .filter((c) => c.alignment_pct != null)
      .map(
        (c) => `<tr><td>${esc(c.question)}</td><td><div class="bar-cell"><div class="bar-track" title="${c.alignment_pct}% over ${c.reviews} reviews"><div class="bar" style="width:${c.alignment_pct}%"></div></div><span class="num">${c.alignment_pct}%</span></div></td></tr>`
      )
      .join('');

    view.innerHTML = `
      <div class="tiles">${tiles}</div>
      <div class="card"><h2>Agents</h2>
        <table><thead><tr><th>Agent</th><th>Tickets</th><th style="width:30%">Average QA score</th><th>Auto-fails</th><th>Weakest criterion</th></tr></thead><tbody>${leaderboard}</tbody></table>
      </div>
      <div class="card"><h2>Criterion breakdown by agent</h2>
        <p class="muted">Average % of points per criterion. Compliance checks show the pass rate.</p>
        <div style="overflow-x:auto"><table class="heatmap"><thead><tr><th></th>${heatHead}</tr></thead><tbody>${heatRows}</tbody></table></div>
        <div class="legend-ramp">0%<span class="swatch"></span>100%</div>
      </div>
      <div class="card"><h2>AI–human alignment by criterion</h2>
        ${alignRows ? `<table><tbody>${alignRows}</tbody></table>` : '<p class="muted">Alignment appears after a coach reviews AI-graded tickets in the review queue.</p>'}
      </div>`;
  }

  // ---------------- Review queue & grade view ----------------

  async function queue() {
    const [items] = await Promise.all([QA.get('/queue'), refreshCounts()]);
    if (!items.length) {
      view.innerHTML = '<div class="empty">The review queue is empty. Nothing needs a human right now.</div>';
      return;
    }
    view.innerHTML = `<div class="card"><h2>Needs human review</h2>
      <p class="muted">AI graded every ticket. Only auto-fails, low scores, low-confidence answers, appeals and a small calibration sample land here.</p>
      <table><thead><tr><th>Ticket</th><th>Agent</th><th>Score</th><th>Why it's here</th></tr></thead><tbody>
      ${items
        .map(
          (e) => `<tr class="clickable" data-ticket="${esc(e.ticket_id)}">
            <td><b>#${esc(e.ticket_id)}</b><div class="secondary">${esc(e.subject)}</div></td>
            <td>${esc(e.agent_name)}</td><td class="num">${scoreText(e)}</td><td>${reasonBadges(e.queue_reasons)}</td></tr>`
        )
        .join('')}</tbody></table></div>`;
    view.querySelectorAll('tr[data-ticket]').forEach((tr) => tr.addEventListener('click', () => gradeView(tr.dataset.ticket)));
  }

  function optionSelect(criterion, selected) {
    const options = criterion.options.map((o) => `<option value="${esc(o.id)}" ${o.id === selected ? 'selected' : ''}>${esc(o.label)} (${o.points} pts${o.autoFail ? ', auto-fail' : ''})</option>`);
    if (criterion.allowNA) options.push(`<option value="na" ${selected === 'na' ? 'selected' : ''}>N/A</option>`);
    if (!selected) options.unshift('<option value="" selected>Choose…</option>');
    return `<select data-criterion="${esc(criterion.id)}">${options.join('')}</select>`;
  }

  async function gradeView(ticketId) {
    const e = await QA.get(`/evaluations/ticket/${encodeURIComponent(ticketId)}`);
    const openAppeals = e.appeals.filter((a) => a.status === 'open');
    const byId = new Map(e.final_answers.map((a) => [a.criterion_id, a]));
    const aiById = new Map(e.ai_answers.map((a) => [a.criterion_id, a]));

    let lastSection = null;
    const criteriaHtml = criteriaOf(e.scorecard)
      .map(({ section, criterion }) => {
        const answer = byId.get(criterion.id) || {};
        const ai = aiById.get(criterion.id) || {};
        const appeal = openAppeals.find((a) => a.criterion_id === criterion.id);
        const heading = section.id !== lastSection ? `<div class="section-title">${esc(section.name)}${section.type === 'auto_fail' ? ' · auto-fail' : section.type === 'bonus' ? ' · bonus' : ''}</div>` : '';
        lastSection = section.id;
        return `${heading}<div class="criterion">
          <div class="q">${esc(criterion.question)}</div>
          <div class="evidence">“${esc(answer.evidence || ai.evidence || '')}”</div>
          <div class="row">${optionSelect(criterion, answer.option_id)}
            <span class="muted">AI: ${esc(optionLabel(criterion, ai.option_id))}</span>
            ${ai.confidence ? `<span class="conf-${esc(ai.confidence)}">${esc(ai.confidence)} confidence</span>` : ''}
          </div>
          ${appeal ? `<div class="card" style="margin:8px 0 0;background:var(--warning-bg)"><b>Appeal:</b> ${esc(appeal.reason)}
            <div class="row" style="margin-top:6px">${optionSelect(criterion, answer.option_id).replace('data-criterion', 'data-appeal-option')}
              <button class="primary" data-accept="${appeal.id}">Accept with this answer</button>
              <button class="danger" data-reject="${appeal.id}">Reject</button></div></div>` : ''}
        </div>`;
      })
      .join('');

    view.innerHTML = `
      <div class="row" style="margin-bottom:12px"><button id="back">← Back to queue</button>
        <h2 style="margin:0">#${esc(e.ticket_id)} · ${esc(e.subject)}</h2><span class="spacer"></span>
        <span>AI score <b class="num">${esc(e.ai_score)}%</b> · Final <b class="num">${scoreText(e)}</b></span></div>
      <div class="grade">
        <div class="card"><h3>Conversation · ${esc(e.channel)} · ${esc(e.agent_name)}</h3>
          ${e.transcript.map((t) => `<div class="turn ${t.speaker}"><div class="who">${t.speaker === 'agent' ? esc(e.agent_name) : 'Customer'}</div>${esc(t.body)}</div>`).join('')}
          <p class="secondary"><b>AI summary:</b> ${esc(e.summary)}</p>
          ${e.reviews.length ? `<p class="muted">Reviewed ${e.reviews.length}× · last by ${esc(e.reviews[e.reviews.length - 1].reviewer)} · AI–human alignment ${esc(e.reviews[e.reviews.length - 1].alignment)}%</p>` : ''}
        </div>
        <div class="card"><h3>Scorecard (pre-filled by AI, v${esc(e.scorecard_version)})</h3>
          ${criteriaHtml}
          <div style="margin-top:12px"><textarea id="comment" rows="2" placeholder="Comment for the agent (optional)"></textarea></div>
          <div class="row" style="margin-top:8px"><span class="muted">Reviewer: ${esc(reviewer)}</span><span class="spacer"></span>
            <button class="primary" id="save-review">Confirm review</button></div>
        </div>
      </div>`;

    document.getElementById('back').onclick = () => setTab('queue');
    document.getElementById('save-review').onclick = async () => {
      const answers = [...view.querySelectorAll('select[data-criterion]')].map((s) => ({ criterion_id: s.dataset.criterion, option_id: s.value }));
      try {
        const updated = await QA.post('/reviews', { evaluation_id: e.id, reviewer, answers, comment: document.getElementById('comment').value });
        toast(`Review saved · final score ${updated.final_score}%`);
        setTab('queue');
      } catch (err) {
        toast(err.message, true);
      }
    };
    view.querySelectorAll('[data-accept]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const select = btn.parentElement.querySelector('select[data-appeal-option]');
        try {
          await QA.patch(`/appeals/${btn.dataset.accept}`, { status: 'accepted', option_id: select.value, reviewer, resolution: 'Accepted in review' });
          toast('Appeal accepted');
          gradeView(ticketId);
        } catch (err) {
          toast(err.message, true);
        }
      })
    );
    view.querySelectorAll('[data-reject]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await QA.patch(`/appeals/${btn.dataset.reject}`, { status: 'rejected', reviewer, resolution: 'Rejected in review' });
          toast('Appeal rejected');
          gradeView(ticketId);
        } catch (err) {
          toast(err.message, true);
        }
      })
    );
  }

  // ---------------- Appeals ----------------

  async function appeals() {
    const [list] = await Promise.all([QA.get('/appeals'), refreshCounts()]);
    if (!list.length) {
      view.innerHTML = '<div class="empty">No appeals yet. Agents can appeal any criterion from the ticket sidebar.</div>';
      return;
    }
    view.innerHTML = `<div class="card"><h2>Appeals</h2><table><thead><tr><th>Ticket</th><th>Agent</th><th>Criterion</th><th>Reason</th><th>Status</th></tr></thead><tbody>
      ${list
        .map(
          (a) => `<tr class="clickable" data-ticket="${esc(a.ticket_id)}"><td><b>#${esc(a.ticket_id)}</b><div class="secondary">${esc(a.subject)}</div></td>
          <td>${esc(a.agent_name)}</td><td>${esc(a.criterion_id)}</td><td>${esc(a.reason)}</td>
          <td>${a.status === 'open' ? '<span class="badge">Open</span>' : `<span class="badge">${esc(a.status)}</span> <span class="muted">${esc(a.resolution || '')}</span>`}</td></tr>`
        )
        .join('')}</tbody></table><p class="muted">Open an appeal to resolve it in the grade view.</p></div>`;
    view.querySelectorAll('tr[data-ticket]').forEach((tr) => tr.addEventListener('click', () => gradeView(tr.dataset.ticket)));
  }

  // ---------------- Coaching ----------------

  async function coaching() {
    const [agents, sessions] = await Promise.all([QA.get('/reports/agents'), QA.get('/coaching')]);
    view.innerHTML = `
      <div class="card"><h2>Draft a coaching session</h2>
        <div class="row"><select id="agent">${agents.map((a) => `<option value="${esc(a.agent_id)}">${esc(a.agent_name)} · ${a.average_score}%</option>`).join('')}</select>
          <button class="primary" id="draft">Draft with AI</button></div>
        <div id="draft-area"></div>
      </div>
      <div class="card"><h2>Coaching history</h2>
        ${sessions.length ? sessions.map((s) => `<div class="criterion"><b>${esc(s.agent_name)}</b> <span class="muted">${esc(s.created_at)}</span>
          <ul>${s.points.map((p) => `<li><b>${esc(p.criterion_id)}</b>: ${esc(p.suggestion)}</li>`).join('')}</ul>${s.notes ? `<div class="secondary">${esc(s.notes)}</div>` : ''}</div>`).join('') : '<p class="muted">No sessions saved yet.</p>'}
      </div>`;

    document.getElementById('draft').onclick = async () => {
      const area = document.getElementById('draft-area');
      area.innerHTML = '<p class="muted">Drafting from this agent\'s weakest criteria…</p>';
      try {
        const d = await QA.post('/coaching/draft', { agent_id: document.getElementById('agent').value });
        area.innerHTML = `<p>${esc(d.summary)}</p>
          ${d.points.map((p, i) => `<div class="criterion"><div class="q">${esc(p.criterion_id)} · example ticket #${esc(p.example_ticket_id)}</div>
            <div class="secondary">${esc(p.observation)}</div><textarea rows="2" data-point="${i}">${esc(p.suggestion)}</textarea></div>`).join('')}
          <textarea id="notes" rows="2" placeholder="Session notes"></textarea>
          <div class="row" style="margin-top:8px"><span class="spacer"></span><button class="primary" id="save-session">Save session</button></div>`;
        document.getElementById('save-session').onclick = async () => {
          const points = d.points.map((p, i) => ({ ...p, suggestion: area.querySelector(`[data-point="${i}"]`).value }));
          try {
            await QA.post('/coaching', { agent_id: d.agent_id, agent_name: d.agent_name, points, notes: document.getElementById('notes').value, evaluation_ids: d.evaluation_ids });
            toast('Coaching session saved');
            coaching();
          } catch (err) {
            toast(err.message, true);
          }
        };
      } catch (err) {
        area.innerHTML = `<p class="status-critical">${esc(err.message)}</p>`;
      }
    };
  }

  // ---------------- Scorecard ----------------

  async function scorecard() {
    const [active, history] = await Promise.all([QA.get('/scorecards/active'), QA.get('/scorecards')]);
    const def = active.definition;
    view.innerHTML = `
      <div class="grid-2">
        <div class="card"><h2>${esc(def.name)} <span class="muted">v${active.version} · ${esc(def.scoringMethod.replace('_', ' '))}</span></h2>
          ${def.sections.map((s) => `<div class="section-title">${esc(s.name)} <span class="badge">${esc(s.type.replace('_', '-'))}</span>${s.weight ? ` <span class="muted">weight ${s.weight}</span>` : ''}</div>
            ${s.criteria.map((c) => `<div class="criterion"><div class="q">${esc(c.question)}</div>
              <div class="muted">${c.options.map((o) => `${esc(o.label)} ${o.points}${o.autoFail ? ' ⛔' : ''}`).join(' · ')}${c.allowNA ? ' · N/A' : ''}</div>
              <div class="secondary" style="font-size:12px">AI instruction: ${esc(c.aiInstruction || '–')}</div></div>`).join('')}`).join('')}
          <p class="muted">Versions: ${history.map((h) => `v${h.version}`).join(', ')}. Existing evaluations keep the version they were graded with.</p>
        </div>
        <div class="card"><h2>Edit scorecard (JSON)</h2>
          <p class="muted">Sections: standard, bonus, auto_fail. Saving creates a new version used for newly resolved tickets.</p>
          <textarea id="json" rows="30" style="font-family:ui-monospace,monospace;font-size:12px">${esc(JSON.stringify(def, null, 2))}</textarea>
          <div class="row" style="margin-top:8px"><span class="spacer"></span><button class="primary" id="save-card">Validate & save new version</button></div>
        </div>
      </div>`;
    document.getElementById('save-card').onclick = async () => {
      let parsed;
      try {
        parsed = JSON.parse(document.getElementById('json').value);
      } catch (err) {
        toast('Invalid JSON: ' + err.message, true);
        return;
      }
      try {
        const saved = await QA.put('/scorecards/active', parsed);
        toast(`Saved scorecard v${saved.version}`);
        scorecard();
      } catch (err) {
        toast(err.message, true);
      }
    };
  }

  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (btn) setTab(btn.dataset.tab);
  });

  QA.init().then(async () => {
    reviewer = await QA.currentUserName();
    render();
  });
})();
