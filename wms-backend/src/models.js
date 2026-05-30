const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const timestampOptions = {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  email_verified_at: { type: DataTypes.DATE, allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'warehouse_staff' },
  remember_token: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'users',
  ...timestampOptions,
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  sku: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  barcode: { type: DataTypes.STRING(100), allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  low_stock_threshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
}, {
  tableName: 'products',
  ...timestampOptions,
});

const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  contact_name: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(50), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  address: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
}, {
  tableName: 'suppliers',
  ...timestampOptions,
});

const ProductSupplier = sequelize.define('ProductSupplier', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  supplier_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
  tableName: 'product_supplier',
  ...timestampOptions,
});

const Inventory = sequelize.define('Inventory', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  reorder_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'inventories',
  ...timestampOptions,
});

const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  supplier_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(10), allowNull: false },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
}, {
  tableName: 'stock_movements',
  ...timestampOptions,
});

const PersonalAccessToken = sequelize.define('PersonalAccessToken', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  tokenable_type: { type: DataTypes.STRING(255), allowNull: false },
  tokenable_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  name: { type: DataTypes.TEXT, allowNull: false },
  token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  abilities: { type: DataTypes.TEXT, allowNull: true },
  last_used_at: { type: DataTypes.DATE, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'personal_access_tokens',
  ...timestampOptions,
});

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  email: { type: DataTypes.STRING(255), primaryKey: true },
  token: { type: DataTypes.STRING(255), allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'password_reset_tokens',
  timestamps: false,
});

const IdempotencyKey = sequelize.define('IdempotencyKey', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  request_method: { type: DataTypes.STRING(20), allowNull: true },
  request_path: { type: DataTypes.STRING(255), allowNull: true },
  request_hash: { type: DataTypes.STRING(255), allowNull: true },
  response_data: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'idempotency_keys',
  ...timestampOptions,
});

Product.hasOne(Inventory, { as: 'inventory', foreignKey: 'product_id' });
Inventory.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

Product.belongsToMany(Supplier, {
  as: 'suppliers',
  through: ProductSupplier,
  foreignKey: 'product_id',
  otherKey: 'supplier_id',
});
Supplier.belongsToMany(Product, {
  as: 'products',
  through: ProductSupplier,
  foreignKey: 'supplier_id',
  otherKey: 'product_id',
});

StockMovement.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
StockMovement.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
StockMovement.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplier_id' });

module.exports = {
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
};
