'use strict';

const express = require('express');
const pkg = require('../package.json');

/**
 * Build the Express app. Kept separate from server.js so tests can
 * start it on a random port without touching signal handlers.
 *
 * Configuration (all optional, via environment variables):
 *   APP_NAME     display name            (default: gitops-demo-app)
 *   APP_VERSION  version shown to users  (default: version in package.json)
 *   APP_COLOR    banner colour on home   (default: #2563eb)
 */
function createApp(state = { shuttingDown: false }) {
  const app = express();
  app.disable('x-powered-by');

  const config = () => ({
    name: process.env.APP_NAME || 'gitops-demo-app',
    version: process.env.APP_VERSION || pkg.version,
    color: process.env.APP_COLOR || '#2563eb',
  });

  app.get('/', (_req, res) => {
    const { name, version, color } = config();
    res.type('html').send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${name}</title></head>
<body style="font-family:sans-serif;margin:0">
  <div style="background:${color};color:#fff;padding:2rem">
    <h1>${name}</h1>
    <p>Version: <strong>${version}</strong></p>
  </div>
  <p style="padding:1rem">Try <code>/health</code>, <code>/ready</code>, <code>/version</code></p>
</body>
</html>`);
  });

  // Liveness: is the process alive? Must NOT depend on external systems.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness: should this pod receive traffic? Flips to 503 during shutdown
  // so Kubernetes stops routing to it before the process exits.
  app.get('/ready', (_req, res) => {
    if (state.shuttingDown) {
      return res.status(503).json({ status: 'shutting_down' });
    }
    res.status(200).json({ status: 'ready' });
  });

  app.get('/version', (_req, res) => {
    const { name, version } = config();
    res.json({ name, version, node: process.version, hostname: process.env.HOSTNAME || null });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}

module.exports = { createApp };
