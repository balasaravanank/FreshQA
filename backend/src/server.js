const path = require('path');
const express = require('express');
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, grader: config.grader }));
app.use('/api', apiRoutes);

// Browser preview of the FDK app screens (coach workspace + agent sidebar) without the FDK CLI.
app.use('/preview', express.static(path.join(__dirname, '..', '..', 'fdk-app', 'app')));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message, details: err.details });
});

app.listen(config.port, () => {
  console.log(`Native QA backend on http://localhost:${config.port} (grader: ${config.grader})`);
  console.log(`Preview: http://localhost:${config.port}/preview/workspace.html`);
});
