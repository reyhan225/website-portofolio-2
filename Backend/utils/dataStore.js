const fs = require('fs');
const path = require('path');
const firebase = require('./firebase');
const { admin } = firebase;

// Helper to get db (handles lazy initialization)
function getDb() {
  return firebase.db;
}

const DEFAULT_DATA_DIR = path.join(__dirname, '../data');
const VERCEL_DATA_DIR = path.join('/tmp', 'portfolio-data');

// In-memory cache for Vercel serverless environment (stores modifications)
const memoryCache = new Map();
// Track if we've loaded initial data
const initialDataLoaded = new Map();

function isVercelRuntime() {
  return process.env.VERCEL === '1';
}

function resolveDataDir() {
  const custom = (process.env.DATA_DIR || '').trim();
  if (custom) return path.resolve(custom);
  if (isVercelRuntime()) return VERCEL_DATA_DIR;
  return DEFAULT_DATA_DIR;
}

function ensureDataFile(fileName) {
  const dir = resolveDataDir();
  const targetPath = path.join(dir, fileName);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, '[]', 'utf8');
  }

  return targetPath;
}

async function readJsonArray(fileName) {
  // Use Firebase for messages
  const db = getDb();
  if (fileName === 'messages.json' && db) {
    try {
      const snapshot = await db.collection('messages').orderBy('timestamp', 'desc').get();
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      return messages;
    } catch (error) {
      console.error('Firebase read error:', error);
      return [];
    }
  }

  // On Vercel, first time: load from source data files, then apply memory cache
  if (isVercelRuntime()) {
    // If we have cached modifications, return merged data
    if (memoryCache.has(fileName)) {
      return memoryCache.get(fileName);
    }
    
    // First read in this instance - load from source files
    const sourcePath = path.join(DEFAULT_DATA_DIR, fileName);
    let baseData = [];
    
    try {
      if (fs.existsSync(sourcePath)) {
        const raw = fs.readFileSync(sourcePath, 'utf8');
        const parsed = JSON.parse(raw);
        baseData = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      baseData = [];
    }
    
    // Store in memory cache
    memoryCache.set(fileName, baseData);
    initialDataLoaded.set(fileName, true);
    
    return baseData;
  }

  // Local development - read from filesystem
  const filePath = ensureDataFile(fileName);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray(fileName, data) {
  // Use Firebase for messages
  const db = getDb();
  if (fileName === 'messages.json' && db) {
    try {
      // For messages, we add individual documents
      // This function is typically called with the full array, so we need to handle it differently
      // Instead, we'll use addMessage function in the routes
      memoryCache.set(fileName, data);
      return;
    } catch (error) {
      console.error('Firebase write error:', error);
    }
  }

  // Always update memory cache (works for both Vercel and local)
  memoryCache.set(fileName, data);

  // Also write to filesystem for local development
  if (!isVercelRuntime()) {
    const filePath = ensureDataFile(fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

// Add a single message to Firebase
async function addMessage(messageData) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const docRef = await db.collection('messages').add({
      ...messageData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    return { id: docRef.id, ...messageData };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

// Delete a message from Firebase
async function deleteMessage(messageId) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    await db.collection('messages').doc(messageId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

// Mark message as read
async function markMessageAsRead(messageId) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    await db.collection('messages').doc(messageId).update({
      read: true
    });
    return true;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

function getDataStoreInfo() {
  const dir = resolveDataDir();
  const mode = isVercelRuntime() ? 'ephemeral-tmp' : 'local-filesystem';
  return { mode, dir };
}

module.exports = {
  readJsonArray,
  writeJsonArray,
  getDataStoreInfo,
  addMessage,
  deleteMessage,
  markMessageAsRead
};
