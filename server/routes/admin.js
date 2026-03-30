/**
 * Admin Routes — protected by ADMIN_SECRET env var
 *
 * POST /api/admin/suspend/wallet       — suspend a wallet
 * POST /api/admin/unsuspend/wallet     — unsuspend a wallet
 * POST /api/admin/suspend/deployment   — suspend a deployment
 * POST /api/admin/unsuspend/deployment — unsuspend a deployment
 * GET  /api/admin/reports              — list abuse reports
 * POST /api/admin/reports/:id/resolve  — resolve an abuse report
 * GET  /api/admin/blocklist            — view full blocklist
 */

const express = require('express');
const router = express.Router();
const {
  suspendWallet, unsuspendWallet,
  suspendDeployment, unsuspendDeployment,
  getAbuseReports, loadBlocklist,
} = require('../services/contentPolicy');
const fs = require('fs');
const path = require('path');

// Admin auth middleware
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Admin endpoint not configured' });
  }

  const provided = req.headers['x-admin-secret'] || req.body?.adminSecret;
  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Suspend a wallet
router.post('/suspend/wallet', requireAdmin, (req, res) => {
  const { wallet, reason } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet is required' });

  suspendWallet(wallet, reason || 'Suspended by admin');
  console.log(`[ADMIN] Suspended wallet: ${wallet}`);
  res.json({ success: true, wallet });
});

// Unsuspend a wallet
router.post('/unsuspend/wallet', requireAdmin, (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet is required' });

  unsuspendWallet(wallet);
  console.log(`[ADMIN] Unsuspended wallet: ${wallet}`);
  res.json({ success: true, wallet });
});

// Suspend a deployment
router.post('/suspend/deployment', requireAdmin, (req, res) => {
  const { deploymentId, reason } = req.body;
  if (!deploymentId) return res.status(400).json({ error: 'deploymentId is required' });

  suspendDeployment(deploymentId, reason || 'Suspended by admin');
  console.log(`[ADMIN] Suspended deployment: ${deploymentId}`);
  res.json({ success: true, deploymentId });
});

// Unsuspend a deployment
router.post('/unsuspend/deployment', requireAdmin, (req, res) => {
  const { deploymentId } = req.body;
  if (!deploymentId) return res.status(400).json({ error: 'deploymentId is required' });

  unsuspendDeployment(deploymentId);
  console.log(`[ADMIN] Unsuspended deployment: ${deploymentId}`);
  res.json({ success: true, deploymentId });
});

// List all abuse reports
router.get('/reports', requireAdmin, (req, res) => {
  const reports = getAbuseReports();
  res.json(reports);
});

// Resolve an abuse report
router.post('/reports/:id/resolve', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body; // action: 'dismissed' | 'actioned'

  const REPORTS_PATH = path.join(__dirname, '..', 'data', 'abuse-reports.json');
  try {
    const reports = JSON.parse(fs.readFileSync(REPORTS_PATH, 'utf8'));
    const report = reports.find(r => r.id === id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.status = action || 'resolved';
    report.resolvedAt = new Date().toISOString();
    if (note) report.adminNote = note;

    fs.writeFileSync(REPORTS_PATH, JSON.stringify(reports, null, 2));
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View full blocklist
router.get('/blocklist', requireAdmin, (req, res) => {
  res.json(loadBlocklist());
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;
