const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { readJsonArray, addMessage, deleteMessage, markMessageAsRead } = require('../utils/dataStore');
const { validateContactPayload } = require('../utils/validators');
const { sendError } = require('../utils/http');
const router = express.Router();

async function readMessages() {
  return await readJsonArray('messages.json');
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

// GET all messages (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const messages = await readMessages();
    res.json(messages);
  } catch {
    sendError(res, 500, 'Failed to read messages');
  }
});

// POST new message
router.post('/', async (req, res) => {
  const validation = validateContactPayload(req.body);
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const { name, email, subject, message } = req.body;
    const newMsg = {
      name: sanitizeString(name),
      email: sanitizeString(email).slice(0, 200),
      subject: sanitizeString(subject || 'No Subject'),
      message: sanitizeString(message),
      createdAt: new Date().toISOString(),
      read: false
    };
    await addMessage(newMsg);
    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    sendError(res, 500, 'Failed to store message: ' + error.message);
  }
});

// DELETE message (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteMessage(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch {
    sendError(res, 500, 'Failed to delete message');
  }
});

// PATCH mark as read
router.patch('/:id/read', requireAdmin, async (req, res) => {
  try {
    await markMessageAsRead(req.params.id);
    res.json({ success: true, id: req.params.id, read: true });
  } catch {
    sendError(res, 500, 'Failed to update message');
  }
});

// PATCH mark all as read
router.patch('/read-all', requireAdmin, async (req, res) => {
  try {
    const messages = await readMessages();
    let changed = 0;
    for (const msg of messages) {
      if (!msg.read) {
        await markMessageAsRead(msg.id);
        changed += 1;
      }
    }
    res.json({ success: true, updated: changed, total: messages.length });
  } catch {
    sendError(res, 500, 'Failed to update messages');
  }
});

module.exports = router;
