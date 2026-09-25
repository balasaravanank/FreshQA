(function () {
  const { esc, scoreText, optionLabel, criteriaOf, toast } = UI;
  const root = document.getElementById('root');

  async function ticketId() {
    if (QA.isPreview()) return new URLSearchParams(location.search).get('ticket');
    const { ticket } = await QA.client().data.get('ticket');
    return String(ticket.id);
  }

  async function render(id) {
    let e;
    try {
      e = await QA.get(`/evaluations/ticket/${encodeURIComponent(id)}`);
    } catch (err) {
      root.innerHTML = `<div class="empty">Not graded yet.<br>Tickets are graded automatically when they are resolved.</div>`;
      return;
    }
    const byId = new Map(e.final_answers.map((a) => [a.criterion_id, a]));
    const appealed = new Map(e.appeals.map((a) => [a.criterion_id, a]));

    root.innerHTML = `
      <h3>QA score</h3>
      <div class="score num">${scoreText(e)}</div>
      <p class="secondary">${esc(e.summary)}</p>
      ${e.reviewed ? '<p class="muted">Reviewed by a QA coach.</p>' : '<p class="muted">Graded by AI.</p>'}
      ${criteriaOf(e.scorecard)
        .map(({ criterion }) => {
          const answer = byId.get(criterion.id) || {};
          const appeal = appealed.get(criterion.id);
          return `<div class="criterion">
            <div class="q">${esc(criterion.question)}</div>
            <div><b>${esc(optionLabel(criterion, answer.option_id))}</b></div>
            ${answer.evidence ? `<div class="evidence">“${esc(answer.evidence)}”</div>` : ''}
            ${appeal
              ? `<span class="badge">Appeal ${esc(appeal.status)}</span>`
              : `<button data-appeal="${esc(criterion.id)}">Appeal</button>`}
          </div>`;
        })
        .join('')}`;

    root.querySelectorAll('[data-appeal]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const box = document.createElement('div');
        box.innerHTML = `<textarea rows="3" placeholder="Why should this be changed?"></textarea>
          <div class="row" style="margin-top:4px"><button class="primary">Submit appeal</button><button>Cancel</button></div>`;
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
      root.innerHTML = '<div class="empty">Preview: add ?ticket=&lt;ticket id&gt; to the URL.</div>';
      return;
    }
    render(id);
  });
})();
