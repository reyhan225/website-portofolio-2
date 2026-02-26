const { createApp } = require('./app');
const {
  getAdminPassword,
  getAdminJwtSecret,
  getTokenTtlSeconds,
  getAdminEmail,
  getAdminBasePath
} = require('./middleware/adminAuth');
const { getDataStoreInfo } = require('./utils/dataStore');

const app = createApp();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.listen(PORT, () => {
  const dataStore = getDataStoreInfo();
  console.log(`\nPortfolio server running at http://localhost:${PORT}`);
  console.log(`Serving frontend from ../Frontend`);
  console.log(`Admin panel: http://localhost:${PORT}${getAdminBasePath()}`);
  console.log(`Admin email: ${getAdminEmail()}`);
  if (!isProduction) {
    console.log(`Default admin password: ${getAdminPassword()}`);
    console.log(`Dev JWT secret: ${getAdminJwtSecret()}`);
  }
  console.log(`Admin token TTL: ${getTokenTtlSeconds()} seconds`);
  console.log(`Data store: ${dataStore.mode} (${dataStore.dir})\n`);
});
