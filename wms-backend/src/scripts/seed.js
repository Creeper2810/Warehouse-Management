const { sequelize, User, PersonalAccessToken } = require('../models');
const { migrate } = require('../schema');
const { abilitiesForRole, hashPassword } = require('../utils');

const users = [
  {
    name: 'Admin',
    email: 'admin@gmail.com',
    password: '123',
    role: 'admin',
    tokenName: 'admin-token',
  },
  {
    name: 'Manager',
    email: 'manager@mail.com',
    password: '123',
    role: 'manager',
    tokenName: 'manager-token',
  },
  {
    name: 'Warehouse Staff',
    email: 'staff@mail.com',
    password: '123',
    role: 'warehouse_staff',
    tokenName: 'warehouse-staff-token',
  },
];

async function main() {
  await sequelize.authenticate();
  await migrate();

  for (const userData of users) {
    const [user] = await User.findOrCreate({
      where: { email: userData.email },
      defaults: {
        name: userData.name,
        password: await hashPassword(userData.password),
        role: userData.role,
      },
    });

    await user.update({
      name: userData.name,
      password: await hashPassword(userData.password),
      role: userData.role,
    });

    await PersonalAccessToken.destroy({
      where: {
        tokenable_type: 'App\\Models\\User',
        tokenable_id: user.id,
        name: userData.tokenName,
      },
    });

    console.log(`${userData.name} ready: ${userData.email} / ${userData.password}`);
    console.log(`Abilities: ${abilitiesForRole(userData.role).join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
