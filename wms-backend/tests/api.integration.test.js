const describeIf = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

describeIf('WMS API integration', () => {
  jest.setTimeout(30000);

  let request;
  let sequelize;
  let models;
  let hashPassword;
  let app;
  const suffix = Date.now();
  const created = {
    productIds: [],
    supplierIds: [],
    userIds: [],
  };

  async function ensureAdmin() {
    const [admin] = await models.User.findOrCreate({
      where: { email: 'admin@gmail.com' },
      defaults: {
        name: 'Admin',
        email: 'admin@gmail.com',
        password: await hashPassword('123'),
        role: 'admin',
      },
    });
    await admin.update({
      name: 'Admin',
      password: await hashPassword('123'),
      role: 'admin',
    });
    return admin;
  }

  async function csrf(agent) {
    const response = await agent.get('/sanctum/csrf-cookie').expect(204);
    const cookie = response.headers['set-cookie'].find((value) => value.startsWith('XSRF-TOKEN='));
    return decodeURIComponent(cookie.split(';')[0].split('=')[1]);
  }

  async function loginAsAdmin(agent) {
    const token = await csrf(agent);
    await agent
      .post('/api/v1/auth/login')
      .set('X-XSRF-TOKEN', token)
      .send({ email: 'admin@gmail.com', password: '123' })
      .expect(200);
    return token;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    request = require('supertest');
    models = require('../src/models');
    ({ sequelize } = models);
    ({ hashPassword } = require('../src/utils'));
    const { migrate } = require('../src/schema');
    const { createApp } = require('../src/app');
    await sequelize.authenticate();
    await migrate();
    await ensureAdmin();
    app = createApp();
  });

  afterAll(async () => {
    if (models) {
      await models.StockMovement.destroy({
        where: {
          [models.sequelize.Sequelize.Op.or]: [
            { product_id: created.productIds },
            { user_id: created.userIds },
            { supplier_id: created.supplierIds },
          ],
        },
        force: true,
      });
      await models.ProductSupplier.destroy({ where: { product_id: created.productIds } });
      await models.Inventory.destroy({ where: { product_id: created.productIds } });
      await models.Product.destroy({ where: { id: created.productIds } });
      await models.Supplier.destroy({ where: { id: created.supplierIds } });
      await models.User.destroy({ where: { id: created.userIds } });
    }
    if (sequelize) await sequelize.close();
  });

  test('creates CSRF cookie and rejects protected requests without login', async () => {
    const agent = request.agent(app);
    await agent.get('/sanctum/csrf-cookie').expect(204);
    await agent.get('/api/v1/products').expect(401);
  });

  test('mobile login returns a bearer token for a seeded user', async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/v1/auth/login-mobile')
      .send({ email: 'admin@gmail.com', password: '123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toContain('|');
    expect(response.body.user.role).toBe('admin');

    await agent
      .post('/api/v1/auth/logout-mobile')
      .set('Authorization', `Bearer ${response.body.token}`)
      .expect(200);
  });

  test('admin can manage suppliers, products, and users', async () => {
    const agent = request.agent(app);
    const token = await loginAsAdmin(agent);

    const supplierResponse = await agent
      .post('/api/v1/suppliers')
      .set('X-XSRF-TOKEN', token)
      .send({ name: `Temp Supplier ${suffix}`, email: `supplier${suffix}@mail.com` })
      .expect(201);
    created.supplierIds.push(supplierResponse.body.id);

    const productResponse = await agent
      .post('/api/v1/products')
      .set('X-XSRF-TOKEN', token)
      .send({
        sku: `SKU-${suffix}`,
        barcode: `BAR-${suffix}`,
        name: `Temp Product ${suffix}`,
        unit: 'pcs',
        purchase_price: 1000,
        sale_price: 1500,
        low_stock_threshold: 10,
        supplier_ids: [supplierResponse.body.id],
      })
      .expect(201);
    created.productIds.push(productResponse.body.data.id);
    expect(productResponse.body.data.supplier_ids).toContain(supplierResponse.body.id);

    await agent
      .put(`/api/v1/products/${productResponse.body.data.id}`)
      .set('X-XSRF-TOKEN', token)
      .send({
        sku: `SKU-${suffix}`,
        barcode: `BAR-${suffix}`,
        name: `Updated Product ${suffix}`,
        unit: 'pcs',
        purchase_price: 1000,
        sale_price: 2000,
        low_stock_threshold: 10,
        supplier_ids: [supplierResponse.body.id],
      })
      .expect(200);

    const userResponse = await agent
      .post('/api/v1/users')
      .set('X-XSRF-TOKEN', token)
      .send({
        name: `Temp User ${suffix}`,
        email: `user${suffix}@mail.com`,
        password: '123456',
        password_confirmation: '123456',
        role: 'warehouse_staff',
      })
      .expect(201);
    created.userIds.push(userResponse.body.data.id);

    await agent.get(`/api/v1/users/${userResponse.body.data.id}`).expect(200);
    await agent
      .delete(`/api/v1/users/${userResponse.body.data.id}`)
      .set('X-XSRF-TOKEN', token)
      .expect(200);
    created.userIds = created.userIds.filter((id) => id !== userResponse.body.data.id);
  });

  test('stock-in auto-creates product, stock-out validates inventory, and movement logs export', async () => {
    const agent = request.agent(app);
    const token = await loginAsAdmin(agent);
    const barcode = `AUTO-${suffix}`;

    const stockIn = await agent
      .post('/api/v1/stock-in')
      .set('X-XSRF-TOKEN', token)
      .send({ barcode, quantity: 3 })
      .expect(201);
    created.productIds.push(stockIn.body.data.product.id);

    const inventory = await agent.get(`/api/v1/inventory?barcode=${barcode}`).expect(200);
    expect(Number(inventory.body[0].quantity)).toBe(3);

    await agent
      .post('/api/v1/stock-out')
      .set('X-XSRF-TOKEN', token)
      .send({ barcode, quantity: 99 })
      .expect(422);

    await agent
      .post('/api/v1/stock-out')
      .set('X-XSRF-TOKEN', token)
      .send({ barcode, quantity: 1 })
      .expect(201);

    const lowStock = await agent.get('/api/v1/inventory/low-stock').expect(200);
    expect(lowStock.body.some((item) => item.product_barcode === barcode)).toBe(true);

    const logs = await agent.get('/api/v1/stock-movements/logs').expect(200);
    expect(logs.body.data.length).toBeGreaterThan(0);

    const exported = await agent.get('/api/v1/stock-movements/export').expect(200);
    expect(exported.body.filename).toContain('stock-movements-');
    expect(exported.body.csv).toContain('Transaction Type');
  });
});
