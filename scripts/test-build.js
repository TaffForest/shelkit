// Smoke test: drive /api/build/generate with a test JWT.
// Usage: node scripts/test-build.js "<prompt>"
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'shelkit_dev_secret_change_me';
const TEST_WALLET = '0xSMOKETEST0000000000000000000000000000000000000000000000000000000';
const PORT = process.env.PORT || 3000;
const prompt = process.argv[2] || 'A clean teal-and-charcoal landing page for an indie coffee roaster. Use Tailwind utility classes for layout — flex containers, generous padding (p-12), centered hero with a large headline. Single primary CTA button.';

const token = jwt.sign({ wallet: TEST_WALLET }, SECRET, { expiresIn: '5m' });

(async () => {
  const res = await fetch(`http://localhost:${PORT}/api/build/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { rawBody: text }; }
  console.log(JSON.stringify({ status: res.status, ...data }, null, 2));
})();
