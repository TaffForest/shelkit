/**
 * Per-wallet daily token budget for the Build feature.
 *
 * The cap is a cost-abuse guard, not a fairness quota: an attacker with many
 * wallets can still rack up spend, but a single wallet can't run unbounded
 * Anthropic calls in a day. Checked BEFORE the model call (so we don't burn
 * budget on a request we'd reject anyway) and recorded AFTER, from the
 * provider's real usage numbers.
 *
 * The "day" is UTC. A wallet's budget resets at 00:00 UTC.
 */

const db = require('./db');

/** Daily cap in total tokens (input + output) per wallet. <= 0 disables the
 * cap entirely — handy for local dev. Default 500k ≈ a couple of full
 * generate-then-iterate sessions, which stops runaway abuse without biting
 * legitimate use. */
function dailyCap() {
  const raw = parseInt(process.env.DAILY_TOKEN_CAP, 10);
  return Number.isFinite(raw) ? raw : 500_000;
}

/** Current UTC day as 'YYYY-MM-DD'. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds from now until the next 00:00 UTC (when the budget resets). */
function secondsUntilReset() {
  const now = new Date();
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1,
  );
  return Math.ceil((nextMidnight - now.getTime()) / 1000);
}

const stmts = {
  getToday: db.prepare(`SELECT tokens FROM wallet_token_usage WHERE wallet = ? AND day = ?`),
  upsert: db.prepare(`
    INSERT INTO wallet_token_usage (wallet, day, tokens) VALUES (?, ?, ?)
    ON CONFLICT(wallet, day) DO UPDATE SET
      tokens = tokens + excluded.tokens,
      updated_at = datetime('now')
  `),
};

/** Tokens this wallet has spent so far today (UTC). */
function getUsageToday(wallet) {
  const row = stmts.getToday.get(wallet, today());
  return row ? row.tokens : 0;
}

/** Add `tokens` to this wallet's usage for today. No-op for non-positive. */
function recordUsage(wallet, tokens) {
  if (!wallet || !Number.isFinite(tokens) || tokens <= 0) return;
  stmts.upsert.run(wallet, today(), Math.round(tokens));
}

/**
 * Whether this wallet may make another model call right now.
 * @returns {{ allowed: boolean, used: number, cap: number, remaining: number, resetSeconds: number }}
 */
function checkCap(wallet) {
  const cap = dailyCap();
  const used = getUsageToday(wallet);
  if (cap <= 0) {
    return { allowed: true, used, cap, remaining: Infinity, resetSeconds: secondsUntilReset() };
  }
  return {
    allowed: used < cap,
    used,
    cap,
    remaining: Math.max(0, cap - used),
    resetSeconds: secondsUntilReset(),
  };
}

/**
 * JSON-safe budget snapshot for the client UI. `remaining`/`cap` are null when
 * the cap is disabled (Infinity doesn't serialise), flagged by `unlimited`.
 * @returns {{ used: number, cap: number|null, remaining: number|null, unlimited: boolean, resetSeconds: number }}
 */
function snapshot(wallet) {
  const { used, cap, remaining, resetSeconds } = checkCap(wallet);
  const unlimited = cap <= 0;
  return {
    used,
    cap: unlimited ? null : cap,
    remaining: unlimited ? null : remaining,
    unlimited,
    resetSeconds,
  };
}

module.exports = { dailyCap, today, secondsUntilReset, getUsageToday, recordUsage, checkCap, snapshot };
