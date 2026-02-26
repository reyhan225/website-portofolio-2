const crypto = require('crypto');

function toBase64Url(input) {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return source.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createSignature(headerEncoded, payloadEncoded, secret) {
  return toBase64Url(
    crypto.createHmac('sha256', secret).update(`${headerEncoded}.${payloadEncoded}`).digest()
  );
}

function signJwt(payload, secret, ttlSeconds) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const safeTtl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Math.floor(ttlSeconds) : 3600;

  const headerEncoded = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = toBase64Url(JSON.stringify({
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + safeTtl
  }));
  const signature = createSignature(headerEncoded, payloadEncoded, secret);

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

function verifyJwt(token, secret) {
  if (typeof token !== 'string') return { valid: false, reason: 'invalid-token' };

  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'invalid-format' };

  const [headerEncoded, payloadEncoded, providedSig] = parts;
  if (!headerEncoded || !payloadEncoded || !providedSig) {
    return { valid: false, reason: 'invalid-format' };
  }

  const expectedSig = createSignature(headerEncoded, payloadEncoded, secret);
  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  const signatureMatches = providedBuf.length === expectedBuf.length
    && crypto.timingSafeEqual(providedBuf, expectedBuf);

  if (!signatureMatches) return { valid: false, reason: 'invalid-signature' };

  const header = safeJsonParse(fromBase64Url(headerEncoded).toString('utf8'));
  const payload = safeJsonParse(fromBase64Url(payloadEncoded).toString('utf8'));
  if (!header || !payload) return { valid: false, reason: 'invalid-json' };
  if (header.alg !== 'HS256' || header.typ !== 'JWT') return { valid: false, reason: 'invalid-header' };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || nowSeconds >= payload.exp) {
    return { valid: false, reason: 'token-expired' };
  }

  return { valid: true, payload };
}

module.exports = {
  signJwt,
  verifyJwt
};
