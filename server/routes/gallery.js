const express = require('express');
const { verifyToken } = require('../services/auth');
const store = require('../services/store');

const router = express.Router();

/** Auth middleware — optional, only used on write routes */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });
  req.wallet = payload.address;
  next();
}

/**
 * GET /api/gallery
 * Public list of opt-in deployments, sorted by hits desc.
 */
router.get('/', (req, res) => {
  try {
    const deployments = store.listPublic();
    const BASE_DOMAIN = process.env.BASE_DOMAIN || 'shelkit.forestinfra.com';

    const items = deployments.map(d => ({
      id: d.id,
      subdomain: d.subdomain,
      title: d.title || d.subdomain,
      description: d.description || null,
      framework: d.framework || null,
      hits: d.hits,
      fileCount: d.fileCount,
      createdAt: d.createdAt,
      url: `https://${d.subdomain}.${BASE_DOMAIN}`,
      wallet: d.wallet ? `${d.wallet.slice(0, 6)}...${d.wallet.slice(-4)}` : null,
    }));

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('Gallery fetch error:', err);
    res.status(500).json({ error: 'Failed to load gallery.' });
  }
});

/**
 * POST /api/gallery/:id
 * Toggle a deployment in/out of the public gallery.
 * Body: { public: true/false, title: "My Site", description: "..." }
 */
router.post('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { public: isPublic, title, description } = req.body;

  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: '`public` must be a boolean.' });
  }

  // Validate title length
  if (title && title.length > 60) {
    return res.status(400).json({ error: 'Title must be 60 characters or fewer.' });
  }
  if (description && description.length > 200) {
    return res.status(400).json({ error: 'Description must be 200 characters or fewer.' });
  }

  const deployment = store.get(id);
  if (!deployment) return res.status(404).json({ error: 'Deployment not found.' });
  if (deployment.wallet !== req.wallet) return res.status(403).json({ error: 'Not your deployment.' });

  const ok = store.setPublic(id, req.wallet, isPublic, title, description);
  if (!ok) return res.status(404).json({ error: 'Deployment not found.' });

  res.json({ success: true, public: isPublic });
});

module.exports = router;
