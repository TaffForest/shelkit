// Canonical regression test for edit aesthetic continuity.
// Locks the prompt pair that proved the editSite architecture in Chunk 2;
// asserts the pipeline still threads end-to-end. Structural checks are
// deliberately loose — we're testing the wiring, not the model.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'shelkit_dev_secret_change_me';
const TEST_WALLET = '0xSMOKETEST0000000000000000000000000000000000000000000000000000000';
const PORT = process.env.PORT || 3000;

const CANONICAL_PROMPT = 'A simple personal portfolio site for a freelance illustrator. Warm cream background, brown accents. Hero with name and one-line bio. Three sample artworks below. Contact link in footer.';
const CANONICAL_EDIT = 'Add a testimonials section with three short quotes from clients, between the artworks and the footer.';

const token = jwt.sign({ wallet: TEST_WALLET }, SECRET, { expiresIn: '5m' });

async function call(endpoint, body) {
  const res = await fetch(`http://localhost:${PORT}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function fetchPreview(previewUrl) {
  const res = await fetch(`http://localhost:${PORT}${previewUrl}`);
  return { status: res.status, html: await res.text() };
}

let failures = 0;
function assert(cond, label) {
  if (cond) console.log(`  ok   ${label}`);
  else { console.log(`  FAIL ${label}`); failures++; }
}

(async () => {
  console.log('--- GENERATE ---');
  const gen = await call('/api/build/generate', { prompt: CANONICAL_PROMPT });
  assert(gen.status === 200, 'generate returned 200');
  assert(!!gen.body.sessionId, 'generate returned a sessionId');
  if (!gen.body.sessionId) process.exit(1);

  const preGen = await fetchPreview(gen.body.previewUrl);
  assert(preGen.status === 200, 'pre-edit preview is accessible');
  const preLen = preGen.html.length;

  console.log('--- EDIT ---');
  const edit = await call('/api/build/edit', {
    sessionId: gen.body.sessionId,
    instruction: CANONICAL_EDIT,
    conversation: [
      { role: 'user', text: CANONICAL_PROMPT },
      { role: 'assistant', text: gen.body.assistantMessage || '' },
    ],
  });
  assert(edit.status === 200, 'edit returned 200');
  assert(edit.body.sessionId === gen.body.sessionId, 'edit preserved the same sessionId');

  const postEdit = await fetchPreview(edit.body.previewUrl);
  assert(postEdit.status === 200, 'post-edit preview is accessible');

  // Pipeline-level structural check (loose — not testing model output quality)
  const grew = postEdit.html.length > preLen;
  const hasTestimonialShape = /testimonial|quote|blockquote|client/i.test(postEdit.html);
  assert(grew || hasTestimonialShape, 'edit produced larger HTML or testimonial-shaped content');

  if (failures > 0) {
    console.log(`\n${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('\nContinuity smoke passed.');
})();
