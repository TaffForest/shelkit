const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const requireAuth = require('../middleware/requireAuth');
const aiClient = require('../services/aiClient');
const previewStore = require('../services/buildPreviewStore');

const router = express.Router();

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

/** POST /api/build/generate — generate a new site from a prompt */
router.post('/generate', requireAuth, async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Prompt is too long (max 4000 chars).' });
  }

  try {
    const { files, assistantMessage } = await aiClient.generateSite({ prompt: prompt.trim() });

    const fileMap = {};
    for (const f of files) {
      if (!f.path || typeof f.content !== 'string') continue;
      const normalised = f.path.replace(/^\/+/, '');
      if (normalised.includes('..') || path.isAbsolute(normalised)) continue;
      fileMap[normalised] = f.content;
    }

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
    console.error('Build generate error:', err);
    res.status(500).json({ error: err.message || 'Generation failed.' });
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
