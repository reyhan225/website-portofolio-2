const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { 
  getMessages, 
  addMessage, 
  deleteMessage, 
  markMessageAsRead,
  markAllMessagesAsRead 
} = require('../utils/dataStore');
const { validateContactPayload } = require('../utils/validators');
const { sendError } = require('../utils/http');
const router = express.Router();

// Anti-bot honeypot check
function checkHoneypot(body) {
  // Honeypot field - should be empty
  if (body.website !== undefined && body.website !== '') {
    return { ok: false, error: 'Spam detected' };
  }
  
  // Timestamp check - form submitted too quickly (less than 3 seconds)
  if (body._timestamp) {
    const submitTime = parseInt(body._timestamp, 10);
    const now = Date.now();
    if (now - submitTime < 3000) {
      return { ok: false, error: 'Form submitted too quickly' };
    }
  }
  
  return { ok: true };
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

// Normalize message data (convert Firestore timestamps)
function normalizeMessage(message) {
  if (!message) return null;
  
  const timestamp = message.timestamp?.toDate?.() 
    ? message.timestamp.toDate().toISOString() 
    : message.timestamp;
    
  const createdAt = message.createdAt?.toDate?.() 
    ? message.createdAt.toDate().toISOString() 
    : message.createdAt;

  return {
    ...message,
    timestamp,
    createdAt
  };
}

// GET all messages with pagination (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const unreadOnly = req.query.unread === 'true';

    const result = await getMessages({ page, limit, unreadOnly });
    
    res.json({
      success: true,
      data: result.data.map(normalizeMessage),
      pagination: result.pagination,
      fromCache: result.fromCache || false
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    sendError(res, 500, 'Failed to fetch messages', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// POST new message
router.post('/', async (req, res) => {
  // Check honeypot anti-bot
  const honeypotCheck = checkHoneypot(req.body);
  if (!honeypotCheck.ok) {
    return sendError(res, 400, honeypotCheck.error);
  }

  const validation = validateContactPayload(req.body);
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const { name, email, subject, message } = req.body;
    const newMsg = {
      name: sanitizeString(name),
      email: sanitizeString(email).slice(0, 200),
      subject: sanitizeString(subject || 'No Subject'),
      message: sanitizeString(message),
      read: false
    };
    
    const result = await addMessage(newMsg);
    
    res.status(201).json({ 
      success: true,
      message: 'Message sent successfully!',
      id: result.id
    });
  } catch (error) {
    console.error('Contact form error:', error);
    sendError(res, 500, 'Failed to store message', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// DELETE message (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteMessage(req.params.id);
    res.json({ 
      success: true, 
      message: 'Message deleted successfully',
      id: req.params.id 
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    sendError(res, 500, 'Failed to delete message', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// PATCH mark as read
router.patch('/:id/read', requireAdmin, async (req, res) => {
  try {
    await markMessageAsRead(req.params.id);
    res.json({ 
      success: true, 
      message: 'Message marked as read',
      id: req.params.id, 
      read: true 
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    sendError(res, 500, 'Failed to update message', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// PATCH mark all as read
router.patch('/read-all', requireAdmin, async (req, res) => {
  try {
    const result = await markAllMessagesAsRead();
    res.json({ 
      success: true, 
      message: 'All messages marked as read',
      updated: result.updated
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    sendError(res, 500, 'Failed to update messages', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

module.exports = router;
