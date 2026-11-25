const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { runRetentionCleanup, startCleanupCron } = require('./src/services/cleanupService');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    runRetentionCleanup();
    startCleanupCron();
  })
  .catch((err) => {
    console.error(`[MongoDB Connection Error]: ${err.message}`);
    process.exit(1);
  });

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 GymCentric API Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 WhatsApp 2FA OTP Authentication: ENABLED`);
  console.log(`===============================================`);
});

process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection]: ${err.message}`);
  server.close(() => process.exit(1));
});
