const chalk = require('chalk');
const fetch = require('node-fetch');
const { getToken } = require('./config');

module.exports = async function del(id, options) {
  const token = getToken();
  if (!token) {
    console.log(chalk.red('\nNot authenticated. Run `shelkit login` first.\n'));
    process.exit(1);
  }

  const server = options.server;

  try {
    const res = await fetch(`${server}/api/deployments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      console.log(chalk.red(`\nFailed: ${data.error}\n`));
      process.exit(1);
    }

    console.log(chalk.green(`\nDeployment ${id} deleted.\n`));
  } catch (err) {
    console.log(chalk.red(`\nFailed: ${err.message}\n`));
    process.exit(1);
  }
};
