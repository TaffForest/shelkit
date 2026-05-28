// Smoke test: drive /api/build/generate (and optionally /api/build/edit) with a test JWT.
// Usage:
//   node scripts/test-build.js                                  — default complex prompt, generate only
//   node scripts/test-build.js "<prompt>"                       — custom prompt, generate only
//   node scripts/test-build.js "<prompt>" --edit "<instruction>"  — generate then edit
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true, quiet: true });
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'shelkit_dev_secret_change_me';
const TEST_WALLET = '0xSMOKETEST0000000000000000000000000000000000000000000000000000000';
const PORT = process.env.PORT || 3000;

const args = process.argv.slice(2);
const editIdx = args.indexOf('--edit');
const editInstruction = editIdx > -1 ? args[editIdx + 1] : null;
const positional = editIdx > -1 ? args.slice(0, editIdx) : args;
const prompt = positional[0] || 'A clean teal-and-charcoal landing page for an indie coffee roaster. Use Tailwind utility classes for layout — flex containers, generous padding (p-12), centered hero with a large headline. Single primary CTA button.';

const token = jwt.sign({ wallet: TEST_WALLET }, SECRET, { expiresIn: '5m' });

async function call(endpoint, body) {
  const res = await fetch(`http://localhost:${PORT}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { rawBody: text }; }
  return { status: res.status, ...data };
}

(async () => {
  console.log('--- GENERATE ---');
  const gen = await call('/api/build/generate', { prompt });
  console.log(JSON.stringify(gen, null, 2));
  if (gen.status !== 200) process.exit(1);

  if (editInstruction) {
    console.log('--- EDIT ---');
    const conversation = [
      { role: 'user', text: prompt },
      { role: 'assistant', text: gen.assistantMessage || '' },
    ];
    const edit = await call('/api/build/edit', {
      sessionId: gen.sessionId,
      instruction: editInstruction,
      conversation,
    });
    console.log(JSON.stringify(edit, null, 2));
    if (edit.status !== 200) process.exit(1);
  }
})();
