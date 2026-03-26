const { verifyToken } = require('../services/auth');

/**
 * Express middleware that requires a valid JWT.
 * Attaches req.wallet (the wallet address) on success.
 * Returns 401 if token is missing or invalid.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Connect your wallet.' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    req.wallet = decoded.wallet;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please reconnect your wallet.' });
  }
}

module.exports = requireAuth;
