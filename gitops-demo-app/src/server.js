'use strict';

const { createApp } = require('./app');

const PORT = parseInt(process.env.PORT || '3000', 10);
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);

const state = { shuttingDown: false };
const server = createApp(state).listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ msg: 'server_started', port: PORT }));
});

function shutdown(signal) {
  if (state.shuttingDown) return;
  state.shuttingDown = true; // /ready now returns 503
  console.log(JSON.stringify({ msg: 'shutdown_started', signal }));

  // Stop accepting new connections; finish in-flight requests.
  server.close((err) => {
    if (err) {
      console.error(JSON.stringify({ msg: 'shutdown_error', error: err.message }));
      process.exit(1);
    }
    console.log(JSON.stringify({ msg: 'shutdown_complete' }));
    process.exit(0);
  });
  server.closeIdleConnections();

  // Safety net: force exit if connections refuse to drain.
  setTimeout(() => {
    console.error(JSON.stringify({ msg: 'shutdown_forced' }));
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
