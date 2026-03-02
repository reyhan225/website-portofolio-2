const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const firebase = require('./firebase');
const { cache, cacheKeys, cacheTTL } = require('./cache');
const { admin, FieldValue, Timestamp } = firebase;

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

// ==================== PROJECTS (Firestore) ====================

/**
 * Get projects from local JSON file (fallback when Firebase is unavailable)
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.category - Filter by category (optional)
 * @returns {Promise<Object>} Paginated results
 */
async function getProjectsFromFile({ page = 1, limit = 10, category = null } = {}) {
  const filePath = path.join(DEFAULT_DATA_DIR, 'projects.json');
  
  try {
    let projects = [];
    
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      projects = Array.isArray(parsed) ? parsed : [];
    }
    
    // Apply category filter if provided
    if (category) {
      projects = projects.filter(p => p.category === category);
    }
    
    const total = projects.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedData = projects.slice(offset, offset + limit);
    
    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      fromCache: false
    };
  } catch (error) {
    console.error('Error reading projects from file:', error);
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      fromCache: false
    };
  }
}

/**
 * Get projects with pagination and caching
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.category - Filter by category (optional)
 * @returns {Promise<Object>} Paginated results
 */
async function getProjects({ page = 1, limit = 10, category = null } = {}) {
  const db = getDb();
  
  // Fallback to local JSON file if Firebase is not available
  if (!db) {
    console.log('Firebase not available, using local JSON fallback for projects');
    return getProjectsFromFile({ page, limit, category });
  }

  // Check cache first
  const cacheKey = cacheKeys.projects(page, limit) + (category ? `:cat:${category}` : '');
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    let query = db.collection('projects')
      .orderBy('createdAt', 'desc');

    // Apply category filter if provided
    if (category) {
      query = query.where('category', '==', category);
    }

    // Get total count for pagination (use a separate lightweight query)
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // If Firestore has no projects, fall back to local JSON seed data
    if (total === 0) {
      console.warn('No projects found in Firestore; serving local projects.json seed');
      return getProjectsFromFile({ page, limit, category });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const snapshot = await query.get();
    const projects = [];
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });

    const result = {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache the result
    cache.set(cacheKey, result, cacheTTL.projects);
    return result;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Get a single project by ID
 * @param {string} id - Project ID
 * @returns {Promise<Object|null>} Project data or null
 */
async function getProjectById(id) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Check cache first
  const cacheKey = cacheKeys.project(id);
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    const doc = await db.collection('projects').doc(id).get();
    if (!doc.exists) {
      return null;
    }

    const project = { id: doc.id, ...doc.data() };
    cache.set(cacheKey, project, cacheTTL.project);
    return project;
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project with ID
 */
async function createProject(projectData) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const projectRef = db.collection('projects').doc();
    const newProject = {
      ...projectData,
      id: projectRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await projectRef.set(newProject);
    
    // Invalidate projects list cache (individual project not cached yet)
    cache.delete(cacheKeys.projects());
    
    return { id: projectRef.id, ...projectData };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Update a project
 * @param {string} id - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated project
 */
async function updateProject(id, updates) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const projectRef = db.collection('projects').doc(id);
    const doc = await projectRef.get();
    
    if (!doc.exists) {
      throw new Error('Project not found');
    }

    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    };

    await projectRef.update(updateData);
    
    // Invalidate caches
    cache.delete(cacheKeys.project(id));
    cache.delete(cacheKeys.projects());
    
    return { id, ...doc.data(), ...updates };
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Delete a project
 * @param {string} id - Project ID
 * @returns {Promise<boolean>}
 */
async function deleteProject(id) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    await db.collection('projects').doc(id).delete();
    
    // Invalidate caches
    cache.delete(cacheKeys.project(id));
    cache.delete(cacheKeys.projects());
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// ==================== MESSAGES (Firestore) ====================

/**
 * Get messages with pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {boolean} options.unreadOnly - Filter unread only
 * @returns {Promise<Object>} Paginated results
 */
async function getMessages({ page = 1, limit = 20, unreadOnly = false } = {}) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Check cache first (only for non-unread queries)
  const cacheKey = cacheKeys.messages(page, limit) + (unreadOnly ? ':unread' : '');
  if (!unreadOnly) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }

  try {
    let query = db.collection('messages')
      .orderBy('timestamp', 'desc');

    if (unreadOnly) {
      query = query.where('read', '==', false);
    }

    // Get total count
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const snapshot = await query.get();
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    const result = {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache only if not unread-only (frequently changing)
    if (!unreadOnly) {
      cache.set(cacheKey, result, cacheTTL.messages);
    }

    return result;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Add a single message to Firebase
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message
 */
async function addMessage(messageData) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const docRef = await db.collection('messages').add({
      ...messageData,
      timestamp: FieldValue.serverTimestamp(),
      read: false
    });
    
    // Invalidate messages cache
    cache.delete(cacheKeys.messages());
    
    return { id: docRef.id, ...messageData };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Delete a message from Firebase
 * @param {string} messageId - Message ID
 * @returns {Promise<boolean>}
 */
async function deleteMessage(messageId) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    await db.collection('messages').doc(messageId).delete();
    
    // Invalidate cache
    cache.delete(cacheKeys.messages());
    
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Mark message as read
 * @param {string} messageId - Message ID
 * @returns {Promise<boolean>}
 */
async function markMessageAsRead(messageId) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    await db.collection('messages').doc(messageId).update({
      read: true
    });
    
    // Invalidate cache
    cache.delete(cacheKeys.messages());
    
    return true;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

/**
 * Mark all messages as read
 * @returns {Promise<Object>} Update result
 */
async function markAllMessagesAsRead() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const batch = db.batch();
    const unreadQuery = await db.collection('messages')
      .where('read', '==', false)
      .limit(500) // Batch limit
      .get();

    let count = 0;
    unreadQuery.forEach(doc => {
      batch.update(doc.ref, { read: true });
      count++;
    });

    await batch.commit();
    
    // Invalidate cache
    cache.delete(cacheKeys.messages());
    
    return { updated: count };
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    throw error;
  }
}

// ==================== TESTIMONIALS (Firestore) ====================

/**
 * Get testimonials with pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {boolean} options.approved - Filter by approval status (optional)
 * @returns {Promise<Object>} Paginated results
 */
async function getTestimonials({ page = 1, limit = 10, approved = null } = {}) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Check cache first (only for approved queries)
  const cacheKey = cacheKeys.testimonials(page, limit, approved);
  if (approved !== null) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }

  try {
    let query = db.collection('testimonials')
      .orderBy('createdAt', 'desc');

    if (approved !== null) {
      query = query.where('approved', '==', approved);
    }

    // Get total count
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const snapshot = await query.get();
    const testimonials = [];
    snapshot.forEach(doc => {
      testimonials.push({ id: doc.id, ...doc.data() });
    });

    const result = {
      data: testimonials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache for approved queries only
    if (approved !== null) {
      cache.set(cacheKey, result, cacheTTL.testimonials);
    }

    return result;
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw error;
  }
}

/**
 * Get single testimonial by ID
 * @param {string} id - Testimonial ID
 * @returns {Promise<Object|null>} Testimonial data or null
 */
async function getTestimonialById(id) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const doc = await db.collection('testimonials').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    throw error;
  }
}

/**
 * Create a new testimonial
 * @param {Object} testimonialData - Testimonial data
 * @returns {Promise<Object>} Created testimonial with ID
 */
async function createTestimonial(testimonialData) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const now = Timestamp.now();
    const docRef = await db.collection('testimonials').add({
      author: testimonialData.author || '',
      position: testimonialData.position || '',
      company: testimonialData.company || '',
      content: testimonialData.content || '',
      rating: testimonialData.rating || 5,
      email: testimonialData.email || '',
      approved: testimonialData.approved || false,
      createdAt: now,
      updatedAt: now
    });

    // Invalidate cache
    cache.delete(cacheKeys.testimonials());

    return {
      id: docRef.id,
      ...testimonialData,
      createdAt: now,
      updatedAt: now
    };
  } catch (error) {
    console.error('Error creating testimonial:', error);
    throw error;
  }
}

/**
 * Update testimonial
 * @param {string} id - Testimonial ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated testimonial or null
 */
async function updateTestimonial(id, updates) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = db.collection('testimonials').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const updatedAt = Timestamp.now();
    const updateData = {
      ...updates,
      updatedAt
    };

    await docRef.update(updateData);

    // Invalidate cache
    cache.delete(cacheKeys.testimonials());

    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    console.error('Error updating testimonial:', error);
    throw error;
  }
}

/**
 * Approve a testimonial
 * @param {string} id - Testimonial ID
 * @returns {Promise<Object|null>} Updated testimonial or null
 */
async function approveTestimonial(id) {
  return updateTestimonial(id, { approved: true });
}

/**
 * Delete testimonial
 * @param {string} id - Testimonial ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteTestimonial(id) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = db.collection('testimonials').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();

    // Invalidate cache
    cache.delete(cacheKeys.testimonials());

    return true;
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    throw error;
  }
}

// ==================== VISITORS / ANALYTICS (Firestore) ====================

/**
 * Hash IP address for privacy (SHA-256)
 * @param {string} ip - IP address
 * @returns {string} Hashed IP
 */
function hashIp(ip) {
  if (!ip || typeof ip !== 'string') return '';
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

/**
 * Track a visitor
 * @param {Object} visitorData - Visitor information
 * @param {string} visitorData.ip - IP address (will be hashed)
 * @param {string} visitorData.userAgent - User agent string
 * @param {string} visitorData.referrer - Referrer URL
 * @param {string} visitorData.path - Request path
 * @returns {Promise<Object>} Tracking result
 */
async function trackVisitor({ ip, userAgent, referrer, path }) {
  const db = getDb();
  if (!db) {
    // Silently fail if Firebase not available (don't break the app)
    return { tracked: false, reason: 'Firebase not initialized' };
  }

  try {
    const ipHash = hashIp(ip);
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Use a composite key for daily unique visitors
    const visitorId = `${ipHash}_${today}`;
    const visitorRef = db.collection('visitors').doc(visitorId);

    const doc = await visitorRef.get();
    
    if (!doc.exists) {
      // New unique visitor for today
      await visitorRef.set({
        ipHash, // Hashed IP only, never raw IP
        firstSeen: FieldValue.serverTimestamp(),
        lastSeen: FieldValue.serverTimestamp(),
        date: today,
        visits: 1,
        userAgent: userAgent ? userAgent.substring(0, 200) : '', // Truncate
        referrer: referrer ? referrer.substring(0, 500) : '',
        paths: [path ? path.substring(0, 200) : '/']
      });
    } else {
      // Returning visitor today - update last seen
      const data = doc.data();
      const paths = data.paths || [];
      if (path && !paths.includes(path.substring(0, 200))) {
        paths.push(path.substring(0, 200));
      }
      
      await visitorRef.update({
        lastSeen: FieldValue.serverTimestamp(),
        visits: FieldValue.increment(1),
        paths: paths.slice(-10) // Keep last 10 paths only
      });
    }

    return { tracked: true, visitorId, isNew: !doc.exists };
  } catch (error) {
    console.error('Error tracking visitor:', error);
    // Silently fail - don't break the request
    return { tracked: false, error: error.message };
  }
}

/**
 * Get analytics data
 * @param {Object} options - Query options
 * @param {string} options.period - Period: '24h', '7d', '30d', 'all'
 * @returns {Promise<Object>} Analytics data
 */
async function getAnalytics({ period = '24h' } = {}) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Check cache
  const cacheKey = cacheKeys.analytics(period);
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    let startDate;
    const now = new Date();

    switch (period) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }

    let query = db.collection('visitors');
    
    if (startDate) {
      query = query.where('lastSeen', '>=', Timestamp.fromDate(startDate));
    }

    const snapshot = await query.get();
    
    let totalVisitors = 0;
    let totalVisits = 0;
    const uniqueDays = new Set();
    const referrers = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalVisitors++;
      totalVisits += data.visits || 1;
      uniqueDays.add(data.date);
      
      if (data.referrer) {
        const ref = data.referrer.substring(0, 100);
        referrers[ref] = (referrers[ref] || 0) + 1;
      }
    });

    const result = {
      period,
      summary: {
        uniqueVisitors: totalVisitors,
        totalVisits,
        activeDays: uniqueDays.size
      },
      referrers: Object.entries(referrers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([url, count]) => ({ url, count })),
      generatedAt: new Date().toISOString()
    };

    // Cache result
    cache.set(cacheKey, result, cacheTTL.analytics);
    return result;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
}

// ==================== LEGACY FILE-BASED (Fallback) ====================

async function readJsonArray(fileName) {
  // Use Firebase for messages
  const db = getDb();
  if (fileName === 'messages.json' && db) {
    try {
      const result = await getMessages({ page: 1, limit: 1000 });
      return result.data;
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

function getDataStoreInfo() {
  const db = getDb();
  const dir = resolveDataDir();
  const mode = db ? 'firebase-firestore' : (isVercelRuntime() ? 'ephemeral-tmp' : 'local-filesystem');
  return { mode, dir, firebaseConnected: !!db };
}

module.exports = {
  // Projects
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  
  // Messages
  getMessages,
  addMessage,
  deleteMessage,
  markMessageAsRead,
  markAllMessagesAsRead,

  // Testimonials
  getTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  approveTestimonial,
  deleteTestimonial,
  
  // Analytics
  trackVisitor,
  getAnalytics,
  hashIp,
  
  // Legacy (for backward compatibility)
  readJsonArray,
  writeJsonArray,
  getDataStoreInfo
};
