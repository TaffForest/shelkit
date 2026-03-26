const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const archiver = require('archiver');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { getToken } = require('./config');

module.exports = async function deploy(dir, options) {
  const token = getToken();
  if (!token) {
    console.log(chalk.red('\nNot authenticated. Run `shelkit login` first.\n'));
    process.exit(1);
  }

  const targetDir = path.resolve(dir || '.');
  if (!fs.existsSync(targetDir)) {
    console.log(chalk.red(`\nDirectory not found: ${targetDir}\n`));
    process.exit(1);
  }

  const server = options.server;

  console.log(chalk.green('\nShelKit Deploy\n'));
  console.log(`Directory: ${chalk.cyan(targetDir)}`);
  console.log(`Server:    ${chalk.dim(server)}\n`);

  // 1. ZIP the directory
  const spinner = ora('Creating ZIP archive...').start();

  const zipPath = path.join(require('os').tmpdir(), `shelkit-deploy-${Date.now()}.zip`);

  try {
    await createZip(targetDir, zipPath, options.build);
    const stats = fs.statSync(zipPath);
    spinner.succeed(`ZIP created (${(stats.size / 1024).toFixed(0)} KB)`);
  } catch (err) {
    spinner.fail(`Failed to create ZIP: ${err.message}`);
    process.exit(1);
  }

  // 2. Upload
  const uploadSpinner = ora('Deploying...').start();

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(zipPath), {
      filename: 'deploy.zip',
      contentType: 'application/zip',
    });

    const res = await fetch(`${server}/api/deploy`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
    });

    const data = await res.json();

    if (!res.ok) {
      uploadSpinner.fail(data.error || 'Deployment failed');
      process.exit(1);
    }

    uploadSpinner.succeed('Deployed successfully!');

    console.log();
    console.log(`  URL:       ${chalk.cyan(server + data.url)}`);
    console.log(`  CID:       ${chalk.dim(data.rootCID)}`);
    console.log(`  Files:     ${data.fileCount}`);
    if (data.framework) {
      console.log(`  Framework: ${data.framework}`);
    }
    console.log();
  } catch (err) {
    uploadSpinner.fail(`Deploy failed: ${err.message}`);
    process.exit(1);
  } finally {
    // Cleanup temp ZIP
    try { fs.unlinkSync(zipPath); } catch {}
  }
};

function createZip(dir, outputPath, includeSrc) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(dir, path.basename(dir), (entry) => {
      // Skip node_modules and .git
      if (entry.name.includes('node_modules/') || entry.name.includes('.git/')) {
        return false;
      }
      return entry;
    });
    archive.finalize();
  });
}
