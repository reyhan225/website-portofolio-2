function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getGuardConfig() {
  const windowMinutes = toPositiveInt(process.env.ADMIN_LOGIN_WINDOW_MIN, 15);
  const maxFailures = toPositiveInt(process.env.ADMIN_LOGIN_MAX_FAILURES, 6);
  const blockMinutes = toPositiveInt(process.env.ADMIN_LOGIN_BLOCK_MIN, 30);
  return {
    windowMs: windowMinutes * 60 * 1000,
    maxFailures,
    blockMs: blockMinutes * 60 * 1000
  };
}

function makeKey(req) {
  const ip = String(req.ip || '').trim() || 'unknown-ip';
  const ua = String(req.get('user-agent') || '').trim().slice(0, 180);
  return `${ip}|${ua || 'unknown-ua'}`;
}

const loginAttempts = new Map();

function pruneOldEntries(nowMs, cfg) {
  for (const [key, entry] of loginAttempts.entries()) {
    const isActiveFailure = entry.lastFailureAt && (nowMs - entry.lastFailureAt <= cfg.windowMs);
    const isBlocked = entry.blockedUntil && entry.blockedUntil > nowMs;
    if (!isActiveFailure && !isBlocked) {
      loginAttempts.delete(key);
    }
  }
}

function getLoginStatus(req) {
  const cfg = getGuardConfig();
  const nowMs = Date.now();
  pruneOldEntries(nowMs, cfg);

  const key = makeKey(req);
  const entry = loginAttempts.get(key);
  if (!entry || !entry.blockedUntil || entry.blockedUntil <= nowMs) {
    return { blocked: false, retryAfterSec: 0 };
  }

  return {
    blocked: true,
    retryAfterSec: Math.max(1, Math.ceil((entry.blockedUntil - nowMs) / 1000))
  };
}

function registerLoginFailure(req) {
  const cfg = getGuardConfig();
  const nowMs = Date.now();
  const key = makeKey(req);
  const current = loginAttempts.get(key) || { count: 0, lastFailureAt: 0, blockedUntil: 0 };

  const withinWindow = current.lastFailureAt && (nowMs - current.lastFailureAt <= cfg.windowMs);
  const nextCount = withinWindow ? current.count + 1 : 1;
  const next = {
    count: nextCount,
    lastFailureAt: nowMs,
    blockedUntil: current.blockedUntil || 0
  };

  if (nextCount >= cfg.maxFailures) {
    next.blockedUntil = nowMs + cfg.blockMs;
    next.count = 0;
  }

  loginAttempts.set(key, next);
}

function resetLoginFailures(req) {
  loginAttempts.delete(makeKey(req));
}

module.exports = {
  getLoginStatus,
  registerLoginFailure,
  resetLoginFailures
};
