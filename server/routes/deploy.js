const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const EventEmitter = require('events');
const { nanoid } = require('nanoid');
const { extractZip } = require('../services/extractor');
const { uploadFile, downloadFile, isRealAPI } = require('../services/shelpin');
const { isBuildable, runBuild } = require('../services/builder');
const { cloneRepo, isValidGithubUrl, parseGithubUrl } = require('../services/github');
const store = require('../services/store');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/** Allowed static file extensions for serving */
const ALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.jsx', '.ts',
  '.json', '.xml', '.txt', '.csv', '.md',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.wasm', '.map',
  '.mp4', '.webm', '.ogg', '.mp3', '.wav',
  '.pdf', '.zip',
  '.webmanifest', '.manifest',
]);

/** Max total output size */
const MAX_OUTPUT_SIZE = 100 * 1024 * 1024; // 100MB

/** Per-deployment log emitters for SSE streaming */
const logEmitters = new Map();

/** POST /api/deploy — upload ZIP, extract, (optionally build), pin, return URL */
async function handleDeploy(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a ZIP file.' });
    }

    const deploymentId = nanoid(10);
    const extractDir = path.join(UPLOADS_DIR, deploymentId);

    // Create log emitter for this deployment
    const emitter = new EventEmitter();
    emitter.on('error', () => {}); // Prevent unhandled error throws
    logEmitters.set(deploymentId, emitter);

    const log = (line) => emitter.emit('log', line);

    // 1. Extract ZIP
    log('Extracting ZIP...');
    const { root: siteRoot, files: extractedFiles } = await extractZip(req.file.path, extractDir);

    if (extractedFiles.length === 0) {
      cleanup(deploymentId);
      return res.status(400).json({ error: 'ZIP file is empty or contains no valid files.' });
    }

    log(`Extracted ${extractedFiles.length} files`);

    // 2. Determine if this is a buildable project
    let servableRoot = siteRoot;
    let framework = null;
    let didBuild = false;

    if (isBuildable(siteRoot)) {
      didBuild = true;
      log('');
      log('Detected buildable project (package.json with build script)');

      try {
        const result = await runBuild(siteRoot, log);
        servableRoot = result.outputDir;
        framework = result.framework;
        log('');
        log('Build completed successfully');
      } catch (err) {
        log('');
        log(`BUILD FAILED: ${err.message}`);
        emitter.emit('error', err.message);
        cleanup(deploymentId);
        return res.status(400).json({
          error: `Build failed: ${err.message}`,
          deploymentId,
        });
      }
    }

    // 3. Walk the servable root — only safe static file types
    const finalFiles = walkDir(servableRoot).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ALLOWED_EXTENSIONS.has(ext) || ext === '';
    });

    if (finalFiles.length === 0) {
      log('ERROR: No servable files found in build output');
      cleanup(deploymentId);
      return res.status(400).json({ error: 'Build produced no servable output files.' });
    }

    // Check total output size
    let totalOutputSize = 0;
    for (const f of finalFiles) {
      const stat = fs.statSync(path.join(servableRoot, f));
      totalOutputSize += stat.size;
    }
    if (totalOutputSize > MAX_OUTPUT_SIZE) {
      log(`ERROR: Output size ${(totalOutputSize / (1024 * 1024)).toFixed(1)}MB exceeds limit`);
      cleanup(deploymentId);
      return res.status(400).json({ error: 'Build output exceeds 100MB size limit.' });
    }

    log(`Pinning ${finalFiles.length} files to ShelPin...`);

    // 4. Upload each file to ShelPin
    const fileCIDs = {};
    for (const relPath of finalFiles) {
      const fullPath = path.join(servableRoot, relPath);
      const cid = await uploadFile(fullPath);
      fileCIDs[relPath] = cid;
    }

    log('All files pinned');

    // 5. Generate root CID
    const allCIDs = Object.values(fileCIDs).sort().join(':');
    const rootCID = 'bafy_root_' + crypto.createHash('sha256').update(allCIDs).digest('hex').slice(0, 16);

    // 6. Generate subdomain
    const subdomain = req.body?.subdomain || deploymentId.toLowerCase();

    // 7. Store deployment (with wallet address from auth)
    const deployment = {
      id: deploymentId,
      rootCID,
      files: fileCIDs,
      extractDir: servableRoot,
      fileList: finalFiles,
      fileCount: finalFiles.length,
      subdomain,
      framework,
      didBuild,
      wallet: req.wallet || null,
      createdAt: new Date().toISOString(),
      usingRealAPI: isRealAPI(),
    };
    store.save(deployment);

    // 8. Clean up uploaded ZIP
    fs.unlinkSync(req.file.path);

    log('Deployment complete');
    emitter.emit('done');

    // Clean up emitter after a delay
    setTimeout(() => cleanup(deploymentId), 30000);

    const url = `/deploy/${deploymentId}`;
    res.json({
      deploymentId,
      url,
      rootCID,
      fileCount: finalFiles.length,
      subdomain,
      framework,
      didBuild,
    });
  } catch (err) {
    console.error('Deploy error:', err);
    res.status(500).json({ error: 'Deployment failed: ' + err.message });
  }
}

/** GET /api/deploy/logs/:id — SSE stream of build logs */
function streamLogs(req, res) {
  const { id } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write('data: {"type":"connected"}\n\n');

  const emitter = logEmitters.get(id);
  if (!emitter) {
    res.write('data: {"type":"done"}\n\n');
    res.end();
    return;
  }

  const onLog = (line) => {
    res.write(`data: ${JSON.stringify({ type: 'log', line })}\n\n`);
  };

  const onError = (message) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  };

  const onDone = () => {
    res.write('data: {"type":"done"}\n\n');
    res.end();
  };

  emitter.on('log', onLog);
  emitter.on('error', onError);
  emitter.on('done', onDone);

  req.on('close', () => {
    emitter.off('log', onLog);
    emitter.off('error', onError);
    emitter.off('done', onDone);
  });
}

/** GET /deploy/:id/* — serve deployed files */
async function serveDeploy(req, res) {
  const deployment = store.get(req.params.id);
  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  let filePath = req.params[0] || 'index.html';
  if (filePath.endsWith('/')) filePath += 'index.html';

  // Resolve which file to serve (with SPA fallback)
  const resolvedPath = resolveFilePath(deployment, filePath);
  if (!resolvedPath) {
    return res.status(404).json({ error: 'File not found' });
  }

  await serveFile(deployment, resolvedPath, res);
}

/** GET /api/deployments — list deployments for authenticated wallet */
function listDeployments(req, res) {
  // Filter by wallet address (set by requireAuth middleware)
  const source = req.wallet ? store.listByWallet(req.wallet) : store.list();
  const all = source.map(d => ({
    id: d.id,
    rootCID: d.rootCID,
    fileCount: d.fileCount || d.fileList?.length || 0,
    subdomain: d.subdomain,
    framework: d.framework,
    didBuild: d.didBuild,
    version: d.version || 1,
    createdAt: d.createdAt,
  }));
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(all);
}

/** Subdomain middleware */
async function subdomainMiddleware(req, res, next) {
  const host = req.hostname;
  const baseDomain = process.env.BASE_DOMAIN || 'shelkit.local';
  if (!host.endsWith(baseDomain) || host === baseDomain) {
    return next();
  }

  const subdomain = host.replace(`.${baseDomain}`, '');
  const deployment = store.findBySubdomain(subdomain);
  if (!deployment) return next();

  let filePath = req.path.slice(1) || 'index.html';
  if (filePath.endsWith('/')) filePath += 'index.html';

  const resolvedPath = resolveFilePath(deployment, filePath);
  if (!resolvedPath) {
    return res.status(404).json({ error: 'File not found' });
  }

  await serveFile(deployment, resolvedPath, res);
}

/** Resolve file path with SPA fallback */
function resolveFilePath(deployment, filePath) {
  const files = deployment.files || {};

  // Normalise path (remove leading slash)
  const normalised = filePath.replace(/^\//, '');

  // Direct match
  if (files[normalised]) return normalised;
  if (files['/' + normalised]) return '/' + normalised;

  // Try with .html extension
  if (files[normalised + '.html']) return normalised + '.html';

  // Check local disk as fallback
  if (deployment.extractDir) {
    const fullPath = path.join(deployment.extractDir, normalised);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return normalised;
    }
  }

  // SPA fallback — serve index.html
  if (files['index.html']) return 'index.html';
  if (files['/index.html']) return '/index.html';

  if (deployment.extractDir) {
    const indexPath = path.join(deployment.extractDir, 'index.html');
    if (fs.existsSync(indexPath)) return 'index.html';
  }

  return null;
}

/** MIME type lookup */
const MIME_TYPES = {
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.csv': 'text/csv', '.md': 'text/markdown',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm', '.map': 'application/json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Serve a file — tries Shelby first, falls back to local disk.
 * Shelby responses are cached locally for performance.
 */
async function serveFile(deployment, filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // 1. Try local disk first (fast path — files are still on disk after deploy)
  if (deployment.extractDir) {
    const fullPath = path.join(deployment.extractDir, filePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Served-From', 'local');
      return res.sendFile(fullPath);
    }
  }

  // 2. Try Shelby network (decentralised fallback)
  const files = deployment.files || {};
  const blobName = files[filePath] || files['/' + filePath];

  if (blobName && isRealAPI()) {
    try {
      const data = await downloadFile(blobName);
      if (data) {
        // Cache locally for next time
        if (deployment.extractDir) {
          const cachePath = path.join(deployment.extractDir, filePath);
          const cacheDir = path.dirname(cachePath);
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(cachePath, data);
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Served-From', 'shelby');
        res.setHeader('X-Blob-Name', blobName);
        return res.send(data);
      }
    } catch (err) {
      console.error(`Shelby download failed for ${blobName}:`, err.message);
    }
  }

  res.status(404).json({ error: 'File not found' });
}

/** Helper: recursively walk a directory */
function walkDir(dir, root = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '__MACOSX' || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, root));
    } else {
      results.push(path.relative(root, fullPath));
    }
  }
  return results;
}

/** Clean up log emitter */
function cleanup(deploymentId) {
  const emitter = logEmitters.get(deploymentId);
  if (emitter) {
    emitter.removeAllListeners();
    logEmitters.delete(deploymentId);
  }
}

/** DELETE /api/deployments/:id — soft delete a deployment */
function deleteDeployment(req, res) {
  const { id } = req.params;
  const deployment = store.get(id);

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.wallet && deployment.wallet !== req.wallet) {
    return res.status(403).json({ error: 'Not authorized to delete this deployment' });
  }

  store.softDelete(id, req.wallet);
  store.cleanupFiles(id);

  res.json({ success: true, message: 'Deployment deleted' });
}

/** GET /api/deployments/:id/versions — list version history */
function listVersions(req, res) {
  const { id } = req.params;
  const deployment = store.get(id);

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.wallet && deployment.wallet !== req.wallet) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const versions = store.getVersions(id);
  res.json(versions);
}

/** POST /api/deployments/:id/rollback — rollback to a specific version */
function rollbackDeployment(req, res) {
  const { id } = req.params;
  const { version } = req.body;

  if (!version) {
    return res.status(400).json({ error: 'Version number is required' });
  }

  const deployment = store.get(id);
  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.wallet && deployment.wallet !== req.wallet) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const updated = store.rollback(id, version);
    res.json({ success: true, deployment: { id: updated.id, version: updated.version, rootCID: updated.rootCID } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/** POST /api/deploy/github — deploy from GitHub repo URL */
async function handleGithubDeploy(req, res) {
  const { repoUrl, branch } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  if (!isValidGithubUrl(repoUrl)) {
    return res.status(400).json({ error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' });
  }

  const deploymentId = nanoid(10);
  const extractDir = path.join(UPLOADS_DIR, deploymentId);

  const emitter = new EventEmitter();
  emitter.on('error', () => {});
  logEmitters.set(deploymentId, emitter);
  const log = (line) => emitter.emit('log', line);

  try {
    const { repo } = parseGithubUrl(repoUrl);
    log(`Cloning ${repo}...`);

    const clonedDir = cloneRepo(repoUrl, extractDir, branch || 'main');
    log('Repository cloned');

    // Same pipeline as ZIP deploy from here
    let servableRoot = clonedDir;
    let framework = null;
    let didBuild = false;

    if (isBuildable(clonedDir)) {
      didBuild = true;
      log('Detected buildable project');
      const result = await runBuild(clonedDir, log);
      servableRoot = result.outputDir;
      framework = result.framework;
      log('Build completed');
    }

    const finalFiles = walkDir(servableRoot).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ALLOWED_EXTENSIONS.has(ext) || ext === '';
    });

    if (finalFiles.length === 0) {
      cleanup(deploymentId);
      return res.status(400).json({ error: 'No servable files found' });
    }

    log(`Pinning ${finalFiles.length} files...`);

    const fileCIDs = {};
    for (const relPath of finalFiles) {
      const fullPath = path.join(servableRoot, relPath);
      const cid = await uploadFile(fullPath);
      fileCIDs[relPath] = cid;
    }

    const allCIDs = Object.values(fileCIDs).sort().join(':');
    const rootCID = 'bafy_root_' + crypto.createHash('sha256').update(allCIDs).digest('hex').slice(0, 16);

    const subdomain = req.body?.subdomain || deploymentId.toLowerCase();

    const deployment = {
      id: deploymentId,
      rootCID,
      files: fileCIDs,
      extractDir: servableRoot,
      fileList: finalFiles,
      fileCount: finalFiles.length,
      subdomain,
      framework,
      didBuild,
      wallet: req.wallet || null,
      createdAt: new Date().toISOString(),
      usingRealAPI: isRealAPI(),
    };
    store.save(deployment);

    log('Deployment complete');
    emitter.emit('done');
    setTimeout(() => cleanup(deploymentId), 30000);

    res.json({
      deploymentId,
      url: `/deploy/${deploymentId}`,
      rootCID,
      fileCount: finalFiles.length,
      subdomain,
      framework,
      didBuild,
      source: 'github',
      repo: repo,
    });
  } catch (err) {
    log(`ERROR: ${err.message}`);
    emitter.emit('done');
    cleanup(deploymentId);
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  handleDeploy, serveDeploy, listDeployments, subdomainMiddleware, streamLogs,
  deleteDeployment, listVersions, rollbackDeployment, handleGithubDeploy,
};
