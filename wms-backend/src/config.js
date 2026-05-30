const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = {
  env: process.env.NODE_ENV || 'local',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8000),
  autoMigrate: process.env.AUTO_MIGRATE !== 'false',
  sessionSecret: process.env.SESSION_SECRET || 'wms-node-local-secret',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'wms_node_session',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE || 'wms',
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
  },
};
