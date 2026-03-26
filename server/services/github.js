const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLONE_TIMEOUT = 60 * 1000; // 60 seconds

/**
 * Validate a GitHub URL.
 */
function isValidGithubUrl(url) {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/.test(url);
}

/**
 * Extract owner/repo from a GitHub URL.
 */
function parseGithubUrl(url) {
  const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Clone a GitHub repo (shallow) into a target directory.
 * Returns the cloned directory path.
 */
function cloneRepo(repoUrl, destDir, branch = 'main') {
  if (!isValidGithubUrl(repoUrl)) {
    throw new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo');
  }

  fs.mkdirSync(destDir, { recursive: true });

  // Sanitize branch name to prevent command injection
  const safeBranch = branch.replace(/[^a-zA-Z0-9._\-\/]/g, '');
  if (safeBranch !== branch) {
    throw new Error('Invalid branch name');
  }

  const { repo } = parseGithubUrl(repoUrl);
  const cloneDir = path.join(destDir, repo);

  try {
    execSync(
      `git clone --depth 1 --branch ${safeBranch} ${repoUrl} ${cloneDir}`,
      {
        timeout: CLONE_TIMEOUT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      }
    );
  } catch (err) {
    // Try without branch specification (maybe it's 'master')
    try {
      execSync(
        `git clone --depth 1 ${repoUrl} ${cloneDir}`,
        {
          timeout: CLONE_TIMEOUT,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        }
      );
    } catch (err2) {
      throw new Error(`Failed to clone repository: ${err2.message}`);
    }
  }

  // Remove .git directory to save space
  const gitDir = path.join(cloneDir, '.git');
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  return cloneDir;
}

module.exports = { isValidGithubUrl, parseGithubUrl, cloneRepo };
