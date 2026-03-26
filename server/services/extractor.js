const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

/** Safety limits */
const MAX_EXTRACTED_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_FILE_COUNT = 5000;
const BLOCKED_CHARS = /[\x00-\x1f]/; // null bytes + control chars

/**
 * Extract a ZIP file to a target directory with security checks.
 * - Rejects path traversal entries
 * - Skips symlinks
 * - Enforces size and file count limits
 * - Blocks filenames with control characters
 */
async function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });

  const absDestDir = path.resolve(destDir);
  let totalSize = 0;
  let fileCount = 0;

  const directory = await unzipper.Open.file(zipPath);

  for (const entry of directory.files) {
    const entryPath = entry.path;

    // Skip directories (they'll be created when we write files)
    if (entry.type === 'Directory') continue;

    // Block control characters in filenames
    if (BLOCKED_CHARS.test(entryPath)) {
      throw new Error(`Blocked: filename contains control characters: ${entryPath}`);
    }

    // Skip __MACOSX and dotfiles
    if (entryPath.includes('__MACOSX') || path.basename(entryPath).startsWith('.')) {
      continue;
    }

    // Path traversal check
    const resolvedPath = path.resolve(destDir, entryPath);
    if (!resolvedPath.startsWith(absDestDir + path.sep) && resolvedPath !== absDestDir) {
      throw new Error(`Blocked: path traversal detected in ZIP entry: ${entryPath}`);
    }

    // Skip symlinks (check type string only — bitwise attrs unreliable in JS)
    if (entry.type === 'SymbolicLink') {
      continue;
    }

    // File count limit
    fileCount++;
    if (fileCount > MAX_FILE_COUNT) {
      throw new Error(`Blocked: ZIP contains more than ${MAX_FILE_COUNT} files`);
    }

    // Size tracking
    totalSize += entry.uncompressedSize || 0;
    if (totalSize > MAX_EXTRACTED_SIZE) {
      throw new Error(`Blocked: extracted size exceeds ${MAX_EXTRACTED_SIZE / (1024 * 1024)}MB limit`);
    }

    // Create parent directory and write file
    const fileDir = path.dirname(resolvedPath);
    fs.mkdirSync(fileDir, { recursive: true });

    const content = await entry.buffer();
    fs.writeFileSync(resolvedPath, content);
  }

  const effectiveRoot = findEffectiveRoot(destDir);
  return { root: effectiveRoot, files: walkDir(effectiveRoot) };
}

/**
 * If destDir contains exactly one subdirectory and no files, return that subdirectory.
 */
function findEffectiveRoot(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.name !== '__MACOSX' && !e.name.startsWith('.'));

  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(dir, entries[0].name);
  }
  return dir;
}

/**
 * Recursively walk a directory and return all file paths (relative to root).
 */
function walkDir(dir, root = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '__MACOSX' || entry.name.startsWith('.')) continue;

    // Skip symlinks
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, root));
    } else {
      results.push(path.relative(root, fullPath));
    }
  }

  return results;
}

module.exports = { extractZip };
