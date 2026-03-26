const chalk = require('chalk');
const fetch = require('node-fetch');
const { getToken } = require('./config');

module.exports = async function list(options) {
  const token = getToken();
  if (!token) {
    console.log(chalk.red('\nNot authenticated. Run `shelkit login` first.\n'));
    process.exit(1);
  }

  const server = options.server;

  try {
    const res = await fetch(`${server}/api/deployments`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      console.log(chalk.red('\nSession expired. Run `shelkit login` again.\n'));
      process.exit(1);
    }

    const deployments = await res.json();

    if (deployments.length === 0) {
      console.log(chalk.dim('\nNo deployments yet. Run `shelkit deploy` to get started.\n'));
      return;
    }

    console.log(chalk.green(`\n${deployments.length} deployment${deployments.length !== 1 ? 's' : ''}:\n`));

    for (const d of deployments) {
      const fw = d.framework ? chalk.dim(` [${d.framework}]`) : '';
      const age = timeAgo(d.createdAt);
      console.log(`  ${chalk.cyan(d.id)}  ${server}/deploy/${d.id}${fw}  ${chalk.dim(age)}  ${d.fileCount} files`);
    }
    console.log();
  } catch (err) {
    console.log(chalk.red(`\nFailed to list deployments: ${err.message}\n`));
    process.exit(1);
  }
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
