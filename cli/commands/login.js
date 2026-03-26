const http = require('http');
const chalk = require('chalk');
const { setToken } = require('./config');

module.exports = async function login(options) {
  const server = options.server;

  console.log(chalk.green('\nShelKit Login\n'));
  console.log('Opening browser for wallet authentication...\n');
  console.log(chalk.dim('Waiting for authentication callback...\n'));

  // Start a local server to receive the auth callback
  const callbackServer = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost`);

    if (url.pathname === '/callback') {
      const token = url.searchParams.get('token');
      const wallet = url.searchParams.get('wallet');

      if (token && wallet) {
        setToken(token, wallet, server);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html><body style="background:#050505;color:#e8e8e8;font-family:sans-serif;text-align:center;padding:80px">
            <h1 style="color:#8BC53F">Authenticated!</h1>
            <p>You can close this window and return to the terminal.</p>
          </body></html>
        `);

        console.log(chalk.green('Authenticated successfully!'));
        console.log(`Wallet: ${chalk.cyan(wallet.slice(0, 10) + '...' + wallet.slice(-6))}`);
        console.log(`Token saved to ~/.shelkit/config.json\n`);

        setTimeout(() => {
          callbackServer.close();
          process.exit(0);
        }, 500);
      } else {
        res.writeHead(400);
        res.end('Missing token or wallet');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  callbackServer.listen(9876, () => {
    const authUrl = `${server}/app?cli_callback=http://localhost:9876/callback`;
    console.log(`Visit this URL to authenticate:\n`);
    console.log(chalk.cyan(authUrl));
    console.log();

    // Try to open browser
    const { exec } = require('child_process');
    const cmd = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${authUrl}"`);
  });
};
