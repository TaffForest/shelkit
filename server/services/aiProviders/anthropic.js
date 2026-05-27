const Anthropic = require('@anthropic-ai/sdk');
const { AiClientError } = require('../aiClientError');

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16384;

const SYSTEM_PROMPT = `You are a senior web designer generating a complete, production-quality static website from a user description.

OUTPUT FORMAT
- You must respond by calling the emit_site tool. Never respond with prose or code blocks.
- In v1, output exactly one file: index.html. Do not emit separate CSS or JS files.

TECHNICAL CONSTRAINTS
- A single self-contained index.html file. Inline CSS in a <style> block; inline JS in a <script> block if needed.
- Valid HTML5. Include <!DOCTYPE html>, <meta charset>, <meta name="viewport">.
- Tailwind via CDN is allowed: <script src="https://cdn.tailwindcss.com"></script>. No other external scripts or stylesheets except Google Fonts.
- Images: placeholder URLs only — https://picsum.photos/seed/<slug>/<w>/<h>. Never inline base64. Never local paths.
- No build step, no frameworks, no JS libraries beyond Tailwind CDN.
- Mobile-responsive by default. Semantic HTML. Real alt text on every image.

DESIGN QUALITY
- Generous whitespace and a clear vertical rhythm between sections.
- A focused 2–3 colour palette per site, chosen to match the subject — not generic AI gradients.
- Strong typographic hierarchy: one display/heading face plus one supporting body face, no more.
- Avoid generic AI-design tells: no rainbow gradient text, no emoji-in-a-square feature grids, no weak ghost-button CTAs.
- The hero must establish a clear visual hierarchy with a confident headline and a single primary CTA.`;

const EMIT_SITE_TOOL = {
  name: 'emit_site',
  description: 'Emit the complete generated website as a set of files.',
  input_schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        description: 'The files that make up the site. In v1, exactly one entry with path "index.html".',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative file path, e.g. "index.html".' },
            content: { type: 'string', description: 'Full file contents as a string.' },
          },
          required: ['path', 'content'],
        },
      },
      assistant_message: {
        type: 'string',
        description: 'A one-sentence summary of what was built, shown to the user.',
      },
    },
    required: ['files', 'assistant_message'],
  },
};

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new AiClientError('auth', 'ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function getModel() {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

function mapError(err) {
  if (err instanceof AiClientError) return err;
  const status = err?.status;
  if (status === 401 || status === 403) {
    return new AiClientError('auth', 'Authentication with Anthropic failed', err);
  }
  if (status === 429) {
    return new AiClientError('rate_limited', 'Anthropic rate limit hit', err);
  }
  return new AiClientError('unknown', err?.message || 'Anthropic call failed', err);
}

async function callModel(messages) {
  try {
    return await getClient().messages.create({
      model: getModel(),
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [EMIT_SITE_TOOL],
      tool_choice: { type: 'tool', name: 'emit_site' },
      messages,
    });
  } catch (err) {
    throw mapError(err);
  }
}

function parseResponse(response) {
  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'emit_site');
  if (!toolUse) {
    throw new AiClientError('no_tool_call', 'Model did not return a site (no emit_site tool call)');
  }
  const { files, assistant_message } = toolUse.input;
  if (!Array.isArray(files) || files.length === 0) {
    throw new AiClientError('empty_files', 'Model returned no files');
  }
  return { files, assistantMessage: assistant_message || '' };
}

const EDIT_MODE_ADDENDUM = `

Edit mode rules:
- Preserve the existing structure, palette, typography, and voice unless the instruction explicitly asks you to change them.
- Make the minimum change that satisfies the instruction. Do not redesign incidentally.
- Output the COMPLETE updated site (full index.html) via emit_site — not a patch or diff.`;

const RETRY_CODES = new Set(['empty_files', 'no_tool_call']);

/**
 * Run a model call once; on a transient-shape failure (empty_files /
 * no_tool_call), retry once. Logs both the retry attempt and its outcome
 * so success-after-retry is distinguishable from hard failure.
 *
 * @param {() => Promise<object>} fn  The model call returning a SiteResult.
 * @param {string} kind               'generateSite' | 'editSite' (for log lines).
 * @param {string} promptForLog       User prompt or edit instruction, used for prompt_preview.
 */
async function withRetry(fn, kind, promptForLog) {
  let firstError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await fn();
      if (firstError) {
        console.warn(`[ai-retry] succeeded on attempt 2 — first error: ${firstError.code} on ${kind}`);
      }
      return result;
    } catch (err) {
      if (!(err instanceof AiClientError) || !RETRY_CODES.has(err.code)) {
        throw err;
      }
      if (attempt === 1) {
        firstError = err;
        console.warn(`[ai-retry] ${err.code} on ${kind} — attempt 1/2 — model=${getModel()} max_tokens=${MAX_TOKENS} prompt_len=${promptForLog.length}`);
        continue;
      }
      const preview = promptForLog.slice(0, 80).replace(/\s+/g, ' ');
      console.warn(`[ai-retry] ${err.code} on ${kind} — attempt 2/2 — failed — prompt_preview="${preview}${promptForLog.length > 80 ? '...' : ''}"`);
      throw err;
    }
  }
}

async function generateSite({ prompt }) {
  return withRetry(
    async () => parseResponse(await callModel([{ role: 'user', content: prompt }])),
    'generateSite',
    prompt,
  );
}

function buildEditMessages({ instruction, currentFiles, conversation }) {
  const messages = [];
  for (const turn of (conversation || [])) {
    if (turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string') {
      messages.push({ role: turn.role, content: turn.text });
    }
  }
  const filesBlock = currentFiles.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n');
  const userTurn = `Current site (the user is asking you to modify this):\n\n${filesBlock}\n\nInstruction: ${instruction}${EDIT_MODE_ADDENDUM}`;
  messages.push({ role: 'user', content: userTurn });
  return messages;
}

async function editSite({ instruction, currentFiles, conversation }) {
  if (!Array.isArray(currentFiles) || currentFiles.length === 0) {
    throw new AiClientError('unknown', 'editSite requires currentFiles');
  }
  return withRetry(
    async () => parseResponse(await callModel(buildEditMessages({ instruction, currentFiles, conversation }))),
    'editSite',
    instruction,
  );
}

module.exports = { generateSite, editSite, getModel };
