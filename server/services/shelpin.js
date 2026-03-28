const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SHELBY_API_KEY = process.env.SHELBY_API_KEY || null;
const SHELBY_PRIVATE_KEY = process.env.SHELBY_PRIVATE_KEY || null;
const SHELBY_NETWORK = process.env.SHELBY_NETWORK || 'shelbynet';
const SHELBY_FULLNODE_URL = process.env.SHELBY_FULLNODE_URL || 'https://api.shelbynet.shelby.xyz/v1';
const SHELBY_INDEXER_URL = process.env.SHELBY_INDEXER_URL || 'https://api.shelbynet.aptoslabs.com/nocode/v1/public/cmforrguw0042s601fn71f9l2/v1/graphql';
const BLOB_EXPIRY_DAYS = parseInt(process.env.BLOB_EXPIRY_DAYS || '365', 10);
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;
const TX_DELAY = 500; // delay between sequential uploads to avoid mempool conflicts

let _shelbyClient = null;
let _signer = null;
const _uploadedBlobs = new Map(); // hash -> blobName, dedup within process lifetime

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

/** Upload with retry logic — handles mempool conflicts */
async function uploadWithRetry(filePath, retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadReal(filePath);
    } catch (err) {
      const isMempool = err.message?.includes('mempool') || err.message?.includes('sequence_number');
      if (attempt === retries) throw err;
      const delay = isMempool ? RETRY_DELAY * attempt * 2 : RETRY_DELAY * attempt;
      console.warn(`Shelby upload attempt ${attempt}/${retries} failed: ${err.message?.slice(0, 100)}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** Real Shelby SDK upload */
async function uploadReal(filePath) {
  const { client, signer } = await getShelbyClient();

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Blob name: shelkit/<hash>/<filename> — unique per file content
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 12);
  const blobName = `shelkit/${hash}/${fileName}`;

  // Skip if already uploaded (same content = same hash = same blob name)
  if (_uploadedBlobs.has(hash)) {
    console.log(`Shelby: skipping duplicate ${fileName} (${hash})`);
    return _uploadedBlobs.get(hash);
  }

  const blobData = new Uint8Array(fileBuffer);

  // Expiration: N days from now in microseconds
  const expirationMicros = BigInt(Date.now() + BLOB_EXPIRY_DAYS * 24 * 60 * 60 * 1000) * 1000n;

  await client.upload({
    signer,
    blobName,
    blobData,
    expirationMicros,
  });

  _uploadedBlobs.set(hash, blobName);

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

/**
 * Upload multiple files.
 * Uses sequential uploads for real Shelby (to avoid mempool conflicts),
 * parallel batches for stub mode.
 * Returns { [relPath]: blobName } mapping.
 */
async function uploadFilesParallel(files, concurrency = 5, log = () => {}) {
  const results = {};
  let completed = 0;
  const total = files.length;

  if (SHELBY_PRIVATE_KEY) {
    // Real Shelby: sequential to avoid mempool tx conflicts
    for (const { relPath, fullPath } of files) {
      const cid = await uploadFile(fullPath);
      results[relPath] = cid;
      completed++;
      if (completed % 5 === 0 || completed === total) {
        log(`Pinned ${completed}/${total} files`);
      }
      // Small delay between transactions
      if (completed < total) {
        await new Promise(r => setTimeout(r, TX_DELAY));
      }
    }
  } else {
    // Stub mode: parallel is fine
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const promises = batch.map(async ({ relPath, fullPath }) => {
        const cid = await uploadFile(fullPath);
        results[relPath] = cid;
        completed++;
        if (completed % 10 === 0 || completed === total) {
          log(`Pinned ${completed}/${total} files`);
        }
      });
      await Promise.all(promises);
    }
  }

  return results;
}

function isRealAPI() {
  return !!SHELBY_PRIVATE_KEY;
}

module.exports = { uploadFile, uploadFilesParallel, downloadFile, isRealAPI };
