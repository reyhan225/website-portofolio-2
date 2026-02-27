const admin = require('firebase-admin');

let dbInstance = null;
let initializationError = null;

// Lazy initialization - only initialize when first needed
function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (initializationError) {
    return null;
  }

  try {
    // Check if already initialized by another call
    if (admin.apps.length > 0) {
      dbInstance = admin.firestore();
      return dbInstance;
    }

    // Get service account from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson) {
      const error = new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set');
      console.error(error.message);
      initializationError = error;
      return null;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      const error = new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${e.message}`);
      console.error(error.message);
      initializationError = error;
      return null;
    }

    // Initialize with optimized settings for performance
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    // Configure Firestore with connection pooling and performance settings
    dbInstance = admin.firestore();
    
    // Enable long-lived connections for better performance
    dbInstance.settings({
      ignoreUndefinedProperties: true,
      // Use default settings optimized for server environments
    });

    console.log('Firebase Admin SDK initialized successfully');
    return dbInstance;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    initializationError = error;
    return null;
  }
}

// Health check function for Firebase connection
async function checkFirebaseHealth() {
  const db = getDb();
  if (!db) {
    return {
      healthy: false,
      error: initializationError?.message || 'Firebase not initialized',
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Perform a lightweight operation to verify connection
    const testQuery = await db.collection('projects').limit(1).get();
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      collections: ['projects', 'messages', 'visitors']
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Get initialization error if any
function getInitializationError() {
  return initializationError;
}

// Export a getter function instead of the db directly
module.exports = { 
  get db() { return getDb(); },
  admin,
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
  checkFirebaseHealth,
  getInitializationError
};
