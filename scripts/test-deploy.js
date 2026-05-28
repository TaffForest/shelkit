// Smoke test: generate → ZIP → deploy → verify presence in /api/deployments
// and that the deployed URL serves valid HTML. Mirrors the chat-UI deploy
// flow so a server-side regression that breaks the client deploy path also
// breaks this script.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true, quiet: true });
const jwt = require('jsonwebtoken');
const { zip } = require('fflate');

const SECRET = process.env.JWT_SECRET || 'shelkit_dev_secret_change_me';
const TEST_WALLET = '0xDEPLOYSMOKE0000000000000000000000000000000000000000000000000000';
const PORT = process.env.PORT || 3000;
const PROMPT = 'A minimal coming-soon page for "Deploy Smoke" with a centered headline in monospace.';

const token = jwt.sign({ wallet: TEST_WALLET }, SECRET, { expiresIn: '5m' });

function authed(opts = {}) {
  return { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } };
}

async function jsonPost(endpoint, body) {
  const res = await fetch(`http://localhost:${PORT}${endpoint}`, authed({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function fetchPreview(previewUrl) {
  const res = await fetch(`http://localhost:${PORT}${previewUrl}`);
  return { status: res.status, html: await res.text() };
}

function zipHtml(html) {
  return new Promise((resolve, reject) => {
    zip(
      { 'index.html': new TextEncoder().encode(html) },
      { level: 6 },
      (err, data) => (err ? reject(err) : resolve(data))
    );
  });
}

let failures = 0;
function assert(cond, label) {
  if (cond) console.log(`  ok   ${label}`);
  else { console.log(`  FAIL ${label}`); failures++; }
}

(async () => {
  console.log('--- GENERATE ---');
  const gen = await jsonPost('/api/build/generate', { prompt: PROMPT });
  assert(gen.status === 200, 'generate returned 200');
  assert(!!gen.body.sessionId, 'generate returned a sessionId');
  if (!gen.body.previewUrl) { console.log('aborting — no previewUrl'); process.exit(1); }

  console.log('--- FETCH PREVIEW ---');
  const preview = await fetchPreview(gen.body.previewUrl);
  assert(preview.status === 200, 'preview accessible');
  assert(preview.html.includes('<!DOCTYPE html'), 'preview looks like HTML');

  console.log('--- ZIP + DEPLOY ---');
  const buf = await zipHtml(preview.html);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/zip' }), 'site.zip');

  const deployRes = await fetch(`http://localhost:${PORT}/api/deploy`, authed({
    method: 'POST',
    body: form,
  }));
  const deployBody = await deployRes.json().catch(() => ({}));
  assert(deployRes.status === 200, `deploy returned 200 (got ${deployRes.status})`);
  assert(!!deployBody.deploymentId, 'deploy returned a deploymentId');
  assert(!!deployBody.subdomain, 'deploy returned a subdomain');
  assert(!!deployBody.rootCID, 'deploy returned a rootCID');
  assert(deployBody.fileCount === 1, `deploy reports fileCount=1 (got ${deployBody.fileCount})`);

  if (!deployBody.deploymentId) { console.log('aborting — no deploymentId'); process.exit(1); }

  console.log('--- SERVED FROM /deploy/<id> ---');
  const served = await fetch(`http://localhost:${PORT}/deploy/${deployBody.deploymentId}`);
  const servedHtml = await served.text();
  assert(served.status === 200, 'deployed URL returned 200');
  assert(servedHtml.includes('<!DOCTYPE html'), 'deployed URL serves valid HTML');

  console.log('--- LISTED IN /api/deployments ---');
  const listRes = await fetch(`http://localhost:${PORT}/api/deployments`, authed());
  const list = await listRes.json();
  assert(listRes.status === 200, 'list endpoint returned 200');
  assert(Array.isArray(list) && list.some(d => d.id === deployBody.deploymentId), 'new deployment appears in /api/deployments');

  if (failures > 0) {
    console.log(`\n${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log(`\nDeploy smoke passed. URL: /deploy/${deployBody.deploymentId}`);
})();
