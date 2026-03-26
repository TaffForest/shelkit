const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SHELBY_API_KEY = process.env.SHELBY_API_KEY || null;
const SHELBY_PRIVATE_KEY = process.env.SHELBY_PRIVATE_KEY || null;
const SHELBY_NETWORK = process.env.SHELBY_NETWORK || 'shelbynet';
const SHELBY_FULLNODE_URL = process.env.SHELBY_FULLNODE_URL || 'https://api.shelbynet.shelby.xyz/v1';
const SHELBY_INDEXER_URL = process.env.SHELBY_INDEXER_URL || 'https://api.shelbynet.aptoslabs.com/nocode/v1/public/cmforrguw0042s601fn71f9l2/v1/graphql';
const BLOB_EXPIRY_DAYS = parseInt(process.env.BLOB_EXPIRY_DAYS || '365', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

let _shelbyClient = null;
let _signer = null;

/**
 * Lazy-init the Shelby SDK client (ESM import).
 * Only created once per process.
 */
async function getShelbyClient() {
  if (_shelbyClient) return { client: _shelbyClient, signer: _signer };

  const { ShelbyNodeClient } = await import('@shelby-protocol/sdk/node');
  const { Network, Ed25519PrivateKey, Account } = await import('@aptos-labs/ts-sdk');

  _shelbyClient = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: SHELBY_API_KEY,
    fullnodeUrl: SHELBY_FULLNODE_URL,
    indexerUrl: SHELBY_INDEXER_URL,
  });

  // Create signer from private key
  const privateKey = new Ed25519PrivateKey(SHELBY_PRIVATE_KEY);
  _signer = Account.fromPrivateKey({ privateKey });

  console.log(`Shelby: connected to ${SHELBY_NETWORK}, account ${_signer.accountAddress.toString().slice(0, 10)}...`);
  return { client: _shelbyClient, signer: _signer };
}

/**
 * Upload a file to Shelby.
 * If SHELBY_PRIVATE_KEY is set, uses the real SDK.
 * Otherwise falls back to a deterministic stub.
 */
async function uploadFile(filePath) {
  if (SHELBY_PRIVATE_KEY) {
    return uploadWithRetry(filePath, MAX_RETRIES);
  }
  return uploadStub(filePath);
}

/** Upload with retry logic */
async function uploadWithRetry(filePath, retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadReal(filePath);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Shelby upload attempt ${attempt} failed: ${err.message}. Retrying...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
    }
  }
}

/** Real Shelby SDK upload */
async function uploadReal(filePath) {
  const { client, signer } = await getShelbyClient();

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blobData = new Uint8Array(fileBuffer);

  // Blob name: shelkit/<hash>/<filename> — unique per file content
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 12);
  const blobName = `shelkit/${hash}/${fileName}`;

  // Expiration: N days from now in microseconds
  const expirationMicros = BigInt(Date.now() + BLOB_EXPIRY_DAYS * 24 * 60 * 60 * 1000) * 1000n;

  await client.upload({
    signer,
    blobName,
    blobData,
    expirationMicros,
  });

  // Return the blob name as our "CID" — used to retrieve later
  return blobName;
}

/**
 * Download a file from Shelby by blob name.
 * Returns a Buffer of the file contents.
 */
async function downloadFile(blobName) {
  if (!SHELBY_PRIVATE_KEY) return null;

  const { client, signer } = await getShelbyClient();

  const result = await client.download({
    account: signer.accountAddress,
    blobName,
  });

  // SDK returns { account, name, readable (ReadableStream), contentLength }
  const chunks = [];
  for await (const chunk of result.readable) {
    chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Stub — deterministic fake CID based on file content */
async function uploadStub(filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  return `bafy_${hash}`;
}

function isRealAPI() {
  return !!SHELBY_PRIVATE_KEY;
}

module.exports = { uploadFile, downloadFile, isRealAPI };
