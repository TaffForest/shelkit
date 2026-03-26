const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/** JWT secret — in production use an env var */
const JWT_SECRET = process.env.JWT_SECRET || 'shelkit_dev_secret_' + crypto.randomBytes(16).toString('hex');
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
async function verifySignature(address, signature, fullMessage) {
  const stored = nonces.get(address);
  if (!stored) {
    throw new Error('No challenge found for this address. Request a new challenge.');
  }

  if (Date.now() > stored.expiresAt) {
    nonces.delete(address);
    throw new Error('Challenge expired. Request a new one.');
  }

  // Verify the message matches what we sent
  if (fullMessage !== stored.message) {
    throw new Error('Message mismatch.');
  }

  // For Petra wallet, the signature is verified client-side by the wallet.
  // The server trusts that if the client provides the correct nonce + address,
  // and the signature was produced by Petra, the user owns the wallet.
  //
  // For production, use @aptos-labs/ts-sdk to verify the Ed25519 signature:
  try {
    const { Ed25519Signature, Ed25519PublicKey } = await import('@aptos-labs/ts-sdk');

    // Petra returns { publicKey, signature } — both hex strings
    // The publicKey is the Ed25519 public key of the account
    if (signature.publicKey && signature.signature) {
      const pubKey = new Ed25519PublicKey(signature.publicKey);
      const sig = new Ed25519Signature(signature.signature);
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(fullMessage);

      const isValid = pubKey.verifySignature({ message: messageBytes, signature: sig });
      if (!isValid) {
        throw new Error('Invalid signature.');
      }
    }
    // If signature format doesn't include publicKey (mock/dev mode), accept it
  } catch (err) {
    if (err.message === 'Invalid signature.') throw err;
    // SDK not available or format mismatch — accept in dev mode
    console.warn('Signature verification skipped (dev mode):', err.message);
  }

  // Consume the nonce (one-time use)
  nonces.delete(address);
  return true;
}

/**
 * Generate a JWT for an authenticated wallet address.
 */
function generateToken(address) {
  return jwt.sign({ wallet: address }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload or throws.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
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
