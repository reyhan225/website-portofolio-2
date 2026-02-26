const crypto = require('crypto');
const { signJwt, verifyJwt } = require('../utils/token');

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return isProduction() ? '' : 'admin123';
}

function getAdminJwtSecret() {
  if (process.env.ADMIN_JWT_SECRET) return process.env.ADMIN_JWT_SECRET;
  return isProduction() ? '' : 'dev-admin-secret-change-me';
}

function getTokenTtlSeconds() {
  const raw = Number.parseInt(process.env.ADMIN_TOKEN_TTL_SEC || '3600', 10);
  if (!Number.isFinite(raw) || raw <= 0) return 3600;
  return raw;
}

function getAdminEmail() {
  const raw = (process.env.ADMIN_EMAIL || 'reyhanmuhamadrizki1@gmail.com').trim();
  return raw || 'reyhanmuhamadrizki1@gmail.com';
}

function getAdminBasePath() {
  const raw = (process.env.ADMIN_BASE_PATH || '/secure-admin-2026').trim();
  if (!raw) return '/secure-admin-2026';
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  const cleaned = normalized === '/' ? '/secure-admin-2026' : normalized.replace(/\/+$/, '');
  if (cleaned === '/api' || cleaned.startsWith('/api/')) return '/secure-admin-2026';
  return cleaned;
}

function normalizeIp(ip) {
  if (typeof ip !== 'string') return '';
  const value = ip.trim();
  if (!value) return '';
  if (value === '::1') return '127.0.0.1';
  if (value.startsWith('::ffff:')) return value.slice(7);
  return value;
}

function getRequestIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    return normalizeIp(first);
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

function getAllowedAdminIps() {
  const raw = (process.env.ADMIN_ALLOWED_IPS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map(v => normalizeIp(v))
    .filter(Boolean);
}

function isAdminIpAllowed(req) {
  const allowed = getAllowedAdminIps();
  if (!allowed.length) return true;
  const ip = getRequestIp(req);
  return !!ip && allowed.includes(ip);
}

function enforceAdminIp(req, res, next) {
  if (isAdminIpAllowed(req)) return next();
  return res.status(403).json({ success: false, error: 'Access denied from this IP' });
}

function compareAdminPassword(candidate, expected) {
  const cand = typeof candidate === 'string' ? candidate : '';
  const exp = typeof expected === 'string' ? expected : '';
  const candHash = crypto.createHash('sha256').update(cand).digest();
  const expHash = crypto.createHash('sha256').update(exp).digest();
  return crypto.timingSafeEqual(candHash, expHash);
}

function issueAdminToken() {
  return signJwt(
    { role: 'admin', scope: 'portfolio-admin' },
    getAdminJwtSecret(),
    getTokenTtlSeconds()
  );
}

function requireAdmin(req, res, next) {
  if (!isAdminIpAllowed(req)) {
    return res.status(403).json({ success: false, error: 'Access denied from this IP' });
  }

  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const verification = verifyJwt(token, getAdminJwtSecret());
  if (!verification.valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (verification.payload.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  req.admin = verification.payload;
  return next();
}

module.exports = {
  requireAdmin,
  enforceAdminIp,
  compareAdminPassword,
  getAdminPassword,
  getAdminJwtSecret,
  getTokenTtlSeconds,
  getAdminEmail,
  getAdminBasePath,
  issueAdminToken
};
