const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  buildSafeEnv,
  validateBuildScript,
  acquireBuildSlot,
  releaseBuildSlot,
  LIFECYCLE_SCRIPTS,
} = require('./sandbox');

const BUILD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/** Known framework output directories */
const FRAMEWORK_MAP = [
  { name: 'Next.js',          dep: 'next',           outputDir: 'out' },
  { name: 'Vite',             dep: 'vite',           outputDir: 'dist' },
  { name: 'Create React App', dep: 'react-scripts',  outputDir: 'build' },
  { name: 'Astro',            dep: 'astro',          outputDir: 'dist' },
  { name: 'Nuxt',             dep: 'nuxt',           outputDir: '.output/public' },
  { name: 'Gatsby',           dep: 'gatsby',         outputDir: 'public' },
  { name: 'SvelteKit',        dep: '@sveltejs/kit',  outputDir: 'build' },
  { name: 'Parcel',           dep: 'parcel',         outputDir: 'dist' },
];

/**
 * Check if the project directory has a buildable package.json.
 */
function isBuildable(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return !!(pkg.scripts && pkg.scripts.build);
  } catch {
    return false;
  }
}

/**
 * Detect the framework and expected output directory.
 */
function detectFramework(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  for (const fw of FRAMEWORK_MAP) {
    if (allDeps[fw.dep]) {
      return { framework: fw.name, outputDir: fw.outputDir };
    }
  }

  return { framework: 'Unknown', outputDir: 'dist' };
}

/**
 * Detect the package manager from lock files.
 */
function detectPackageManager(projectDir) {
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/**
 * Strip dangerous lifecycle scripts from package.json.
 * Rewrites the file in-place, removing preinstall, postinstall, prepare, etc.
 */
function stripLifecycleScripts(projectDir, onLog) {
  const pkgPath = path.join(projectDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  if (!pkg.scripts) return;

  const stripped = [];
  for (const script of LIFECYCLE_SCRIPTS) {
    if (pkg.scripts[script]) {
      stripped.push(script);
      delete pkg.scripts[script];
    }
  }

  if (stripped.length > 0) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    onLog(`SECURITY: Stripped lifecycle scripts: ${stripped.join(', ')}`);
  }

  // Also check all dependencies for install scripts by scanning node_modules later
  // For now, we use --ignore-scripts during npm install
}

/**
 * Run a shell command as a child process with sandboxed environment.
 */
function runCommand(cmd, args, cwd, onLog) {
  return new Promise((resolve, reject) => {
    const env = buildSafeEnv(cwd);

    // Create temp dir for builds
    const tmpDir = path.join(cwd, '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    const child = spawn(cmd, args, {
      cwd,
      shell: '/bin/bash',
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      // Force kill after 5 seconds if SIGTERM doesn't work
      setTimeout(() => child.kill('SIGKILL'), 5000);
      reject(new Error(`Build timed out after ${BUILD_TIMEOUT / 1000}s`));
    }, BUILD_TIMEOUT);

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => onLog(line));
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => onLog(line));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${cmd} ${args.join(' ')}" exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Run the full build pipeline with security hardening.
 */
async function runBuild(projectDir, onLog = () => {}) {
  // 1. Acquire build slot
  if (!acquireBuildSlot()) {
    throw new Error('Server is busy — too many concurrent builds. Try again shortly.');
  }

  try {
    const { framework, outputDir } = detectFramework(projectDir);
    const pm = detectPackageManager(projectDir);

    onLog(`Detected framework: ${framework}`);
    onLog(`Package manager: ${pm}`);
    onLog(`Expected output: ${outputDir}/`);
    onLog('');

    // 2. Validate build script
    const pkgPath = path.join(projectDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const buildScript = pkg.scripts?.build;

    const validation = validateBuildScript(buildScript);
    if (!validation.safe) {
      throw new Error(`SECURITY: Build script rejected — ${validation.reason}`);
    }
    onLog('SECURITY: Build script validated');

    // 3. Strip lifecycle scripts
    stripLifecycleScripts(projectDir, onLog);

    // 4. Install dependencies with --ignore-scripts
    onLog('');
    onLog(`--- Installing dependencies (${pm} install --ignore-scripts) ---`);

    const installArgs = pm === 'npm'  ? ['install', '--ignore-scripts'] :
                        pm === 'yarn' ? ['install', '--ignore-scripts'] :
                        pm === 'pnpm' ? ['install', '--ignore-scripts'] :
                        ['install', '--ignore-scripts'];

    await runCommand(pm, installArgs, projectDir, onLog);

    // npm audit — run after install, warn but don't block on vulnerabilities
    if (pm === 'npm') {
      onLog('');
      onLog('--- Running npm audit ---');
      try {
        await runCommand('npm', ['audit', '--audit-level=critical', '--json'], projectDir, (line) => {
          try {
            const data = JSON.parse(line);
            if (data.metadata?.vulnerabilities) {
              const v = data.metadata.vulnerabilities;
              onLog(`Audit: ${v.total || 0} vulnerabilities (critical: ${v.critical || 0}, high: ${v.high || 0})`);
              if ((v.critical || 0) > 0) {
                onLog('WARNING: Critical vulnerabilities found in dependencies');
              }
            }
          } catch {
            if (line.trim()) onLog(line);
          }
        });
      } catch {
        onLog('Audit completed with warnings (non-blocking)');
      }
    }

    onLog('');
    onLog('--- Building project ---');

    // 5. Run build (only the validated build script)
    const buildArgs = pm === 'npm' ? ['run', 'build'] : ['build'];
    await runCommand(pm, buildArgs, projectDir, onLog);

    // 6. Find the output directory
    const absOutputDir = path.join(projectDir, outputDir);

    if (!fs.existsSync(absOutputDir)) {
      const fallbacks = ['dist', 'build', 'out', 'public', '.next'];
      for (const fb of fallbacks) {
        const fbPath = path.join(projectDir, fb);
        if (fs.existsSync(fbPath) && fs.statSync(fbPath).isDirectory()) {
          onLog(`Output found at: ${fb}/`);
          return { outputDir: fbPath, framework };
        }
      }
      throw new Error(`Build output directory not found. Expected: ${outputDir}/`);
    }

    onLog(`Output found at: ${outputDir}/`);
    return { outputDir: absOutputDir, framework };
  } finally {
    releaseBuildSlot();
  }
}

module.exports = { isBuildable, detectFramework, detectPackageManager, runBuild };
