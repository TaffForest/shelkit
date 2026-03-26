const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { isRealAPI } = require('../services/shelpin');

router.get('/', (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    shelby: isRealAPI() ? 'connected' : 'stub',
  };

  // DB check
  try {
    db.prepare('SELECT 1').get();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

module.exports = router;
