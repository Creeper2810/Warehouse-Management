const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const app = express();

const config = require('./config');
const {
  sequelize,
  User,
  Product,
  Supplier,
  ProductSupplier,
  Inventory,
  StockMovement,
  PersonalAccessToken,
  PasswordResetToken,
  IdempotencyKey,
} = require('./models');
const {
  createBearerToken,
  attachUser,
  requireAuth,
  requireAdmin,
  requireAbility,
} = require('./auth');
const {
  addError,
  can,
  csvEscape,
  dayMonthLabel,
  hashPassword,
  hashPlainToken,
  isEmail,
  localDateString,
  productWithConvenienceFields,
  randomToken,
  sanitizeMovement,
  sanitizeUser,
  validationError,
  verifyPassword,
} = require('./utils');

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

function decodeHeaderToken(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  if (req.path === '/api/v1/auth/login') return next();
  
  if (req.path === '/api/v1/auth/login-mobile' || req.path === '/api/v1/auth/logout-mobile') return next();
  if (req.path === '/api/v1/auth/forgot-password' || req.path === '/api/v1/auth/reset-password') return next();
  if (req.auth?.type === 'bearer') return next();

  const expected = req.session?.csrfToken;
  const provided = decodeHeaderToken(req.get('X-XSRF-TOKEN') || req.get('X-CSRF-TOKEN'));
  if (!expected || provided !== expected) {
    return res.status(419).json({ message: 'CSRF token mismatch' });
  }
  return next();
}

const includeProductRelations = [
  { model: Inventory, as: 'inventory' },
  { model: Supplier, as: 'suppliers', through: { attributes: [] } },
];

async function findProductWithRelations(id, options = {}) {
  return Product.findByPk(id, {
    ...options,
    include: includeProductRelations,
  });
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).filter((value) => value !== null && value !== undefined && value !== '')));
}

async function validateSupplierIds(errors, supplierIds) {
  if (supplierIds === undefined || supplierIds === null) return;
  if (!Array.isArray(supplierIds)) {
    addError(errors, 'supplier_ids', 'supplier_ids must be an array');
    return;
  }

  const ids = uniqueValues(supplierIds);
  if (ids.length === 0) return;

  const count = await Supplier.count({ where: { id: { [Op.in]: ids } } });
  if (count !== ids.length) {
    addError(errors, 'supplier_ids', 'One or more suppliers do not exist');
  }
}

async function validateProductPayload(req, res, next) {
  const data = req.body || {};
  const productId = req.params.product || req.params.id;
  const errors = {};

  if (!data.sku) addError(errors, 'sku', 'SKU is required');
  if (!data.barcode) addError(errors, 'barcode', 'Barcode is required');
  if (!data.name) addError(errors, 'name', 'Product name is required');

  if (data.purchase_price !== undefined && Number(data.purchase_price) < 0) {
    addError(errors, 'purchase_price', 'Purchase price must be greater than or equal to 0');
  }
  if (data.sale_price !== undefined && Number(data.sale_price) < 0) {
    addError(errors, 'sale_price', 'Sale price must be greater than or equal to 0');
  }
  if (data.low_stock_threshold !== undefined && Number(data.low_stock_threshold) < 0) {
    addError(errors, 'low_stock_threshold', 'Low stock threshold must be greater than or equal to 0');
  }

  if (data.sku) {
    const where = { sku: data.sku };
    if (productId) where.id = { [Op.ne]: productId };
    const existing = await Product.findOne({ where });
    if (existing) addError(errors, 'sku', 'SKU already exists');
  }

  if (data.barcode) {
    const where = { barcode: data.barcode };
    if (productId) where.id = { [Op.ne]: productId };
    const existing = await Product.findOne({ where });
    if (existing) addError(errors, 'barcode', 'Barcode already exists');
  }

  await validateSupplierIds(errors, data.supplier_ids);

  if (Object.keys(errors).length > 0) return validationError(res, errors);
  return next();
}

async function validateStockPayload(req, res, next) {
  const data = req.body || {};
  const errors = {};

  if (!data.barcode) addError(errors, 'barcode', 'Please provide a barcode');
  const quantity = Number(data.quantity);
  if (!Number.isInteger(quantity)) addError(errors, 'quantity', 'Quantity must be an integer');
  if (Number.isInteger(quantity) && quantity < 1) addError(errors, 'quantity', 'Quantity must be at least 1');
  if (req.path.endsWith('/stock-in') && Number.isInteger(quantity) && quantity > 10000) {
    addError(errors, 'quantity', 'Quantity must be at most 10000');
  }

  if (data.supplier_id) {
    const supplier = await Supplier.findByPk(data.supplier_id);
    if (!supplier) addError(errors, 'supplier_id', 'Supplier does not exist');
  }

  if (Object.keys(errors).length > 0) return validationError(res, errors);
  return next();
}

function validateSupplierPayload(requiredName = true) {
  return (req, res, next) => {
    const data = req.body || {};
    const errors = {};
    if (requiredName && !data.name) addError(errors, 'name', 'Supplier name is required');
    if (data.email && !isEmail(data.email)) addError(errors, 'email', 'Invalid email');
    if (data.status && !['active', 'inactive'].includes(data.status)) addError(errors, 'status', 'Invalid status');
    if (Object.keys(errors).length > 0) return validationError(res, errors);
    return next();
  };
}

async function validateUserPayload(req, res, next) {
  const data = req.body || {};
  const isCreate = req.method === 'POST';
  const userId = req.params.user || req.params.id;
  const errors = {};

  if (!data.name) addError(errors, 'name', 'Name is required');
  if (!data.email) addError(errors, 'email', 'Email is required');
  if (data.email && !isEmail(data.email)) addError(errors, 'email', 'Invalid email');
  if (!data.role) addError(errors, 'role', 'Role is required');
  if (data.role && !['admin', 'manager', 'warehouse_staff'].includes(data.role)) {
    addError(errors, 'role', 'Invalid role');
  }

  if (isCreate && !data.password) addError(errors, 'password', 'Password is required');
  if (data.password && String(data.password).length < 6) addError(errors, 'password', 'Password must be at least 6 characters');
  if (data.password && data.password !== data.password_confirmation) {
    addError(errors, 'password_confirmation', 'Password confirmation does not match');
  }

  if (data.email) {
    const where = { email: data.email };
    if (userId) where.id = { [Op.ne]: userId };
    const existing = await User.findOne({ where });
    if (existing) addError(errors, 'email', 'Email already exists');
  }

  if (Object.keys(errors).length > 0) return validationError(res, errors);
  return next();
}

async function firstUserId() {
  const user = await User.findOne({ order: [['id', 'ASC']] });
  return user?.id || null;
}

async function generateSku(transaction) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sku = `SKU-${randomToken(3).toUpperCase()}`;
    const exists = await Product.findOne({ where: { sku }, transaction });
    if (!exists) return sku;
  }
  return `SKU-${Date.now()}`;
}

async function syncProductSuppliers(productId, supplierIds, transaction) {
  if (!Array.isArray(supplierIds)) return;
  const ids = uniqueValues(supplierIds);
  await ProductSupplier.destroy({ where: { product_id: productId }, transaction });
  if (ids.length === 0) return;
  await ProductSupplier.bulkCreate(
    ids.map((supplierId) => ({ product_id: productId, supplier_id: supplierId })),
    { transaction }
  );
}

async function stockInOperation({ barcode, quantity, supplierId, notes, userId }) {
  return sequelize.transaction(async (transaction) => {
    let product = await Product.findOne({
      where: { barcode },
      transaction,
      lock: true,
    });

    if (!product) {
      product = await Product.create({
        sku: await generateSku(transaction),
        barcode,
        name: `Unknown product ${barcode}`,
        unit: null,
        purchase_price: 0,
        sale_price: 0,
        quantity: 0,
        low_stock_threshold: 10,
      }, { transaction });
    }

    let inventory = await Inventory.findOne({
      where: { product_id: product.id },
      transaction,
      lock: true,
    });

    if (!inventory) {
      inventory = await Inventory.create({
        product_id: product.id,
        quantity: 0,
        reorder_level: 0,
      }, { transaction });
    }

    const oldQty = Number(inventory.quantity);
    const newQty = oldQty + quantity;
    inventory.quantity = newQty;
    await inventory.save({ transaction });

    const movement = await StockMovement.create({
      product_id: product.id,
      supplier_id: supplierId || null,
      quantity,
      type: 'in',
      user_id: userId || await firstUserId(),
    }, { transaction });

    if (notes) {
      movement.setDataValue('notes', notes);
    }

    return {
      product,
      old_quantity: oldQty,
      new_quantity: newQty,
      movement,
    };
  });
}

async function stockOutOperation({ barcode, quantity, supplierId, userId }) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findOne({
      where: { barcode },
      transaction,
      lock: true,
    });
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }

    let inventory = await Inventory.findOne({
      where: { product_id: product.id },
      transaction,
      lock: true,
    });
    if (!inventory) {
      inventory = await Inventory.create({
        product_id: product.id,
        quantity: 0,
        reorder_level: 0,
      }, { transaction });
    }

    const beforeQty = Number(inventory.quantity);
    if (beforeQty < quantity) {
      const error = new Error(`Not enough stock. Available: ${beforeQty}, Requested: ${quantity}`);
      error.status = 422;
      throw error;
    }

    const afterQty = beforeQty - quantity;
    inventory.quantity = afterQty;
    await inventory.save({ transaction });

    const movement = await StockMovement.create({
      product_id: product.id,
      supplier_id: supplierId || null,
      quantity,
      type: 'out',
      user_id: userId || await firstUserId(),
    }, { transaction });

    return {
      product_id: product.id,
      barcode,
      quantity,
      new_quantity: afterQty,
      movement,
    };
  });
}

async function queryMovements(filters, req) {
  const page = Math.max(Number(filters.page || 1), 1);
  const perPage = Math.min(Math.max(Number(filters.per_page || 20), 1), 10000);
  const offset = (page - 1) * perPage;
  const sortBy = ['created_at', 'quantity', 'type'].includes(filters.sort_by) ? filters.sort_by : 'created_at';
  const sortOrder = String(filters.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const movementWhere = {};
  const productWhere = {};

  if (filters.type) movementWhere.type = filters.type;
  if (filters.user_id) movementWhere.user_id = filters.user_id;
  if (filters.product_id) movementWhere.product_id = filters.product_id;
  if (filters.supplier_id) movementWhere.supplier_id = filters.supplier_id;
  if (filters.date_from || filters.date_to) {
    movementWhere.created_at = {};
    if (filters.date_from) movementWhere.created_at[Op.gte] = `${filters.date_from} 00:00:00`;
    if (filters.date_to) movementWhere.created_at[Op.lte] = `${filters.date_to} 23:59:59`;
  }

  if (filters.search) {
    productWhere[Op.or] = [
      { name: { [Op.like]: `%${filters.search}%` } },
      { sku: { [Op.like]: `%${filters.search}%` } },
      { barcode: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const { count, rows } = await StockMovement.findAndCountAll({
    where: movementWhere,
    include: [
      { model: Product, as: 'product', where: productWhere, required: Boolean(filters.search) },
      { model: User, as: 'user', required: false },
      { model: Supplier, as: 'supplier', required: false },
    ],
    order: [[sortBy, sortOrder]],
    limit: perPage,
    offset,
    distinct: true,
  });

  const total = typeof count === 'number' ? count : count.length;
  const lastPage = Math.max(Math.ceil(total / perPage), 1);
  const from = total === 0 ? null : offset + 1;
  const to = total === 0 ? null : Math.min(offset + rows.length, total);
  const baseUrl = req ? `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}` : null;

  return {
    data: rows.map(sanitizeMovement),
    meta: {
      total,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
      from,
      to,
    },
    links: {
      first: baseUrl ? `${baseUrl}?page=1` : null,
      last: baseUrl ? `${baseUrl}?page=${lastPage}` : null,
      next: baseUrl && page < lastPage ? `${baseUrl}?page=${page + 1}` : null,
      prev: baseUrl && page > 1 ? `${baseUrl}?page=${page - 1}` : null,
    },
  };
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ 
          contentSecurityPolicy: false,
          crossOriginResourcePolicy: { policy: "cross-origin" }, 
          crossOriginOpenerPolicy: { policy: "unsafe-none" }}));
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin === config.frontendOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(config.sessionSecret));
  app.use(session({
    name: config.sessionCookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Thêm cấu hình bắt buộc này cho môi trường Cloud
    cookie: {
      httpOnly: true,
      sameSite: 'none',// Sửa từ 'lax' thành 'none' để chia sẻ phiên làm việc từ Vercel sang Railway
      secure: true, // Sửa từ false thành true vì môi trường chạy thực tế bắt buộc chạy HTTPS
      path: '/',
      maxAge: 1000 * 60 * 120,
    },
  }));
  if (config.env !== 'test') app.use(morgan('dev'));

  app.get('/', (_req, res) => {
    res.json({ name: 'WMS Backend Node', status: 'ok' });
  });

 // 4. CHỈNH SỬA: Chuyển đổi endpoint từ '/sanctum/csrf-cookie' thành '/api/v1/csrf-cookie' 
  // để khớp 100% với luồng gọi từ file Pinia Store ở Frontend, triệt tiêu lỗi 404
  app.get('/api/v1/csrf-cookie', (req, res) => {
    const token = randomToken(20);
    req.session.csrfToken = token;
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Để trống false để JavaScript phía Frontend đọc được mã token
      sameSite: 'none', // Phải đồng bộ 'none' giống session cookie ở trên
      secure: true,    
      path: '/',
      maxAge: 1000 * 60 * 120,
    });
    return saveSession(req).then(() => res.status(204).send());
  });

  app.use(attachUser);
  app.use(csrfGuard);

  const api = express.Router();

  api.post('/auth/login', asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    await saveSession(req);

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  }));

  api.post('/auth/logout', requireAuth, asyncRoute(async (req, res) => {
    if (req.auth?.type === 'bearer' && req.auth.token) {
      await req.auth.token.destroy();
    }
    if (req.session) {
      await destroySession(req);
    }
    res.clearCookie(config.sessionCookieName, { path: '/' });
    res.clearCookie('XSRF-TOKEN', { path: '/' });
    return res.json({ success: true, message: 'Logout successful' });
  }));

  api.post('/auth/login-mobile', asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    const errors = {};
    if (!email || !isEmail(email)) addError(errors, 'email', 'Invalid email');
    if (!password) addError(errors, 'password', 'Password is required');
    if (Object.keys(errors).length > 0) return validationError(res, errors);

    const user = await User.findOne({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = await createBearerToken(user, 'mobile-token');
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  }));

  api.post('/auth/logout-mobile', requireAuth, asyncRoute(async (req, res) => {
    if (req.auth?.type === 'bearer' && req.auth.token) {
      await req.auth.token.destroy();
    }
    return res.json({ success: true, message: 'Token revoked' });
  }));

  api.post('/auth/forgot-password', asyncRoute(async (req, res) => {
    const { email } = req.body || {};
    const errors = {};
    if (!email || !isEmail(email)) addError(errors, 'email', 'Invalid email');
    if (Object.keys(errors).length > 0) return validationError(res, errors);

    const plainToken = randomToken(24);
    await PasswordResetToken.upsert({
      email,
      token: hashPlainToken(plainToken),
      created_at: new Date(),
    });

    if (config.env !== 'production') {
      console.log(`Password reset token for ${email}: ${plainToken}`);
    }

    return res.json({
      success: true,
      message: 'Password reset link has been sent.',
      ...(config.env !== 'production' ? { dev_token: plainToken } : {}),
    });
  }));

  api.post('/auth/reset-password', asyncRoute(async (req, res) => {
    const { email, token, password, password_confirmation: passwordConfirmation } = req.body || {};
    const errors = {};
    if (!email || !isEmail(email)) addError(errors, 'email', 'Invalid email');
    if (!token) addError(errors, 'token', 'Token is required');
    if (!password || String(password).length < 6) addError(errors, 'password', 'Password must be at least 6 characters');
    if (password !== passwordConfirmation) addError(errors, 'password_confirmation', 'Password confirmation does not match');
    if (Object.keys(errors).length > 0) return validationError(res, errors);

    const reset = await PasswordResetToken.findByPk(email);
    const expired = !reset?.created_at || (Date.now() - new Date(reset.created_at).getTime()) > 1000 * 60 * 60;
    if (!reset || expired || reset.token !== hashPlainToken(token)) {
      return validationError(res, { email: ['Password reset token is invalid or has expired'] });
    }

    const user = await User.findOne({ where: { email } });
    if (user) {
      user.password = await hashPassword(password);
      user.remember_token = randomToken(30);
      await user.save();
    }
    await reset.destroy();

    return res.json({
      success: true,
      message: 'Password reset successfully. Please log in again.',
    });
  }));

  api.get('/check-barcode', asyncRoute(async (req, res) => {
    const exists = await Product.count({ where: { barcode: req.query.barcode || '' } });
    return res.json({ exists: exists > 0 });
  }));

  api.get('/products', requireAuth, asyncRoute(async (req, res) => {
    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { sku: { [Op.like]: `%${req.query.search}%` } },
        { barcode: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    if (req.query.barcode) where.barcode = req.query.barcode;

    const include = [
      { model: Inventory, as: 'inventory' },
      { model: Supplier, as: 'suppliers', through: { attributes: [] } },
    ];
    if (req.query.low_stock) {
      include[0] = {
        model: Inventory,
        as: 'inventory',
        required: true,
        where: sqlWhere(col('inventory.quantity'), Op.lte, col('Product.low_stock_threshold')),
      };
    }

    const products = await Product.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
    });
    return res.json(products.map(productWithConvenienceFields));
  }));

  api.get('/products/:product', requireAuth, asyncRoute(async (req, res) => {
    const product = await findProductWithRelations(req.params.product);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json(productWithConvenienceFields(product));
  }));

  api.post('/products', requireAuth, requireAbility('view-reports'), validateProductPayload, asyncRoute(async (req, res) => {
    if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ message: 'Unauthorized' });
    const data = req.body;
    const productId = await sequelize.transaction(async (transaction) => {
      const product = await Product.create({
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        unit: data.unit || 'pcs',
        purchase_price: data.purchase_price || 0,
        sale_price: data.sale_price || 0,
        quantity: 0,
        low_stock_threshold: data.low_stock_threshold ?? 10,
      }, { transaction });

      await Inventory.create({
        product_id: product.id,
        quantity: 0,
        reorder_level: data.reorder_level || 0,
      }, { transaction });

      await syncProductSuppliers(product.id, data.supplier_ids, transaction);
      return product.id;
    });

    const product = await findProductWithRelations(productId);
    return res.status(201).json({ message: 'Product created successfully', data: productWithConvenienceFields(product) });
  }));

  async function updateProductRoute(req, res) {
    if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ message: 'Unauthorized' });
    const data = req.body;
    const product = await Product.findByPk(req.params.product);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await sequelize.transaction(async (transaction) => {
      await product.update({
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        unit: data.unit ?? product.unit,
        purchase_price: data.purchase_price ?? product.purchase_price,
        sale_price: data.sale_price ?? product.sale_price,
        low_stock_threshold: data.low_stock_threshold ?? product.low_stock_threshold,
      }, { transaction });
      await syncProductSuppliers(product.id, data.supplier_ids, transaction);
    });

    const fresh = await findProductWithRelations(product.id);
    return res.json({ message: 'Product updated successfully', data: productWithConvenienceFields(fresh) });
  }

  api.put('/products/:product', requireAuth, validateProductPayload, asyncRoute(updateProductRoute));
  api.patch('/products/:product', requireAuth, validateProductPayload, asyncRoute(updateProductRoute));

  api.delete('/products/:product', requireAuth, asyncRoute(async (req, res) => {
    if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ message: 'Unauthorized' });
    const product = await Product.findByPk(req.params.product);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const inventory = await Inventory.findOne({ where: { product_id: product.id } });
    if (inventory && Number(inventory.quantity) > 0) {
      return res.status(422).json({ message: `Cannot delete product with existing inventory. Current quantity: ${inventory.quantity}` });
    }

    await product.destroy();
    return res.json({ message: 'Product deleted successfully' });
  }));

  api.get('/suppliers', requireAuth, asyncRoute(async (_req, res) => {
    const suppliers = await Supplier.findAll({ order: [['created_at', 'DESC']] });
    return res.json(suppliers);
  }));

  api.get('/suppliers/:supplier', requireAuth, asyncRoute(async (req, res) => {
    const supplier = await Supplier.findByPk(req.params.supplier, {
      include: [{ model: Product, as: 'products', through: { attributes: [] } }],
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    return res.json(supplier);
  }));

  api.post('/suppliers', requireAuth, requireAbility('suppliers'), validateSupplierPayload(true), asyncRoute(async (req, res) => {
    const supplier = await Supplier.create({
      name: req.body.name,
      contact_name: req.body.contact_name || null,
      phone: req.body.phone || null,
      email: req.body.email || null,
      address: req.body.address || null,
      status: req.body.status || 'active',
    });
    return res.status(201).json(supplier);
  }));

  api.put('/suppliers/:supplier', requireAuth, requireAbility('suppliers'), validateSupplierPayload(false), asyncRoute(async (req, res) => {
    const supplier = await Supplier.findByPk(req.params.supplier);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    await supplier.update({
      ...req.body,
      status: req.body.status || supplier.status,
    });
    return res.json(supplier);
  }));

  api.patch('/suppliers/:supplier', requireAuth, requireAbility('suppliers'), validateSupplierPayload(false), asyncRoute(async (req, res) => {
    const supplier = await Supplier.findByPk(req.params.supplier);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    await supplier.update(req.body);
    return res.json(supplier);
  }));

  api.delete('/suppliers/:supplier', requireAuth, requireAbility('suppliers'), asyncRoute(async (req, res) => {
    const supplier = await Supplier.findByPk(req.params.supplier);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    await sequelize.transaction(async (transaction) => {
      await ProductSupplier.destroy({ where: { supplier_id: supplier.id }, transaction });
      await StockMovement.update({ supplier_id: null }, { where: { supplier_id: supplier.id }, transaction });
      await supplier.destroy({ transaction });
    });
    return res.status(204).send();
  }));

  api.get('/users', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    const users = await User.findAll({ where, order: [['created_at', 'DESC']] });
    return res.json(users.map(sanitizeUser));
  }));

  api.get('/users/:user', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const user = await User.findByPk(req.params.user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(sanitizeUser(user));
  }));

  api.post('/users', requireAuth, requireAdmin, validateUserPayload, asyncRoute(async (req, res) => {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: await hashPassword(req.body.password),
      role: req.body.role,
    });
    return res.status(201).json({ message: 'User created successfully', data: sanitizeUser(user) });
  }));

  api.put('/users/:user', requireAuth, requireAdmin, validateUserPayload, asyncRoute(async (req, res) => {
    const user = await User.findByPk(req.params.user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const updateData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };
    if (req.body.password) updateData.password = await hashPassword(req.body.password);
    await user.update(updateData);
    return res.json({ message: 'User updated successfully', data: sanitizeUser(user) });
  }));

  api.patch('/users/:user', requireAuth, requireAdmin, validateUserPayload, asyncRoute(async (req, res) => {
    const user = await User.findByPk(req.params.user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const updateData = { ...req.body };
    if (updateData.password) updateData.password = await hashPassword(updateData.password);
    delete updateData.password_confirmation;
    await user.update(updateData);
    return res.json({ message: 'User updated successfully', data: sanitizeUser(user) });
  }));

  api.delete('/users/:user', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const user = await User.findByPk(req.params.user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (Number(user.id) === Number(req.user.id)) return res.status(422).json({ message: 'Cannot delete your own account' });
    await user.destroy();
    return res.json({ message: 'User deleted successfully' });
  }));

  api.post('/stock-in', requireAuth, requireAbility('stock-in'), validateStockPayload, asyncRoute(async (req, res) => {
    const result = await stockInOperation({
      barcode: req.body.barcode,
      quantity: Number(req.body.quantity),
      supplierId: req.body.supplier_id || null,
      notes: req.body.notes || null,
      userId: req.user?.id,
    });
    return res.status(201).json({ message: 'Stock in successful', data: result });
  }));

  async function handleStockOut(req, res) {
    const result = await stockOutOperation({
      barcode: req.body.barcode,
      quantity: Number(req.body.quantity),
      supplierId: req.body.supplier_id || null,
      userId: req.user?.id,
    });
    return res.status(201).json({ message: 'Stock out successful', data: result });
  }

  api.post('/stock-out', requireAuth, requireAbility('stock-out'), validateStockPayload, asyncRoute(handleStockOut));
  api.post('/stock-outs', requireAuth, requireAbility('stock-out'), validateStockPayload, asyncRoute(handleStockOut));

  api.post('/stock-out-feature', requireAuth, requireAbility('stock-out'), validateStockPayload, asyncRoute(async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key') || req.body.request_id;
    if (idempotencyKey) {
      try {
        await IdempotencyKey.create({
          key: idempotencyKey,
          user_id: req.user?.id || null,
          request_method: req.method,
          request_path: req.originalUrl,
        });
      } catch (_) {
        const existing = await IdempotencyKey.findOne({ where: { key: idempotencyKey } });
        if (existing?.response_data) return res.status(200).json(existing.response_data);
        return res.status(409).json({ message: 'Request is being processed' });
      }
    }

    const result = await stockOutOperation({
      barcode: req.body.barcode,
      quantity: Number(req.body.quantity),
      supplierId: req.body.supplier_id || null,
      userId: req.user?.id,
    });
    const responseData = { message: 'Stock out successful', data: result };
    if (idempotencyKey) {
      await IdempotencyKey.update({ response_data: responseData }, { where: { key: idempotencyKey } });
    }
    return res.status(201).json(responseData);
  }));

  api.get('/inventory', requireAuth, asyncRoute(async (req, res) => {
    const sql = `
      SELECT
        inventories.product_id,
        inventories.quantity,
        inventories.reorder_level,
        products.id AS id,
        products.sku,
        products.barcode,
        products.name,
        products.sale_price,
        GROUP_CONCAT(DISTINCT suppliers.name SEPARATOR ', ') AS supplier_names
      FROM inventories
      INNER JOIN products ON inventories.product_id = products.id
      LEFT JOIN product_supplier ON products.id = product_supplier.product_id
      LEFT JOIN suppliers ON product_supplier.supplier_id = suppliers.id
      ${req.query.barcode ? 'WHERE products.barcode = :barcode' : ''}
      GROUP BY inventories.product_id, inventories.quantity, inventories.reorder_level,
        products.id, products.sku, products.barcode, products.name, products.sale_price
      ORDER BY products.created_at DESC
    `;
    const [items] = await sequelize.query(sql, { replacements: { barcode: req.query.barcode || null } });
    return res.json(items);
  }));

  api.get('/inventory/low-stock', requireAuth, asyncRoute(async (_req, res) => {
    const [items] = await sequelize.query(`
      SELECT
        inventories.id,
        inventories.product_id,
        inventories.quantity AS current_quantity,
        inventories.reorder_level,
        products.id AS id,
        products.sku AS product_sku,
        products.barcode AS product_barcode,
        products.name AS product_name,
        products.low_stock_threshold AS threshold,
        products.sale_price
      FROM inventories
      INNER JOIN products ON inventories.product_id = products.id
      WHERE inventories.quantity <= products.low_stock_threshold
      ORDER BY inventories.quantity ASC
    `);
    return res.json(items);
  }));

  api.get('/alerts', requireAuth, asyncRoute(async (_req, res) => {
    const [items] = await sequelize.query(`
      SELECT
        inventories.id,
        inventories.product_id,
        inventories.quantity AS current_quantity,
        products.sku AS product_sku,
        products.barcode AS product_barcode,
        products.name AS product_name,
        products.low_stock_threshold AS threshold,
        0 AS is_read
      FROM inventories
      INNER JOIN products ON inventories.product_id = products.id
      WHERE inventories.quantity <= products.low_stock_threshold
      ORDER BY inventories.quantity ASC
    `);
    return res.json(items);
  }));

  api.patch('/alerts/:alert/read', requireAuth, asyncRoute(async (_req, res) => {
    return res.json({ success: true });
  }));

  api.get('/dashboard/summary', requireAuth, asyncRoute(async (_req, res) => {
    const productsCount = await Product.count();
    const lowStockCount = await Inventory.count({
      include: [{ model: Product, as: 'product', required: true }],
      where: sqlWhere(col('Inventory.quantity'), Op.lte, col('product.low_stock_threshold')),
    });
    const totalStock = Number(await Inventory.sum('quantity') || 0);
    const [todayRows] = await sequelize.query("SELECT COALESCE(SUM(quantity), 0) AS total FROM stock_movements WHERE DATE(created_at) = CURDATE() AND type = 'in'");
    const todayIn = Number(todayRows[0]?.total || 0);

    const labels = [];
    const inData = [];
    const outData = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const dateString = localDateString(date);
      labels.push(dayMonthLabel(date));

      const [rows] = await sequelize.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END), 0) AS inbound,
          COALESCE(SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END), 0) AS outbound
        FROM stock_movements
        WHERE DATE(created_at) = :date
      `, { replacements: { date: dateString } });
      inData.push(Number(rows[0]?.inbound || 0));
      outData.push(Number(rows[0]?.outbound || 0));
    }

    return res.json({
      stats: [
        { label: 'Total Products', value: productsCount },
        { label: 'Low Stock', value: lowStockCount },
        { label: 'Inventory', value: totalStock },
        { label: 'Stock In Today', value: todayIn },
      ],
      chart: {
        labels,
        datasets: [
          { label: 'Stock In', backgroundColor: '#4CAF50', data: inData },
          { label: 'Stock Out', backgroundColor: '#F44336', data: outData },
        ],
      },
    });
  }));

  api.get('/stock-movements', requireAuth, asyncRoute(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    return res.json(await queryMovements(req.query, req));
  }));

  api.get('/stock-movements/logs', requireAuth, asyncRoute(async (req, res) => {
    return res.json(await queryMovements({
      ...req.query,
      sort_by: 'created_at',
      sort_order: 'desc',
      per_page: Math.min(Number(req.query.per_page || 20), 50),
    }, req));
  }));

  api.get('/stock-movements/export', requireAuth, asyncRoute(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const result = await queryMovements({ ...req.query, per_page: 10000, page: 1 }, req);
    const header = ['Product SKU', 'Product Name', 'Barcode', 'Supplier', 'Transaction Type', 'Quantity', 'Performed By', 'Time'];
    const lines = [header.join(',')];
    for (const movement of result.data) {
      lines.push([
        movement.product?.sku || '',
        movement.product?.name || '',
        movement.product?.barcode || '',
        movement.supplier?.name || '',
        movement.type === 'in' ? 'In' : 'Out',
        movement.quantity,
        movement.user?.name || 'System',
        movement.created_at || '',
      ].map(csvEscape).join(','));
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{6})$/, '$1_$2');
    return res.json({
      csv: `${lines.join('\n')}\n`,
      filename: `stock-movements-${stamp}.csv`,
    });
  }));

  api.get('/me', requireAuth, (req, res) => {
    res.json({ user: sanitizeUser(req.user), abilities: req.auth?.abilities || [] });
  });

  app.use('/api/v1', api);

  app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return res.status(status).json({ message: status >= 500 ? `Server error: ${error.message}` : error.message });
  });

  return app;
}

module.exports = {
  createApp,
  stockInOperation,
  stockOutOperation,
  queryMovements,
};
