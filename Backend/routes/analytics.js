const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { getAnalytics, trackVisitor, hashIp } = require('../utils/dataStore');
const { sendError } = require('../utils/http');
const router = express.Router();

// Get client IP helper
function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

// POST track visitor (called from frontend or middleware)
router.post('/track', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const userAgent = req.get('user-agent') || '';
    const referrer = req.get('referrer') || req.body.referrer || '';
    const path = req.body.path || req.path || '/';

    // Don't track bots (simple check)
    const botPattern = /bot|crawler|spider|crawling/i;
    if (botPattern.test(userAgent)) {
      return res.json({ success: true, tracked: false, reason: 'Bot detected' });
    }

    const result = await trackVisitor({
      ip,
      userAgent,
      referrer,
      path
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    // Silently fail - don't break the request
    res.json({ success: true, tracked: false, error: 'Tracking failed' });
  }
});

// GET analytics data (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const period = req.query.period || '24h';
    const validPeriods = ['24h', '7d', '30d', 'all'];
    
    if (!validPeriods.includes(period)) {
      return sendError(res, 400, 'Invalid period. Use: 24h, 7d, 30d, or all');
    }

    const result = await getAnalytics({ period });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    sendError(res, 500, 'Failed to fetch analytics', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// GET visitor hash (for debugging - returns hash only, never raw IP)
router.get('/hash', requireAdmin, (req, res) => {
  const ip = getClientIp(req);
  const hash = hashIp(ip);
  
  res.json({
    success: true,
    ipHash: hash,
    note: 'Raw IP is never stored, only this hash'
  });
});

module.exports = router;
