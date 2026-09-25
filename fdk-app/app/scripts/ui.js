window.UI = (function () {
  const REASONS = {
    auto_fail: 'Auto-fail',
    low_score: 'Low score',
    low_confidence: 'Low AI confidence',
    calibration_sample: 'Calibration sample',
    appeal: 'Open appeal',
  };

  // Sequential blue ramp (dataviz reference palette): light = low, dark = high.
  const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];

  function esc(value) {
    const isNil = value === null || value === undefined;
    return String(isNil ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function rampColor(pct) {
    if (pct === null || pct === undefined) return 'transparent';
    const i = Math.min(RAMP.length - 1, Math.max(0, Math.round((pct / 100) * (RAMP.length - 1))));
    return RAMP[i];
  }

  function inkOn(pct) {
    const hasValue = pct !== null && pct !== undefined;
    return hasValue && pct >= 55 ? '#ffffff' : '#0b0b0b';
  }

  function reasonBadges(reasons) {
    return (reasons || [])
      .map((r) => `<span class="badge ${r === 'auto_fail' ? 'badge-critical' : ''}">${r === 'auto_fail' ? Icon.icon('octagon', { size: 12 }) : ''}${esc(REASONS[r] || r)}</span>`)
      .join(' ');
  }

  function scoreText(evaluation) {
    return evaluation.auto_failed
      ? `<span class="status-critical">${Icon.icon('octagon', { size: 14 })}${esc(evaluation.final_score)}% · Auto-fail</span>`
      : `${esc(evaluation.final_score)}%`;
  }

  function optionLabel(criterion, optionId) {
    if (optionId === 'na') return 'N/A';
    const option = criterion.options.find((o) => o.id === optionId);
    return option ? option.label : 'No answer';
  }

  function criteriaOf(scorecard) {
    return scorecard.sections.flatMap((section) => section.criteria.map((criterion) => ({ section, criterion })));
  }

  function money(usd, digits) {
    const isNil = digits === null || digits === undefined;
    return '$' + Number(usd || 0).toFixed(isNil ? 2 : digits);
  }

  function toast(message, isError) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast-error' : '');
    el.innerHTML = Icon.icon(isError ? 'triangle' : 'check', { size: 15 }) + `<span>${esc(message)}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  return { esc, rampColor, inkOn, reasonBadges, scoreText, optionLabel, criteriaOf, money, toast };
})();
