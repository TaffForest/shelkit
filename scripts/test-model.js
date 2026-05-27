// Smoke test: confirm the configured model ID resolves.
// Sends a 10-token "ping" — costs fractions of a cent.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });
const Anthropic = require('@anthropic-ai/sdk');

const candidates = [
  process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6-20251015',
];

(async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('FAIL: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  for (const model of candidates) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      console.log(`OK   ${model}  -> reply: "${res.content[0]?.text?.slice(0,40) || ''}"`);
    } catch (err) {
      const status = err?.status || err?.error?.status || '?';
      const type = err?.error?.error?.type || err?.type || '';
      console.log(`FAIL ${model}  -> ${status} ${type} ${err?.message?.slice(0,80) || ''}`);
    }
  }
})();
