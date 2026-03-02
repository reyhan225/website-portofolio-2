// Simple in-memory cache with TTL support
// Optimized for serverless environments like Vercel

class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set a value in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 60)
   */
  set(key, value, ttlSeconds = 60) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store the value with timestamp
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached values
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries
    };
  }
}

// Create singleton instance
const cache = new Cache();

// Cache key generators for common patterns
const cacheKeys = {
  projects: (page = 1, limit = 10) => `projects:page:${page}:limit:${limit}`,
  project: (id) => `project:${id}`,
  messages: (page = 1, limit = 20) => `messages:page:${page}:limit:${limit}`,
  testimonials: (page = 1, limit = 10, approved = null) => `testimonials:page:${page}:limit:${limit}:approved:${approved}`,
  analytics: (period = '24h') => `analytics:${period}`,
  health: () => 'health:status'
};

// Cache TTL configurations (in seconds)
const cacheTTL = {
  projects: 300,      // 5 minutes
  project: 600,       // 10 minutes
  messages: 60,       // 1 minute (frequently changing)
  testimonials: 300,  // 5 minutes (approved testimonials)
  analytics: 300,     // 5 minutes
  health: 30          // 30 seconds
};

module.exports = {
  cache,
  cacheKeys,
  cacheTTL,
  Cache
};
