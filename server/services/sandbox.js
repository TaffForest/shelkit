const path = require('path');

/** Max concurrent builds */
const MAX_CONCURRENT_BUILDS = 3;
let activeBuilds = 0;

/**
 * Build a sanitised environment for child processes.
 * Strips all sensitive vars — only passes safe ones needed for builds.
 */
function buildSafeEnv(projectDir) {
  const safeVars = {
    PATH: `${projectDir}/node_modules/.bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`,
    HOME: projectDir,       // Prevent reading ~/.ssh, ~/.npmrc, etc.
    TMPDIR: path.join(projectDir, '.tmp'),
    CI: 'true',
    // NOTE: Do NOT set NODE_ENV=production here — it skips devDependencies
    // during npm install, and build tools (vite, etc.) are devDeps.
    // Memory limit for Node.js builds
    NODE_OPTIONS: '--max-old-space-size=512',
    // Prevent npm from reading user-level config
    NPM_CONFIG_USERCONFIG: path.join(projectDir, '.npmrc-user'),
    NPM_CONFIG_GLOBALCONFIG: path.join(projectDir, '.npmrc-global'),
    // Use project-local cache
    npm_config_cache: path.join(projectDir, '.npm-cache'),
    // Prevent git operations
    GIT_TERMINAL_PROMPT: '0',
  };

  // Carry over necessary system vars only
  const systemVars = ['LANG', 'LC_ALL', 'TERM'];
  for (const v of systemVars) {
    if (process.env[v]) safeVars[v] = process.env[v];
  }

  return safeVars;
}

/**
 * Patterns that indicate dangerous build commands.
 * These are checked against the `build` script in package.json.
 */
const BLOCKED_PATTERNS = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bnc\b/,            // netcat
  /\bnetcat\b/i,
  /\beval\b/,
  /\bexec\b/,
  /`[^`]+`/,           // backtick command substitution
  /\$\([^)]+\)/,       // $() command substitution
  /\|\s*\bsh\b/,       // piping to sh
  /\|\s*\bbash\b/,     // piping to bash
  /\brm\s+-rf\s+\//,   // rm -rf /
  /\bchmod\b/,
  /\bchown\b/,
  /\bsudo\b/,
  /\bsu\s+/,
  /\/etc\//,           // accessing /etc
  /\/proc\//,          // accessing /proc
  /~\//,              // accessing home dir
  /\bopen\s+https?:/,  // opening URLs
  /\bpython\b/,        // running python
  /\bnode\s+-e\b/,     // node -e "code"
  /\bnode\s+--eval\b/,
  /\bpowersh/i,        // powershell
  /\btelnet\b/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /\brsync\b/i,
  /\bmkfifo\b/i,
  />\s*\/dev\/tcp/,    // bash tcp redirect
  /\bdd\b.*\bif=/,     // dd command
];

/**
 * npm lifecycle scripts that should be stripped before install.
 * These run automatically during `npm install` and are a major attack vector.
 */
const LIFECYCLE_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'prepublish',
  'prepublishOnly',
  'prepare',
  'prepack',
  'postpack',
];

/**
 * Validate the build script for dangerous patterns.
 * Returns { safe: boolean, reason?: string }
 */
function validateBuildScript(buildScript) {
  if (!buildScript || typeof buildScript !== 'string') {
    return { safe: false, reason: 'No build script found' };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(buildScript)) {
      return {
        safe: false,
        reason: `Build script contains blocked pattern: ${pattern.toString()}`,
      };
    }
  }

  return { safe: true };
}

/**
 * Acquire a build slot. Returns true if a slot is available.
 */
function acquireBuildSlot() {
  if (activeBuilds >= MAX_CONCURRENT_BUILDS) {
    return false;
  }
  activeBuilds++;
  return true;
}

/**
 * Release a build slot.
 */
function releaseBuildSlot() {
  activeBuilds = Math.max(0, activeBuilds - 1);
}

/**
 * Get current build count.
 */
function getActiveBuildCount() {
  return activeBuilds;
}

module.exports = {
  buildSafeEnv,
  validateBuildScript,
  acquireBuildSlot,
  releaseBuildSlot,
  getActiveBuildCount,
  LIFECYCLE_SCRIPTS,
  BLOCKED_PATTERNS,
};
