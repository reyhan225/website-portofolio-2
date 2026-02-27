const admin = require('firebase-admin');

let dbInstance = null;

// Lazy initialization - only initialize when first needed
function getDb() {
  if (dbInstance) {
    return dbInstance;
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
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set');
      return null;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin SDK initialized successfully');
    dbInstance = admin.firestore();
    return dbInstance;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
}

// Export a getter function instead of the db directly
module.exports = { 
  get db() { return getDb(); },
  admin 
};
