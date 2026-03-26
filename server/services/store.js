const db = require('./db');
const fs = require('fs');
const path = require('path');

/** Prepared statements for performance */
const stmts = {
  insert: db.prepare(`
    INSERT INTO deployments (id, wallet, root_cid, file_count, subdomain, framework, did_build, extract_dir, files_json, project_id, version)
    VALUES (@id, @wallet, @rootCID, @fileCount, @subdomain, @framework, @didBuild, @extractDir, @filesJson, @projectId, @version)
  `),

  get: db.prepare(`SELECT * FROM deployments WHERE id = ? AND deleted_at IS NULL`),

  listAll: db.prepare(`SELECT * FROM deployments WHERE deleted_at IS NULL ORDER BY created_at DESC`),

  listByWallet: db.prepare(`SELECT * FROM deployments WHERE wallet = ? AND deleted_at IS NULL ORDER BY created_at DESC`),

  findBySubdomain: db.prepare(`SELECT * FROM deployments WHERE subdomain = ? AND deleted_at IS NULL`),

  softDelete: db.prepare(`UPDATE deployments SET deleted_at = datetime('now') WHERE id = ? AND wallet = ?`),

  // Version tracking
  insertVersion: db.prepare(`
    INSERT INTO deploy_versions (deployment_id, project_id, version, root_cid, extract_dir, file_count, files_json)
    VALUES (@deploymentId, @projectId, @version, @rootCID, @extractDir, @fileCount, @filesJson)
  `),

  getVersions: db.prepare(`SELECT * FROM deploy_versions WHERE deployment_id = ? ORDER BY version DESC`),

  getVersion: db.prepare(`SELECT * FROM deploy_versions WHERE deployment_id = ? AND version = ?`),

  updateDeployment: db.prepare(`
    UPDATE deployments SET root_cid = @rootCID, extract_dir = @extractDir, file_count = @fileCount, files_json = @filesJson, version = @version
    WHERE id = @id
  `),

};

/** Format a DB row into the deployment object format used by the rest of the app */
function formatDeployment(row) {
  if (!row) return null;
  return {
    id: row.id,
    wallet: row.wallet,
    rootCID: row.root_cid,
    fileCount: row.file_count,
    subdomain: row.subdomain,
    framework: row.framework,
    didBuild: !!row.did_build,
    extractDir: row.extract_dir,
    files: row.files_json ? JSON.parse(row.files_json) : {},
    fileList: row.files_json ? Object.keys(JSON.parse(row.files_json)) : [],
    projectId: row.project_id,
    version: row.version,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function save(deployment) {
  stmts.insert.run({
    id: deployment.id,
    wallet: deployment.wallet || '',
    rootCID: deployment.rootCID,
    fileCount: deployment.fileCount || 0,
    subdomain: deployment.subdomain,
    framework: deployment.framework || null,
    didBuild: deployment.didBuild ? 1 : 0,
    extractDir: deployment.extractDir,
    filesJson: JSON.stringify(deployment.files || {}),
    projectId: deployment.projectId || null,
    version: deployment.version || 1,
  });

  // Also save as version 1
  stmts.insertVersion.run({
    deploymentId: deployment.id,
    projectId: deployment.projectId || null,
    version: deployment.version || 1,
    rootCID: deployment.rootCID,
    extractDir: deployment.extractDir,
    fileCount: deployment.fileCount || 0,
    filesJson: JSON.stringify(deployment.files || {}),
  });
}

function get(id) {
  return formatDeployment(stmts.get.get(id));
}

function list() {
  return stmts.listAll.all().map(formatDeployment);
}

function listByWallet(walletAddress) {
  return stmts.listByWallet.all(walletAddress).map(formatDeployment);
}

function findBySubdomain(subdomain) {
  return formatDeployment(stmts.findBySubdomain.get(subdomain));
}

function softDelete(id, wallet) {
  const result = stmts.softDelete.run(id, wallet);
  return result.changes > 0;
}

function cleanupFiles(id) {
  const deployment = formatDeployment(stmts.get.get(id));
  if (deployment && deployment.extractDir && fs.existsSync(deployment.extractDir)) {
    fs.rmSync(deployment.extractDir, { recursive: true, force: true });
  }
}

/** Save a new version of a deployment */
function saveVersion(deploymentId, data) {
  const current = get(deploymentId);
  if (!current) throw new Error('Deployment not found');

  const newVersion = (current.version || 1) + 1;

  stmts.insertVersion.run({
    deploymentId,
    projectId: current.projectId || null,
    version: newVersion,
    rootCID: data.rootCID,
    extractDir: data.extractDir,
    fileCount: data.fileCount || 0,
    filesJson: JSON.stringify(data.files || {}),
  });

  stmts.updateDeployment.run({
    id: deploymentId,
    rootCID: data.rootCID,
    extractDir: data.extractDir,
    fileCount: data.fileCount || 0,
    filesJson: JSON.stringify(data.files || {}),
    version: newVersion,
  });

  return newVersion;
}

function getVersions(deploymentId) {
  return stmts.getVersions.all(deploymentId).map(v => ({
    id: v.id,
    deploymentId: v.deployment_id,
    version: v.version,
    rootCID: v.root_cid,
    extractDir: v.extract_dir,
    fileCount: v.file_count,
    createdAt: v.created_at,
  }));
}

function rollback(deploymentId, version) {
  const v = stmts.getVersion.get(deploymentId, version);
  if (!v) throw new Error(`Version ${version} not found`);

  stmts.updateDeployment.run({
    id: deploymentId,
    rootCID: v.root_cid,
    extractDir: v.extract_dir,
    fileCount: v.file_count,
    filesJson: v.files_json,
    version: v.version,
  });

  return formatDeployment(stmts.get.get(deploymentId));
}

module.exports = {
  save, get, list, listByWallet, findBySubdomain,
  softDelete, cleanupFiles,
  saveVersion, getVersions, rollback,
};
