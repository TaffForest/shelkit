const express = require('express');
const path = require('path');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { nanoid } = require('nanoid');
const requireAuth = require('../middleware/requireAuth');
const aiClient = require('../services/aiClient');
const previewStore = require('../services/buildPreviewStore');

const router = express.Router();

/** Per-wallet rate limit for the model-burning endpoints. 15 calls / 10 min
 * comfortably covers a normal session (1 generate + ~10 edits) without
 * throttling legitimate iteration; caps abuse at ~90/hr/wallet. */
const buildRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by wallet (set by requireAuth above this middleware); fall back
  // to IP for defence-in-depth if anyone reorders middleware.
  // ipKeyGenerator is required for IPv6 safety in express-rate-limit v8.
  // Passing req.ip directly throws ERR_ERL_KEY_GEN_IPV6 at registration —
  // server starts but middleware is silently not attached. Diagnostic
  // signal: no RateLimit-* headers on responses.
  keyGenerator: (req) => req.wallet || ipKeyGenerator(req),
  message: {
    error: 'Too many requests in a short period. Wait a few minutes and try again.',
    code: 'rate_limited_client',
  },
});

/** Translate a thrown error from the AI client into an HTTP response.
 * Provider-specific shapes are normalised to AiClientError upstream; here
 * we just pick the right status + a sanitised, user-facing message. */
function errorResponse(res, err) {
  if (!(err instanceof aiClient.AiClientError)) {
    console.error('Build route unknown error:', err);
    return res.status(500).json({
      error: 'Something went wrong. Try again, or check the server logs.',
      code: 'unknown',
    });
  }
  console.error(`Build route AiClientError code=${err.code}:`, err.message, err.cause?.message || '');
  switch (err.code) {
    case 'auth':
      return res.status(500).json({
        error: 'Service misconfigured — contact support.',
        code: 'auth',
      });
    case 'rate_limited':
      return res.status(429).json({
        error: 'Anthropic rate limit hit. Wait a moment and try again.',
        code: 'rate_limited',
      });
    case 'empty_files':
    case 'no_tool_call':
      return res.status(502).json({
        error: 'The model returned an unexpected response. Try again — usually transient.',
        code: err.code,
      });
    default:
      return res.status(500).json({
        error: 'Something went wrong. Try again, or check the server logs.',
        code: 'unknown',
      });
  }
}

const MIME_TYPES = {
  '.html': 'text/html', '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

const PREVIEW_CSP =
  "sandbox allow-scripts; " +
  "default-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com https://picsum.photos https://*.picsum.photos data:; " +
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' https: data:; " +
  "connect-src 'none'; " +
  "frame-ancestors 'self'";

/** Normalise the model's files array into a path-keyed map, rejecting path traversal. */
function filesToMap(files) {
  const fileMap = {};
  for (const f of files) {
    if (!f.path || typeof f.content !== 'string') continue;
    const normalised = f.path.replace(/^\/+/, '');
    if (normalised.includes('..') || path.isAbsolute(normalised)) continue;
    fileMap[normalised] = f.content;
  }
  return fileMap;
}

/** POST /api/build/generate — generate a new site from a prompt */
router.post('/generate', requireAuth, buildRateLimit, async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Prompt is too long (max 4000 chars).' });
  }

  try {
    const { files, assistantMessage } = await aiClient.generateSite({ prompt: prompt.trim() });
    const fileMap = filesToMap(files);
    if (!fileMap['index.html']) {
      return res.status(502).json({ error: 'Generated site is missing index.html.' });
    }

    const sessionId = nanoid(16);
    previewStore.set(sessionId, fileMap, req.wallet);

    res.json({
      sessionId,
      previewUrl: `/api/build/preview/${sessionId}/index.html`,
      files: Object.keys(fileMap),
      assistantMessage,
    });
  } catch (err) {
    errorResponse(res, err);
  }
});

/** POST /api/build/edit — modify the site in an existing session */
router.post('/edit', requireAuth, buildRateLimit, async (req, res) => {
  const { sessionId, instruction, conversation } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required.' });
  }
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return res.status(400).json({ error: 'Instruction is required.' });
  }
  if (instruction.length > 4000) {
    return res.status(400).json({ error: 'Instruction is too long (max 4000 chars).' });
  }

  const session = previewStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired. Start a new generation.' });
  }
  if (session.wallet && session.wallet !== req.wallet) {
    return res.status(403).json({ error: 'Not authorised for this session.' });
  }

  const currentFiles = Object.entries(session.files).map(([p, content]) => ({ path: p, content }));

  try {
    const { files, assistantMessage } = await aiClient.editSite({
      instruction: instruction.trim(),
      currentFiles,
      conversation: Array.isArray(conversation) ? conversation : [],
    });
    const fileMap = filesToMap(files);
    if (!fileMap['index.html']) {
      return res.status(502).json({ error: 'Edited site is missing index.html.' });
    }

    previewStore.set(sessionId, fileMap, req.wallet);

    res.json({
      sessionId,
      previewUrl: `/api/build/preview/${sessionId}/index.html`,
      files: Object.keys(fileMap),
      assistantMessage,
    });
  } catch (err) {
    errorResponse(res, err);
  }
});

/** GET /api/build/preview/:sessionId/* — serve generated files (public, session-id gated) */
router.get('/preview/:sessionId/*', (req, res) => {
  const { sessionId } = req.params;
  const requestedPath = req.params[0] || 'index.html';
  const normalised = requestedPath.replace(/^\/+/, '') || 'index.html';

  if (normalised.includes('..') || path.isAbsolute(normalised)) {
    return res.status(400).send('Bad path');
  }

  const content = previewStore.getFile(sessionId, normalised);
  if (content == null) {
    return res.status(404).send('Not found');
  }

  const ext = path.extname(normalised).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Security-Policy', PREVIEW_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.send(content);
});

module.exports = router;
