const express = require('express');
const cors = require('cors');
const path = require('path');
const { URL } = require('url');
const rateLimit = require('express-rate-limit');
const {
  getAdminPassword,
  getTokenTtlSeconds,
  getAdminEmail,
  getAdminBasePath,
  enforceAdminIp,
  compareAdminPassword,
  issueAdminToken
} = require('./middleware/adminAuth');
const { getDataStoreInfo } = require('./utils/dataStore');
const {
  getLoginStatus,
  registerLoginFailure,
  resetLoginFailures
} = require('./utils/loginGuard');
const { validateLoginPayload } = require('./utils/validators');
const { sendError } = require('./utils/http');

const projectsRouter = require('./routes/projects');
const contactRouter = require('./routes/contact');

const isProduction = process.env.NODE_ENV === 'production';
const OLD_DOMAIN = 'website-portofolio-2.vercel.app';
const NEW_DOMAIN = 'reyhan-muhamad-rizki.vercel.app';

function assertProductionEnv() {
  if (!isProduction) return;
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('Missing ADMIN_PASSWORD in production.');
  }
  if (!process.env.ADMIN_JWT_SECRET) {
    throw new Error('Missing ADMIN_JWT_SECRET in production.');
  }
}

function buildAllowedOrigins() {
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ];
  const extras = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  return new Set([...defaults, ...extras]);
}

function getRequestHost(req) {
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  return String(host).trim().toLowerCase();
}

function isSameOriginRequest(req, origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host.toLowerCase() === getRequestHost(req);
  } catch {
    return false;
  }
}

function createApp() {
  assertProductionEnv();
  const app = express();
  const allowedOrigins = buildAllowedOrigins();
  const adminBasePath = getAdminBasePath();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.secure || process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return next();
  });

  app.use((req, res, next) => {
    const host = getRequestHost(req);
    if (host !== OLD_DOMAIN) return next();

    const target = `https://${NEW_DOMAIN}${req.originalUrl || '/'}`;
    return res.redirect(308, target);
  });

  app.use((req, res, next) => {
    const origin = req.get('origin');
    const isAllowed = !origin || allowedOrigins.has(origin) || isSameOriginRequest(req, origin);
    const options = {
      origin: isAllowed,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

    return cors(options)(req, res, (err) => {
      if (err || !isAllowed) return next(new Error('Not allowed by CORS'));
      return next();
    });
  });

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });

  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Too many messages sent. Please wait before sending again.' }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' }
  });

  const adminWriteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many admin write actions. Please try again later.' }
  });

  app.use('/api/', apiLimiter);
  app.use('/api/contact', (req, res, next) => {
    if (req.method === 'POST') return contactLimiter(req, res, next);
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      return adminWriteLimiter(req, res, next);
    }
    return next();
  });
  app.use('/api/projects', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      return adminWriteLimiter(req, res, next);
    }
    return next();
  });

  app.get('/admin.html', (req, res) => {
    res.redirect(301, adminBasePath);
  });

  app.use(express.static(path.join(__dirname, '../Frontend')));

  app.use('/api/projects', projectsRouter);
  app.use('/api/contact', contactRouter);

  app.post('/api/auth/login', loginLimiter, enforceAdminIp, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    const lock = getLoginStatus(req);
    if (lock.blocked) {
      res.setHeader('Retry-After', String(lock.retryAfterSec));
      return sendError(res, 429, 'Too many failed logins. Try again later.');
    }

    const validation = validateLoginPayload(req.body);
    if (!validation.ok) {
      registerLoginFailure(req);
      return sendError(res, 400, validation.error);
    }

    const password = req.body.password.trim();
    const adminPassword = getAdminPassword();
    if (!adminPassword || !compareAdminPassword(password, adminPassword)) {
      registerLoginFailure(req);
      return sendError(res, 401, 'Invalid password');
    }

    resetLoginFailures(req);
    const token = issueAdminToken();
    return res.json({
      success: true,
      token,
      expiresIn: getTokenTtlSeconds()
    });
  });

  app.get('/api/meta', (req, res) => {
    const dataStore = getDataStoreInfo();
    res.json({
      success: true,
      adminEmail: getAdminEmail(),
      adminBasePath,
      tokenTtlSeconds: getTokenTtlSeconds(),
      dataStoreMode: dataStore.mode
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
  });

  app.get(adminBasePath, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, '../Frontend/admin.html'));
  });

  app.use((err, req, res, next) => {
    if (!err) return next();
    if (err.message === 'Not allowed by CORS') {
      return sendError(res, 403, 'Origin is not allowed');
    }
    return sendError(res, 500, 'Internal server error');
  });

  app.use('/api', (req, res) => {
    sendError(res, 404, 'API endpoint not found');
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
  });

  return app;
}

module.exports = { createApp };
