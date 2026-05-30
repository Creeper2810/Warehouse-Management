const config = require('./config');
const { sequelize } = require('./models');
const { migrate } = require('./schema');
const { createApp } = require('./app');

async function main() {
  await sequelize.authenticate();
  if (config.autoMigrate) {
    await migrate();
  }

  const app = createApp();

  app.set('trust proxy', 1);
  
  app.listen(config.port, config.host, () => {
    console.log(`WMS Node backend listening on http://${config.host}:${config.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start WMS Node backend');
  console.error(error);
  process.exit(1);
});
