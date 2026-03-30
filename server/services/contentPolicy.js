/**
 * Content Policy Service
 *
 * - Blocks illegal content by filename/extension pattern
 * - Flags suspicious content for review
 * - Maintains a blocklist of known-bad deployment IDs (admin-managed)
 */

const path = require('path');
const fs = require('fs');

// Blocked file extensions (executable/dangerous)
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.vbs', '.ps1',
  '.sh', '.bash', '.zsh', '.fish',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.asp', '.aspx', '.cgi', '.pl', '.py', '.rb',
  '.jar', '.class', '.war',
  '.dmg', '.pkg', '.deb', '.rpm', '.msi',
]);

// Filenames that indicate malicious payloads
const BLOCKED_FILENAMES = new Set([
  'webshell.php', 'c99.php', 'r57.php', 'shell.php',
  '.htaccess', '.htpasswd',
  'wp-config.php', 'config.php',
]);

// Patterns in filenames that indicate malicious content
const SUSPICIOUS_FILENAME_PATTERNS = [
  /\bshell\b/i,
  /\bbackdoor\b/i,
  /\bmalware\b/i,
  /\bexploit\b/i,
  /\bkeylogger\b/i,
  /\bransomware\b/i,
  /\btrojan\b/i,
  /\brootkit\b/i,
];

// Blocked MIME types from multer
const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-php',
  'text/x-php',
  'application/x-sh',
]);

// Path to the admin blocklist file
const BLOCKLIST_PATH = path.join(__dirname, '..', 'data', 'blocklist.json');

/**
 * Load the admin blocklist (wallets + deployment IDs suspended by admin)
 */
function loadBlocklist() {
  try {
    if (fs.existsSync(BLOCKLIST_PATH)) {
      return JSON.parse(fs.readFileSync(BLOCKLIST_PATH, 'utf8'));
    }
  } catch {}
  return { wallets: [], deployments: [] };
}

/**
 * Save the admin blocklist
 */
function saveBlocklist(blocklist) {
  const dir = path.dirname(BLOCKLIST_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BLOCKLIST_PATH, JSON.stringify(blocklist, null, 2));
}

/**
 * Check if a wallet is suspended
 */
function isWalletSuspended(wallet) {
  const blocklist = loadBlocklist();
  return blocklist.wallets.includes(wallet?.toLowerCase());
}

/**
 * Check if a deployment is suspended
 */
function isDeploymentSuspended(deploymentId) {
  const blocklist = loadBlocklist();
  return blocklist.deployments.includes(deploymentId);
}

/**
 * Suspend a wallet (admin only)
 */
function suspendWallet(wallet, reason) {
  const blocklist = loadBlocklist();
  const w = wallet.toLowerCase();
  if (!blocklist.wallets.includes(w)) {
    blocklist.wallets.push(w);
    if (!blocklist.suspensions) blocklist.suspensions = [];
    blocklist.suspensions.push({ wallet: w, reason, suspendedAt: new Date().toISOString() });
    saveBlocklist(blocklist);
  }
}

/**
 * Unsuspend a wallet (admin only)
 */
function unsuspendWallet(wallet) {
  const blocklist = loadBlocklist();
  const w = wallet.toLowerCase();
  blocklist.wallets = blocklist.wallets.filter(x => x !== w);
  if (blocklist.suspensions) {
    blocklist.suspensions = blocklist.suspensions.filter(x => x.wallet !== w);
  }
  saveBlocklist(blocklist);
}

/**
 * Suspend a specific deployment (admin only)
 */
function suspendDeployment(deploymentId, reason) {
  const blocklist = loadBlocklist();
  if (!blocklist.deployments.includes(deploymentId)) {
    blocklist.deployments.push(deploymentId);
    if (!blocklist.suspendedDeployments) blocklist.suspendedDeployments = [];
    blocklist.suspendedDeployments.push({ deploymentId, reason, suspendedAt: new Date().toISOString() });
    saveBlocklist(blocklist);
  }
}

/**
 * Unsuspend a deployment (admin only)
 */
function unsuspendDeployment(deploymentId) {
  const blocklist = loadBlocklist();
  blocklist.deployments = blocklist.deployments.filter(x => x !== deploymentId);
  if (blocklist.suspendedDeployments) {
    blocklist.suspendedDeployments = blocklist.suspendedDeployments.filter(x => x.deploymentId !== deploymentId);
  }
  saveBlocklist(blocklist);
}

/**
 * Scan a list of file paths for policy violations.
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
function scanFiles(filePaths) {
  for (const filePath of filePaths) {
    const basename = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Block dangerous extensions
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return {
        allowed: false,
        reason: `Blocked file type: ${ext} (${filePath})`,
      };
    }

    // Block dangerous filenames
    if (BLOCKED_FILENAMES.has(basename)) {
      return {
        allowed: false,
        reason: `Blocked filename: ${basename}`,
      };
    }

    // Check suspicious patterns
    for (const pattern of SUSPICIOUS_FILENAME_PATTERNS) {
      if (pattern.test(basename)) {
        return {
          allowed: false,
          reason: `Suspicious filename pattern detected: ${basename}`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Check if the upload MIME type is blocked
 */
function isMimeTypeBlocked(mimeType) {
  return BLOCKED_MIME_TYPES.has(mimeType);
}

/**
 * Load all abuse reports
 */
const REPORTS_PATH = path.join(__dirname, '..', 'data', 'abuse-reports.json');

function loadReports() {
  try {
    if (fs.existsSync(REPORTS_PATH)) {
      return JSON.parse(fs.readFileSync(REPORTS_PATH, 'utf8'));
    }
  } catch {}
  return [];
}

function saveReports(reports) {
  const dir = path.dirname(REPORTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REPORTS_PATH, JSON.stringify(reports, null, 2));
}

/**
 * File an abuse report
 */
function fileAbuseReport({ deploymentId, reason, url, reporterIp }) {
  const reports = loadReports();
  const report = {
    id: Date.now().toString(36),
    deploymentId,
    reason,
    url,
    reporterIp,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  reports.push(report);
  saveReports(reports);
  return report;
}

/**
 * Get all abuse reports (admin only)
 */
function getAbuseReports() {
  return loadReports();
}

module.exports = {
  scanFiles,
  isMimeTypeBlocked,
  isWalletSuspended,
  isDeploymentSuspended,
  suspendWallet,
  unsuspendWallet,
  suspendDeployment,
  unsuspendDeployment,
  fileAbuseReport,
  getAbuseReports,
  loadBlocklist,
};
