(function () {
  const { esc, optionLabel, criteriaOf, toast } = UI;
  const { icon } = Icon;
  const root = document.getElementById('root');

  async function ticketId() {
    if (QA.isPreview()) return new URLSearchParams(location.search).get('ticket');
    const { ticket } = await QA.client().data.get('ticket');
    return String(ticket.id);
  }

  function scoreColor(score, autoFailed) {
    if (autoFailed) return 'var(--critical)';
    if (score >= 80) return 'var(--good)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--critical)';
  }

  function scoreRing(score, autoFailed) {
    const clamped = Math.max(0, Math.min(100, score));
    const r = 30;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - clamped / 100);
    const color = scoreColor(score, autoFailed);
    return `
      <svg width="72" height="72" viewBox="0 0 72 72" class="score-ring">
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--grid)" stroke-width="7"/>
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 36 36)"
          style="transition: stroke-dashoffset 0.6s ease"/>
      </svg>`;
  }

  function criterionStatusKind(criterion, optionId) {
    if (optionId === 'na') return 'na';
    const option = criterion.options.find((o) => o.id === optionId);
    if (!option) return 'na';
    if (option.autoFail) return 'fail';
    const max = Math.max(...criterion.options.map((o) => o.points));
    return option.points >= max ? 'pass' : option.points > 0 ? 'na' : 'fail';
  }

  function statusIcon(kind) {
    const map = { pass: 'check', fail: 'x', na: 'dash' };
    return `<span class="status-icon ${kind}">${icon(map[kind] || 'dash', { size: 11 })}</span>`;
  }

  async function render(id) {
    let e;
    try {
      e = await QA.get(`/evaluations/ticket/${encodeURIComponent(id)}`);
    } catch (err) {
      root.innerHTML = `<div class="empty">${icon('inbox', { size: 30 })}<div>Not graded yet.<br>Tickets are graded automatically when they are resolved.</div></div>`;
      return;
    }
    const byId = new Map(e.final_answers.map((a) => [a.criterion_id, a]));
    const appealed = new Map(e.appeals.map((a) => [a.criterion_id, a]));

    root.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div class="score-ring-wrap">
          <div style="position:relative;width:72px;height:72px">
            ${scoreRing(e.final_score, e.auto_failed)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center" class="score-ring-value num">${Math.round(e.final_score)}%</div>
          </div>
          <div>
            <div class="score-ring-label">${e.auto_failed ? `<span class="status-critical">${icon('octagon', { size: 13 })}Auto-fail</span>` : e.reviewed ? `${icon('check', { size: 13 })} Reviewed by a coach` : `${icon('sparkles', { size: 13 })} Graded by AI`}</div>
          </div>
        </div>
        <p class="secondary" style="margin-top:10px">${esc(e.summary)}</p>
      </div>
      <div class="card">
        <h3>${icon('clipboard', { size: 12 })}Scorecard</h3>
        ${criteriaOf(e.scorecard)
          .map(({ criterion }) => {
            const answer = byId.get(criterion.id) || {};
            const appeal = appealed.get(criterion.id);
            return `<div class="criterion">
              <div class="q">${statusIcon(criterionStatusKind(criterion, answer.option_id))}<span class="qtext">${esc(criterion.question)}</span></div>
              <div><b>${esc(optionLabel(criterion, answer.option_id))}</b></div>
              ${answer.evidence ? `<div class="evidence">“${esc(answer.evidence)}”</div>` : ''}
              ${appeal
                ? `<span class="badge ${appeal.status === 'accepted' ? 'badge-good' : appeal.status === 'rejected' ? '' : 'badge-warning'}">${icon('flag', { size: 12 })}Appeal ${esc(appeal.status)}</span>`
                : `<button class="ghost" data-appeal="${esc(criterion.id)}">${icon('flag', { size: 13 })}Appeal</button>`}
            </div>`;
          })
          .join('')}
      </div>`;

    root.querySelectorAll('[data-appeal]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const box = document.createElement('div');
        box.innerHTML = `<textarea rows="3" placeholder="Why should this be changed?"></textarea>
          <div class="row" style="margin-top:6px"><button class="primary">${icon('send', { size: 13 })}Submit appeal</button><button class="ghost">Cancel</button></div>`;
        btn.replaceWith(box);
        const [submit, cancel] = box.querySelectorAll('button');
        cancel.onclick = () => render(id);
        submit.onclick = async () => {
          try {
            await QA.post('/appeals', { evaluation_id: e.id, criterion_id: btn.dataset.appeal, reason: box.querySelector('textarea').value });
            toast('Appeal sent to your QA coach');
            render(id);
          } catch (err) {
            toast(err.message, true);
          }
        };
      })
    );
  }

  QA.init().then(async () => {
    const id = await ticketId();
    if (!id) {
      root.innerHTML = `<div class="empty">${icon('inbox', { size: 30 })}<div>Preview: add ?ticket=&lt;ticket id&gt; to the URL.</div></div>`;
      return;
    }
    render(id);
  });
})();
