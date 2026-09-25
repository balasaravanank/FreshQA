const path = require('path');
const express = require('express');
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, grader: config.grader }));
app.use('/api', apiRoutes);

// Browser preview of the FDK app screens (coach workspace + agent sidebar) without the FDK CLI.
// The preview is served by this same backend and only reachable by whoever can already reach
// this server, so handing it the API secret here doesn't weaken the protection /api relies on
// against unrelated traffic hitting a public (e.g. ngrok) URL directly.
app.get('/preview/config.js', (req, res) => {
  res.type('application/javascript').send(`window.QA_PREVIEW_SECRET = ${JSON.stringify(config.apiSecret)};`);
});
app.use('/preview', express.static(path.join(__dirname, '..', '..', 'fdk-app', 'app')));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message, details: err.details });
});

app.listen(config.port, () => {
  console.log(`FreshQA backend on http://localhost:${config.port} (grader: ${config.grader})`);
  console.log(`Preview: http://localhost:${config.port}/preview/workspace.html`);
});
