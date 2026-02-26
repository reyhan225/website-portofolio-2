const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { readJsonArray, writeJsonArray } = require('../utils/dataStore');
const { validateContactPayload } = require('../utils/validators');
const { sendError } = require('../utils/http');
const router = express.Router();

function readMessages() {
  return readJsonArray('messages.json');
}

function writeMessages(data) {
  writeJsonArray('messages.json', data);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

// GET all messages (admin)
router.get('/', requireAdmin, (req, res) => {
  const messages = readMessages();
  res.json(messages);
});

// POST new message
router.post('/', (req, res) => {
  const validation = validateContactPayload(req.body);
  if (!validation.ok) return sendError(res, 400, validation.error);

  try {
    const { name, email, subject, message } = req.body;
    const messages = readMessages();
    const timestamp = new Date().toISOString();
    const newMsg = {
      id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      name: sanitizeString(name),
      email: sanitizeString(email).slice(0, 200),
      subject: sanitizeString(subject || 'No Subject'),
      message: sanitizeString(message),
      timestamp,
      createdAt: timestamp,
      read: false
    };
    messages.push(newMsg);
    writeMessages(messages);
    res.status(201).json({ message: 'Message sent successfully!' });
  } catch {
    sendError(res, 500, 'Failed to store message');
  }
});

// DELETE message (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const messages = readMessages();
    const idx = messages.findIndex(m => String(m.id) === String(req.params.id));
    if (idx === -1) return sendError(res, 404, 'Message not found');
    const deleted = messages.splice(idx, 1)[0];
    writeMessages(messages);
    res.json(deleted);
  } catch {
    sendError(res, 500, 'Failed to delete message');
  }
});

// PATCH mark as read
router.patch('/:id/read', requireAdmin, (req, res) => {
  try {
    const messages = readMessages();
    const idx = messages.findIndex(m => String(m.id) === String(req.params.id));
    if (idx === -1) return sendError(res, 404, 'Message not found');
    messages[idx].read = true;
    writeMessages(messages);
    res.json(messages[idx]);
  } catch {
    sendError(res, 500, 'Failed to update message');
  }
});

// PATCH mark all as read
router.patch('/read-all', requireAdmin, (req, res) => {
  try {
    const messages = readMessages();
    let changed = 0;
    const updated = messages.map(msg => {
      if (!msg.read) {
        changed += 1;
        return { ...msg, read: true };
      }
      return msg;
    });
    writeMessages(updated);
    res.json({ success: true, updated: changed, total: updated.length });
  } catch {
    sendError(res, 500, 'Failed to update messages');
  }
});

module.exports = router;
