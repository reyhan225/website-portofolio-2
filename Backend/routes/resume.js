const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const router = express.Router();

/**
 * GET /api/resume/download - Download the CV/Resume
 * Returns a default or uploaded CV as PDF/download
 */
router.get('/download', (req, res) => {
  try {
    // For now, provide a link to download from a URL
    // In production, you can:
    // 1. Store CV metadata in Firestore
    // 2. Return the download link
    // 3. Or serve the PDF file directly

    const cvUrl = process.env.CV_URL || 'https://reyhan-muhamad-rizki.vercel.app/cv.pdf';

    res.json({
      success: true,
      downloadUrl: cvUrl,
      filename: 'Reyhan-Muhamad-Rizki-CV.pdf',
      message: 'CV download link'
    });
  } catch (error) {
    console.error('Error getting CV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CV'
    });
  }
});

/**
 * GET /api/resume/metadata - Get CV metadata (admin only)
 */
router.get('/metadata', requireAdmin, (req, res) => {
  try {
    const metadata = {
      lastUpdated: process.env.CV_UPDATED_AT || new Date().toISOString(),
      url: process.env.CV_URL || 'Not configured',
      version: '1.0',
      filename: 'Reyhan-Muhamad-Rizki-CV.pdf'
    };

    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Error getting CV metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CV metadata'
    });
  }
});

/**
 * POST /api/resume/track - Track CV downloads
 * Logs when a CV is downloaded
 */
router.post('/track', (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    console.log(`[CV Download] IP: ${ip}, UA: ${userAgent}`);

    // In production: Save to database
    // await logCvDownload({ ip, userAgent, timestamp: new Date() });

    res.json({
      success: true,
      message: 'Download tracked'
    });
  } catch (error) {
    console.error('Error tracking CV download:', error);
    // Fail silently
    res.json({ success: true });
  }
});

module.exports = router;
