const { sequelize } = require('../models');
const { migrate } = require('../schema');

async function main() {
  await sequelize.authenticate();
  await migrate();
  console.log('Migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
