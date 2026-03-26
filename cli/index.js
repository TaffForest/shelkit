#!/usr/bin/env node

const { Command } = require('commander');
const pkg = require('./package.json');

const program = new Command();

program
  .name('shelkit')
  .description('ShelKit CLI — deploy to the decentralised web')
  .version(pkg.version);

program
  .command('login')
  .description('Authenticate with ShelKit (opens browser for wallet auth)')
  .option('-s, --server <url>', 'ShelKit server URL', 'http://localhost:3000')
  .action(require('./commands/login'));

program
  .command('deploy [dir]')
  .description('Deploy a directory to ShelKit')
  .option('-s, --server <url>', 'ShelKit server URL', 'http://localhost:3000')
  .option('--build', 'Upload source and build server-side')
  .action(require('./commands/deploy'));

program
  .command('list')
  .description('List your deployments')
  .option('-s, --server <url>', 'ShelKit server URL', 'http://localhost:3000')
  .action(require('./commands/list'));

program
  .command('delete <id>')
  .description('Delete a deployment')
  .option('-s, --server <url>', 'ShelKit server URL', 'http://localhost:3000')
  .action(require('./commands/delete'));

program.parse();
