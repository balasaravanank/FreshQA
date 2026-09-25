(function () {
  const { esc, rampColor, inkOn, reasonBadges, scoreText, optionLabel, criteriaOf, money, toast } = UI;
  const { icon } = Icon;
  const isNil = (v) => v === null || v === undefined;
  const view = document.getElementById('view');
  let reviewer = 'Coach';
  let current = 'dashboard';

  const TAB_ICONS = { dashboard: 'dashboard', queue: 'inbox', appeals: 'flag', coaching: 'graduation', scorecard: 'clipboard' };

  function initChrome() {
    document.getElementById('brand-icon').innerHTML = icon('shield', { size: 16 });
    document.querySelectorAll('.tab').forEach((btn) => {
      const iconName = TAB_ICONS[btn.dataset.tab];
      if (iconName && !btn.querySelector('.icon')) btn.insertAdjacentHTML('afterbegin', icon(iconName, { size: 15 }));
    });
  }

  function statusIcon(kind) {
    const map = { pass: 'check', fail: 'x', na: 'dash' };
    return `<span class="status-icon ${kind}">${icon(map[kind] || 'dash', { size: 11 })}</span>`;
  }

  function initials(name) {
    return (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  function avatar(name) {
    return `<span class="avatar" title="${esc(name)}">${esc(initials(name))}</span>`;
  }

  function rankBadge(i) {
    if (i === 0) return `<span class="rank-badge gold">${icon('award', { size: 16 })}</span>`;
    if (i === 1) return `<span class="rank-badge silver">${icon('award', { size: 16 })}</span>`;
    if (i === 2) return `<span class="rank-badge bronze">${icon('award', { size: 16 })}</span>`;
    return `<span class="rank-badge">${i + 1}</span>`;
  }

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

  function emptyState(iconName, message) {
    return `<div class="empty">${icon(iconName, { size: 34 })}<div>${esc(message)}</div></div>`;
  }

  async function render() {
    view.innerHTML = `<div class="empty">${icon('clock', { size: 28 })}<div>Loading…</div></div>`;
    try {
      await ({ dashboard, queue, appeals, coaching, scorecard })[current]();
    } catch (err) {
      view.innerHTML = emptyState('triangle', `Could not load: ${err.message}`);
    }
  }

  // ---------------- Dashboard ----------------

  function tile(iconName, tone, label, value, sub) {
    return `<div class="tile">
      <div class="tile-top"><span class="tile-icon ${tone}">${icon(iconName, { size: 15 })}</span></div>
      <div class="label">${esc(label)}</div>
      <div class="value num">${value}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>`;
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
      view.innerHTML = emptyState('inbox', 'No tickets graded yet. Tickets are graded automatically when they are resolved.');
      return;
    }

    const scoredCriteria = criteriaOf(card.definition);
    const tiles = [
      tile('dashboard', '', 'Tickets graded by AI', o.evaluated_tickets, 'Every resolved ticket'),
      tile('trending', 'good', 'QA coverage', `${o.ai_coverage_pct}%`, `Manual QA ≈ ${o.manual_qa_coverage_pct}% (${o.manual_equivalent_tickets} ${o.manual_equivalent_tickets === 1 ? 'ticket' : 'tickets'})`),
      tile('star', '', 'Average QA score', isNil(o.average_score) ? '–' : `${o.average_score}%`, 'Final score after human review'),
      tile('octagon', o.auto_fails ? 'critical' : '', 'Auto-fails', o.auto_fails ? `<span class="status-critical">${icon('octagon', { size: 15 })}${o.auto_fails}</span>` : '0', 'Compliance violations'),
      tile('inbox', o.review_queue ? 'warning' : '', 'Needs human review', o.review_queue, `${o.open_appeals} open appeals`),
      tile('users', '', 'AI–human alignment', isNil(o.ai_human_alignment_pct) ? '–' : `${o.ai_human_alignment_pct}%`, `${o.reviews} human reviews`),
      tile(
        'dollar',
        '',
        'AI cost per ticket',
        cost.graded_calls ? money(cost.cost_per_ticket_usd, 4) : '–',
        cost.graded_calls
          ? `≈ ${money(cost.projected_cost_per_agent_month_usd)} per agent / month · market ≈ $${cost.benchmarks.market_per_agent_month_usd}`
          : 'No billed AI calls yet'
      ),
    ].join('');

    const leaderboard = agents
      .map((a, i) => {
        const tone = a.average_score >= 80 ? 'bar-good' : a.average_score < 40 ? 'bar-critical' : '';
        return `<tr>
          <td>${rankBadge(i)}</td>
          <td><div class="person">${avatar(a.agent_name)}<span class="name">${esc(a.agent_name)}</span></div></td>
          <td class="num">${a.tickets}</td>
          <td><div class="bar-cell"><div class="bar-track" title="${esc(a.agent_name)}: ${a.average_score}%"><div class="bar ${tone}" style="width:${Math.min(100, Math.max(0, a.average_score))}%"></div></div><span class="num">${a.average_score}%</span></div></td>
          <td class="num">${a.auto_fails ? `<span class="status-critical">${icon('octagon', { size: 13 })}${a.auto_fails}</span>` : '0'}</td>
          <td class="secondary">${a.weakest_criterion ? `${esc(a.weakest_criterion.question)} <span class="num">(${a.weakest_criterion.average_pct}%)</span>` : '–'}</td>
        </tr>`;
      })
      .join('');

    const heatHead = scoredCriteria.map(({ criterion }) => `<th title="${esc(criterion.question)}">${esc(criterion.id.replace(/_/g, ' '))}</th>`).join('');
    const heatRows = breakdown.agents
      .map((a) => {
        const cells = a.criteria
          .map((c) => {
            const q = scoredCriteria.find((x) => x.criterion.id === c.criterion_id);
            const title = `${a.agent_name} · ${q ? q.criterion.question : c.criterion_id}: ${isNil(c.average_pct) ? 'n/a' : c.average_pct + '%'}`;
            return `<td style="background:${rampColor(c.average_pct)};color:${inkOn(c.average_pct)}" title="${esc(title)}">${isNil(c.average_pct) ? '–' : Math.round(c.average_pct)}</td>`;
          })
          .join('');
        return `<tr><th style="text-align:right">${esc(a.agent_name)}</th>${cells}</tr>`;
      })
      .join('');

    const alignRows = align.criteria
      .filter((c) => !isNil(c.alignment_pct))
      .map(
        (c) => `<tr><td>${esc(c.question)}</td><td><div class="bar-cell"><div class="bar-track" title="${c.alignment_pct}% over ${c.reviews} reviews"><div class="bar" style="width:${c.alignment_pct}%"></div></div><span class="num">${c.alignment_pct}%</span></div></td></tr>`
      )
      .join('');

    view.innerHTML = `
      <div class="tiles">${tiles}</div>
      <div class="card"><h2>${icon('users', { size: 15, className: 'icon-badge' })}Agents</h2>
        <table><thead><tr><th></th><th>Agent</th><th>Tickets</th><th style="width:26%">Average QA score</th><th>Auto-fails</th><th>Weakest criterion</th></tr></thead><tbody>${leaderboard}</tbody></table>
      </div>
      <div class="card"><h2>${icon('dashboard', { size: 15, className: 'icon-badge' })}Criterion breakdown by agent</h2>
        <p class="muted">Average % of points per criterion. Compliance checks show the pass rate.</p>
        <div class="heatmap-wrap"><table class="heatmap"><thead><tr><th></th>${heatHead}</tr></thead><tbody>${heatRows}</tbody></table></div>
        <div class="legend-ramp">0%<span class="swatch"></span>100%</div>
      </div>
      <div class="card"><h2>${icon('trending', { size: 15, className: 'icon-badge' })}AI–human alignment by criterion</h2>
        ${alignRows ? `<table><tbody>${alignRows}</tbody></table>` : '<p class="muted">Alignment appears after a coach reviews AI-graded tickets in the review queue.</p>'}
      </div>`;
  }

  // ---------------- Review queue & grade view ----------------

  async function queue() {
    const [items] = await Promise.all([QA.get('/queue'), refreshCounts()]);
    if (!items.length) {
      view.innerHTML = emptyState('check', "The review queue is empty. Nothing needs a human right now.");
      return;
    }
    view.innerHTML = `<div class="card"><h2>${icon('inbox', { size: 15, className: 'icon-badge' })}Needs human review</h2>
      <p class="muted">AI graded every ticket. Only auto-fails, low scores, low-confidence answers, appeals and a small calibration sample land here.</p>
      <table><thead><tr><th>Ticket</th><th>Agent</th><th>Score</th><th>Why it's here</th><th></th></tr></thead><tbody>
      ${items
        .map(
          (e) => `<tr class="clickable" data-ticket="${esc(e.ticket_id)}">
            <td><b>#${esc(e.ticket_id)}</b><div class="secondary">${esc(e.subject)}</div></td>
            <td><div class="person">${avatar(e.agent_name)}<span class="name">${esc(e.agent_name)}</span></div></td>
            <td class="num">${scoreText(e)}</td><td>${reasonBadges(e.queue_reasons)}</td>
            <td style="color:var(--muted)">${icon('chevronRight', { size: 16 })}</td></tr>`
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

  function criterionStatusKind(criterion, optionId) {
    if (optionId === 'na') return 'na';
    const option = criterion.options.find((o) => o.id === optionId);
    if (!option) return 'na';
    if (option.autoFail) return 'fail';
    const max = Math.max(...criterion.options.map((o) => o.points));
    return option.points >= max ? 'pass' : option.points > 0 ? 'na' : 'fail';
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
        const sectionIcon = section.type === 'auto_fail' ? 'shield' : section.type === 'bonus' ? 'star' : 'dashboard';
        const heading = section.id !== lastSection
          ? `<div class="section-title">${icon(sectionIcon, { size: 13 })}${esc(section.name)}${section.type === 'auto_fail' ? ' · auto-fail' : section.type === 'bonus' ? ' · bonus' : ''}</div>`
          : '';
        lastSection = section.id;
        const confIcon = { high: 'check', medium: 'dash', low: 'triangle' }[ai.confidence] || 'dash';
        return `${heading}<div class="criterion">
          <div class="q">${statusIcon(criterionStatusKind(criterion, answer.option_id))}<span class="qtext">${esc(criterion.question)}</span></div>
          <div class="evidence">“${esc(answer.evidence || ai.evidence || '')}”</div>
          <div class="row">${optionSelect(criterion, answer.option_id)}
            <span class="muted">AI: ${esc(optionLabel(criterion, ai.option_id))}</span>
            ${ai.confidence ? `<span class="conf-${esc(ai.confidence)}">${icon(confIcon, { size: 12 })}${esc(ai.confidence)} confidence</span>` : ''}
          </div>
          ${appeal ? `<div class="card" style="margin:10px 0 0;background:var(--warning-soft);border-color:transparent"><b>${icon('flag', { size: 13 })} Appeal:</b> ${esc(appeal.reason)}
            <div class="row" style="margin-top:8px">${optionSelect(criterion, answer.option_id).replace('data-criterion', 'data-appeal-option')}
              <button class="primary" data-accept="${appeal.id}">${icon('check', { size: 14 })}Accept with this answer</button>
              <button class="danger" data-reject="${appeal.id}">${icon('x', { size: 14 })}Reject</button></div></div>` : ''}
        </div>`;
      })
      .join('');

    view.innerHTML = `
      <div class="row" style="margin-bottom:14px"><button class="ghost" id="back">${icon('arrowLeft', { size: 15 })}Back to queue</button>
        <h2 style="margin:0">#${esc(e.ticket_id)} · ${esc(e.subject)}</h2><span class="spacer"></span>
        <span>AI score <b class="num">${esc(e.ai_score)}%</b> · Final <b class="num">${scoreText(e)}</b></span></div>
      <div class="grade">
        <div class="card"><h3>${icon('message', { size: 13 })}Conversation · ${esc(e.channel)} · ${esc(e.agent_name)}</h3>
          ${e.transcript.map((t) => `<div class="turn ${t.speaker}"><span class="turn-avatar">${icon(t.speaker === 'agent' ? 'user' : 'users', { size: 13 })}</span><div><div class="who">${t.speaker === 'agent' ? esc(e.agent_name) : 'Customer'}</div><div class="turn-bubble">${esc(t.body)}</div></div></div>`).join('')}
          <p class="secondary"><b>${icon('sparkles', { size: 13 })} AI summary:</b> ${esc(e.summary)}</p>
          ${e.reviews.length ? `<p class="muted">Reviewed ${e.reviews.length}× · last by ${esc(e.reviews[e.reviews.length - 1].reviewer)} · AI–human alignment ${esc(e.reviews[e.reviews.length - 1].alignment)}%</p>` : ''}
        </div>
        <div class="card"><h3>${icon('clipboard', { size: 13 })}Scorecard (pre-filled by AI, v${esc(e.scorecard_version)})</h3>
          ${criteriaHtml}
          <div style="margin-top:14px"><textarea id="comment" rows="2" placeholder="Comment for the agent (optional)"></textarea></div>
          <div class="row" style="margin-top:10px"><span class="muted">Reviewer: ${esc(reviewer)}</span><span class="spacer"></span>
            <button class="primary" id="save-review">${icon('check', { size: 14 })}Confirm review</button></div>
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
      view.innerHTML = emptyState('flag', 'No appeals yet. Agents can appeal any criterion from the ticket sidebar.');
      return;
    }
    view.innerHTML = `<div class="card"><h2>${icon('flag', { size: 15, className: 'icon-badge' })}Appeals</h2><table><thead><tr><th>Ticket</th><th>Agent</th><th>Criterion</th><th>Reason</th><th>Status</th></tr></thead><tbody>
      ${list
        .map(
          (a) => `<tr class="clickable" data-ticket="${esc(a.ticket_id)}"><td><b>#${esc(a.ticket_id)}</b><div class="secondary">${esc(a.subject)}</div></td>
          <td><div class="person">${avatar(a.agent_name)}<span class="name">${esc(a.agent_name)}</span></div></td><td>${esc(a.criterion_id)}</td><td>${esc(a.reason)}</td>
          <td>${a.status === 'open' ? `<span class="badge badge-warning">${icon('clock', { size: 12 })}Open</span>` : `<span class="badge ${a.status === 'accepted' ? 'badge-good' : ''}">${esc(a.status)}</span> <span class="muted">${esc(a.resolution || '')}</span>`}</td></tr>`
        )
        .join('')}</tbody></table><p class="muted">Open an appeal to resolve it in the grade view.</p></div>`;
    view.querySelectorAll('tr[data-ticket]').forEach((tr) => tr.addEventListener('click', () => gradeView(tr.dataset.ticket)));
  }

  // ---------------- Coaching ----------------

  async function coaching() {
    const [agents, sessions] = await Promise.all([QA.get('/reports/agents'), QA.get('/coaching')]);
    view.innerHTML = `
      <div class="card"><h2>${icon('sparkles', { size: 15, className: 'icon-badge' })}Draft a coaching session</h2>
        <div class="row"><select id="agent">${agents.map((a) => `<option value="${esc(a.agent_id)}">${esc(a.agent_name)} · ${a.average_score}%</option>`).join('')}</select>
          <button class="primary" id="draft">${icon('sparkles', { size: 14 })}Draft with AI</button></div>
        <div id="draft-area"></div>
      </div>
      <div class="card"><h2>${icon('graduation', { size: 15, className: 'icon-badge' })}Coaching history</h2>
        ${sessions.length ? sessions.map((s) => `<div class="criterion"><div class="person">${avatar(s.agent_name)}<b>${esc(s.agent_name)}</b></div><span class="muted">${esc(s.created_at)}</span>
          <ul>${s.points.map((p) => `<li><b>${esc(p.criterion_id)}</b>: ${esc(p.suggestion)}</li>`).join('')}</ul>${s.notes ? `<div class="secondary">${esc(s.notes)}</div>` : ''}</div>`).join('') : emptyState('graduation', 'No sessions saved yet.')}
      </div>`;

    document.getElementById('draft').onclick = async () => {
      const area = document.getElementById('draft-area');
      area.innerHTML = `<p class="muted">${icon('sparkles', { size: 13 })} Drafting from this agent's weakest criteria…</p>`;
      try {
        const d = await QA.post('/coaching/draft', { agent_id: document.getElementById('agent').value });
        area.innerHTML = `<p>${esc(d.summary)}</p>
          ${d.points.map((p, i) => `<div class="criterion"><div class="q"><span class="qtext">${esc(p.criterion_id)} · example ticket #${esc(p.example_ticket_id)}</span></div>
            <div class="secondary">${esc(p.observation)}</div><textarea rows="2" data-point="${i}">${esc(p.suggestion)}</textarea></div>`).join('')}
          <textarea id="notes" rows="2" placeholder="Session notes"></textarea>
          <div class="row" style="margin-top:10px"><span class="spacer"></span><button class="primary" id="save-session">${icon('check', { size: 14 })}Save session</button></div>`;
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
        area.innerHTML = `<p class="status-critical">${icon('triangle', { size: 14 })}${esc(err.message)}</p>`;
      }
    };
  }

  // ---------------- Scorecard ----------------

  async function scorecard() {
    const [active, history] = await Promise.all([QA.get('/scorecards/active'), QA.get('/scorecards')]);
    const def = active.definition;
    view.innerHTML = `
      <div class="grid-2">
        <div class="card"><h2>${icon('clipboard', { size: 15, className: 'icon-badge' })}${esc(def.name)} <span class="muted" style="font-weight:500">v${active.version} · ${esc(def.scoringMethod.replace('_', ' '))}</span></h2>
          ${def.sections.map((s) => {
            const sIcon = s.type === 'auto_fail' ? 'shield' : s.type === 'bonus' ? 'star' : 'dashboard';
            return `<div class="section-title">${icon(sIcon, { size: 13 })}${esc(s.name)} <span class="badge">${esc(s.type.replace('_', '-'))}</span>${s.weight ? ` <span class="muted">weight ${s.weight}</span>` : ''}</div>
            ${s.criteria.map((c) => `<div class="criterion"><div class="q"><span class="qtext">${esc(c.question)}</span></div>
              <div class="muted">${c.options.map((o) => `${esc(o.label)} ${o.points}${o.autoFail ? ` ${icon('octagon', { size: 12 })}` : ''}`).join(' · ')}${c.allowNA ? ' · N/A' : ''}</div>
              <div class="secondary" style="font-size:12px">AI instruction: ${esc(c.aiInstruction || '–')}</div></div>`).join('')}`;
          }).join('')}
          <p class="muted">Versions: ${history.map((h) => `v${h.version}`).join(', ')}. Existing evaluations keep the version they were graded with.</p>
        </div>
        <div class="card"><h2>${icon('sparkles', { size: 15, className: 'icon-badge' })}Edit scorecard (JSON)</h2>
          <p class="muted">Sections: standard, bonus, auto_fail. Saving creates a new version used for newly resolved tickets.</p>
          <textarea id="json" rows="30" style="font-family:ui-monospace,monospace;font-size:12px">${esc(JSON.stringify(def, null, 2))}</textarea>
          <div class="row" style="margin-top:10px"><span class="spacer"></span><button class="primary" id="save-card">${icon('check', { size: 14 })}Validate & save new version</button></div>
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

  initChrome();
  QA.init().then(async () => {
    reviewer = await QA.currentUserName();
    render();
  });
})();
