/**
 * Public abuse reporting endpoint
 * POST /api/report — file an abuse report for a deployment
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { fileAbuseReport } = require('../services/contentPolicy');

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many reports from this IP. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const VALID_REASONS = [
  'illegal-content',
  'malware',
  'phishing',
  'spam',
  'copyright',
  'violence',
  'other',
];

router.post('/', reportLimiter, (req, res) => {
  const { deploymentId, reason, url } = req.body;

  if (!deploymentId || !reason) {
    return res.status(400).json({ error: 'deploymentId and reason are required' });
  }

  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` });
  }

  const report = fileAbuseReport({
    deploymentId,
    reason,
    url: url || req.headers.referer || '',
    reporterIp: req.ip,
  });

  console.log(`[ABUSE] Report filed for deployment ${deploymentId}: ${reason}`);

  res.json({
    success: true,
    reportId: report.id,
    message: 'Your report has been received. We will review it shortly.',
  });
});

module.exports = router;
