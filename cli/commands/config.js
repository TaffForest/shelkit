const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.shelkit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getToken() {
  const config = loadConfig();
  return config.token;
}

function setToken(token, wallet, server) {
  const config = loadConfig();
  config.token = token;
  config.wallet = wallet;
  config.server = server;
  saveConfig(config);
}

function clearToken() {
  const config = loadConfig();
  delete config.token;
  delete config.wallet;
  saveConfig(config);
}

module.exports = { loadConfig, saveConfig, getToken, setToken, clearToken };
