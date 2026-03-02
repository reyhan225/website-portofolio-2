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
  issueAdminToken,
  requireAdmin
} = require('./middleware/adminAuth');
const { getDataStoreInfo } = require('./utils/dataStore');
const {
  getLoginStatus,
  registerLoginFailure,
  resetLoginFailures
} = require('./utils/loginGuard');
const { validateLoginPayload } = require('./utils/validators');
const { sendError } = require('./utils/http');
const { checkFirebaseHealth } = require('./utils/firebase');
const { cache } = require('./utils/cache');

const projectsRouter = require('./routes/projects');
const contactRouter = require('./routes/contact');
const analyticsRouter = require('./routes/analytics');
const testimonialsRouter = require('./routes/testimonials');
const resumeRouter = require('./routes/resume');

const isProduction = process.env.NODE_ENV === 'production';
const OLD_DOMAIN = 'website-portofolio-2.vercel.app';
const NEW_DOMAIN = 'reyhan-muhamad-rizki.vercel.app';
const ADMIN_DOMAIN = 'admin-reyhan-muhamad-rizki.vercel.app';

function assertProductionEnv() {
  if (!isProduction) return;
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('Missing ADMIN_PASSWORD in production.');
  }
  if (!process.env.ADMIN_JWT_SECRET) {
    throw new Error('Missing ADMIN_JWT_SECRET in production.');
  }
  if (!process.env.ADMIN_ALLOWED_IPS) {
    throw new Error('Missing ADMIN_ALLOWED_IPS in production. Set at least one static IP (CSV).');
  }
}

function buildAllowedOrigins() {
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    `https://${NEW_DOMAIN}`,
    `https://${OLD_DOMAIN}`,
    `https://${ADMIN_DOMAIN}`
  ];
  const extras = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const normalized = [...defaults, ...extras]
    .map(normalizeOrigin)
    .filter(Boolean);

  return new Set(normalized);
}

function getRequestHost(req) {
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  return normalizeHost(host);
}

function normalizeHost(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function isSameOriginRequest(req, origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return normalizeHost(parsed.host) === getRequestHost(req);
  } catch {
    return false;
  }
}

function isAllowedVercelDeployment(origin) {
  // Explicitly allow only known deployments; avoid prefix wildcards
  const allowedHosts = new Set([
    'reyhan-muhamad-rizki.vercel.app',
    'admin-reyhan-muhamad-rizki.vercel.app',
    'website-portofolio-2.vercel.app'
  ]);
  try {
    const host = new URL(origin).host.toLowerCase();
    return allowedHosts.has(host);
  } catch {
    return false;
  }
}

function isAllowedOrigin({ origin, normalizedOrigin, req, allowedOrigins }) {
  if (!origin) return true;
  if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) return true;
  if (isSameOriginRequest(req, origin)) return true;
  if (isAllowedVercelDeployment(origin)) return true;
  return false;
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
    if (host !== ADMIN_DOMAIN) return next();
    if (req.path === adminBasePath) return next();
    if (req.path.startsWith('/api/')) return next();
    if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/icons/')) {
      return next();
    }

    const target = `https://${ADMIN_DOMAIN}${adminBasePath}`;
    return res.redirect(308, target);
  });

  app.use((req, res, next) => {
    const host = getRequestHost(req);
    if (host !== OLD_DOMAIN) return next();

    const target = `https://${NEW_DOMAIN}${req.originalUrl || '/'}`;
    return res.redirect(308, target);
  });

  app.use((req, res, next) => {
    const origin = req.get('origin');
    const normalizedOrigin = normalizeOrigin(origin);
    const isAllowed = isAllowedOrigin({ origin, normalizedOrigin, req, allowedOrigins });
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

  const testimonialLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    message: { error: 'Too many testimonials. Please try again later.' }
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
  app.use('/api/testimonials', (req, res, next) => {
    if (req.method === 'POST') return testimonialLimiter(req, res, next);
    if (req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST' && req.path.endsWith('/approve')) {
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

  // Performance logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    req.requestId = requestId;
    req.startTime = start;
    
    // Log request start in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${requestId}] ${req.method} ${req.path} - Started`);
    }
    
    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      
      // Log slow requests (> 1000ms) in production, all in development
      if (process.env.NODE_ENV !== 'production' || duration > 1000) {
        console.log(`[${requestId}] ${req.method} ${req.path} - ${status} - ${duration}ms`);
      }
    });
    
    next();
  });

  app.use(express.static(path.join(__dirname, '../Frontend')));

  app.use('/api/projects', projectsRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/testimonials', testimonialsRouter);
  app.use('/api/resume', resumeRouter);
  app.use('/api/analytics', analyticsRouter);

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

  app.get('/api/health', async (req, res) => {
    const firebaseHealth = await checkFirebaseHealth();
    const cacheStats = cache.getStats();
    
    res.json({ 
      success: true, 
      message: 'Server is running', 
      timestamp: new Date().toISOString(),
      firebase: firebaseHealth,
      cache: cacheStats,
      uptime: process.uptime()
    });
  });

  // Cache stats endpoint (admin)
  app.get('/api/cache/stats', requireAdmin, (req, res) => {
    res.json({
      success: true,
      cache: cache.getStats()
    });
  });

  // Clear cache endpoint (admin)
  app.post('/api/cache/clear', requireAdmin, (req, res) => {
    cache.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  });

  app.get(adminBasePath, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, '../Frontend/admin.html'));
  });

  // Centralized error handler
  app.use((err, req, res, next) => {
    if (!err) return next();
    
    // Log error with request context
    const requestId = req.requestId || 'unknown';
    const duration = req.startTime ? Date.now() - req.startTime : 'unknown';
    
    console.error(`[${requestId}] Error: ${err.message} (${duration}ms)`);
    
    if (err.message === 'Not allowed by CORS') {
      return sendError(res, 403, 'Origin is not allowed');
    }
    
    // Firestore-specific errors
    if (err.code && err.code.startsWith('firestore/')) {
      return sendError(res, 503, 'Database service unavailable. Please try again later.');
    }
    
    if (err.message?.includes('Firebase not initialized')) {
      return sendError(res, 503, 'Database connection error. Please try again later.');
    }
    
    // Validation errors
    if (err.name === 'ValidationError') {
      return sendError(res, 400, err.message);
    }
    
    // Default error response
    const isDev = process.env.NODE_ENV === 'development';
    return sendError(res, 500, 'Internal server error', isDev ? err.message : undefined);
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
