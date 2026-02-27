const { createApp } = require('./app');
const {
  getAdminPassword,
  getAdminJwtSecret,
  getTokenTtlSeconds,
  getAdminEmail,
  getAdminBasePath
} = require('./middleware/adminAuth');
const { getDataStoreInfo } = require('./utils/dataStore');
const { checkFirebaseHealth } = require('./utils/firebase');

const app = createApp();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.listen(PORT, async () => {
  const dataStore = getDataStoreInfo();
  
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║      Portfolio Server - Firebase Firestore Edition     ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
  
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from ../Frontend`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}${getAdminBasePath()}`);
  console.log(`📧 Admin email: ${getAdminEmail()}`);
  
  if (!isProduction) {
    console.log(`🔑 Default admin password: ${getAdminPassword()}`);
    console.log(`📝 Dev JWT secret: ${getAdminJwtSecret()}`);
  }
  
  console.log(`⏱️  Admin token TTL: ${getTokenTtlSeconds()} seconds`);
  
  // Check Firebase connection
  const firebaseHealth = await checkFirebaseHealth();
  if (firebaseHealth.healthy) {
    console.log(`🔥 Firebase: Connected ✅`);
    console.log(`   Collections: ${firebaseHealth.collections.join(', ')}`);
  } else {
    console.log(`🔥 Firebase: Disconnected ❌`);
    console.log(`   Error: ${firebaseHealth.error}`);
  }
  
  console.log(`💾 Data store: ${dataStore.mode} (${dataStore.dir})`);
  console.log(`📊 Firebase connected: ${dataStore.firebaseConnected ? 'Yes' : 'No'}`);
  console.log(`\n✨ Ready for requests!\n`);
});
