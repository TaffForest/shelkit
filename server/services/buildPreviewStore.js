const TTL_MS = 10 * 60 * 1000; // 10 minutes

const sessions = new Map();

function set(sessionId, files, wallet) {
  sessions.set(sessionId, {
    files,
    wallet,
    expiresAt: Date.now() + TTL_MS,
  });
}

function get(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return entry;
}

function getFile(sessionId, filePath) {
  const entry = get(sessionId);
  if (!entry) return null;
  return entry.files[filePath] ?? null;
}

// Sweep expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [sid, entry] of sessions) {
    if (now > entry.expiresAt) sessions.delete(sid);
  }
}, 60 * 1000).unref();

module.exports = { set, get, getFile };
