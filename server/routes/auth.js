const express = require('express');
const { generateChallenge, verifySignature, generateToken } = require('../services/auth');

const router = express.Router();

/**
 * POST /api/auth/challenge
 * Request a challenge nonce for wallet authentication.
 * Body: { address: "0x..." }
 */
router.post('/challenge', (req, res) => {
  const { address } = req.body;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  // Basic address validation (Aptos addresses are 0x + 64 hex chars)
  if (!/^0x[a-fA-F0-9]{1,64}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid Aptos wallet address.' });
  }

  const { nonce, message } = generateChallenge(address);
  res.json({ nonce, message });
});

/**
 * POST /api/auth/verify
 * Verify a signed challenge and return a JWT.
 * Body: { address: "0x...", signature: { publicKey, signature }, message: "..." }
 */
router.post('/verify', async (req, res) => {
  const { address, signature, message } = req.body;

  if (!address || !signature || !message) {
    return res.status(400).json({ error: 'Address, signature, and message are required.' });
  }

  try {
    await verifySignature(address, signature, message);
    const token = generateToken(address);

    res.json({
      token,
      wallet: address,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
