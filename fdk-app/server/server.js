// Freshdesk "Resolved" = 4, "Closed" = 5. The payload's `changes.status` is [old, new];
// accept status names too in case the payload reports labels instead of ids.
const RESOLVED = [4, 5, 'Resolved', 'Closed'];

function post(path, body) {
  return $request.invokeTemplate('qaPost', { context: { path }, body: JSON.stringify(body || {}) });
}

exports = {
  onTicketUpdateHandler: async function (payload) {
    const ticket = payload.data && payload.data.ticket;
    const status = ticket && ticket.changes && ticket.changes.status;
    if (!status || !RESOLVED.includes(status[1])) return;
    try {
      await post('/events/ticket-resolved', { ticket_id: ticket.id });
    } catch (err) {
      console.error('FreshQA: failed to send resolved ticket', ticket.id, err.status, err.response);
    }
  },

  // One recurring job per install: nightly backfill of anything missed, graded via the Batch API.
  onAppInstallHandler: async function () {
    try {
      await $schedule.create({
        name: 'freshqa_nightly_backfill',
        data: {},
        schedule_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        repeat: { time_unit: 'hours', frequency: 24 },
      });
    } catch (err) {
      console.error('FreshQA: could not create backfill schedule', err);
    }
    renderData();
  },

  onScheduledEventHandler: async function () {
    try {
      await post('/events/backfill/collect');
      await post('/events/backfill', { days: 2 });
    } catch (err) {
      console.error('FreshQA: backfill failed', err.status, err.response);
    }
  },
};
