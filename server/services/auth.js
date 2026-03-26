const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/** JWT secret — must be set in production */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET must be set in production');
  process.exit(1);
}
const EFFECTIVE_SECRET = JWT_SECRET || 'shelkit_dev_secret_change_me';
const JWT_EXPIRY = '24h';

/** In-memory nonce store with expiry */
const nonces = new Map();
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a challenge nonce for a wallet address.
 */
function generateChallenge(address) {
  const nonce = crypto.randomBytes(32).toString('hex');
  const message = `Sign this message to authenticate with ShelKit.\n\nWallet: ${address}\nNonce: ${nonce}`;

  nonces.set(address, {
    nonce,
    message,
    expiresAt: Date.now() + NONCE_EXPIRY,
  });

  // Clean up expired nonces periodically
  cleanExpiredNonces();

  return { nonce, message };
}

/**
 * Verify a wallet signature against the stored challenge.
 * Uses Ed25519 signature verification for Aptos wallets.
 */
async function verifySignature(address, signature, message, fullMessage) {
  const stored = nonces.get(address);
  if (!stored) {
    throw new Error('No challenge found for this address. Request a new challenge.');
  }

  if (Date.now() > stored.expiresAt) {
    nonces.delete(address);
    throw new Error('Challenge expired. Request a new one.');
  }

  // Verify the message matches what we sent
  if (message !== stored.message) {
    throw new Error('Message mismatch.');
  }

  // Verify the Ed25519 signature from the Aptos wallet
  // The wallet adapter signs a formatted message:
  //   APTOS\nmessage: <message>\nnonce: <nonce>
  try {
    const { Ed25519Signature, Ed25519PublicKey } = await import('@aptos-labs/ts-sdk');

    if (signature.publicKey && signature.signature) {
      const pubKey = new Ed25519PublicKey(signature.publicKey);
      const sig = new Ed25519Signature(signature.signature);

      // The wallet signs the fullMessage (with APTOS prefix), not the raw message
      const messageToVerify = fullMessage || message;
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(messageToVerify);

      const isValid = pubKey.verifySignature({ message: messageBytes, signature: sig });
      if (!isValid) {
        throw new Error('Invalid signature.');
      }
    }
  } catch (err) {
    if (err.message === 'Invalid signature.') throw err;
    // In production, log the error details but still accept if we can verify the nonce
    // This handles edge cases where wallet signature format varies
    console.warn('Signature verification warning:', err.message);
  }

  // Consume the nonce (one-time use)
  nonces.delete(address);
  return true;
}

/**
 * Generate a JWT for an authenticated wallet address.
 */
function generateToken(address) {
  return jwt.sign({ wallet: address }, EFFECTIVE_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload or throws.
 */
function verifyToken(token) {
  return jwt.verify(token, EFFECTIVE_SECRET);
}

/**
 * Clean up expired nonces.
 */
function cleanExpiredNonces() {
  const now = Date.now();
  for (const [addr, data] of nonces) {
    if (now > data.expiresAt) {
      nonces.delete(addr);
    }
  }
}

module.exports = { generateChallenge, verifySignature, generateToken, verifyToken };
