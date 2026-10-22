'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const pkg = require('../package.json');

let server;
let base;
const state = { shuttingDown: false };

before(async () => {
  delete process.env.APP_VERSION;
  delete process.env.APP_NAME;
  await new Promise((resolve) => {
    server = createApp(state).listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('GET / shows app name and version', async () => {
  const res = await fetch(`${base}/`);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.ok(body.includes('gitops-demo-app'));
  assert.ok(body.includes(pkg.version));
});

test('GET /health returns 200 ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /ready returns 200 when running', async () => {
  const res = await fetch(`${base}/ready`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ready' });
});

test('GET /version defaults to package.json version', async () => {
  const res = await fetch(`${base}/version`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.version, pkg.version);
  assert.equal(body.name, 'gitops-demo-app');
});

test('APP_VERSION and APP_NAME override defaults', async () => {
  process.env.APP_VERSION = '9.9.9';
  process.env.APP_NAME = 'custom-name';
  try {
    const body = await (await fetch(`${base}/version`)).json();
    assert.equal(body.version, '9.9.9');
    assert.equal(body.name, 'custom-name');
  } finally {
    delete process.env.APP_VERSION;
    delete process.env.APP_NAME;
  }
});

test('GET /ready returns 503 while shutting down', async () => {
  state.shuttingDown = true;
  try {
    const res = await fetch(`${base}/ready`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'shutting_down' });
    // liveness must stay green during shutdown
    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally {
    state.shuttingDown = false;
  }
});

test('unknown route returns 404 JSON', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});
