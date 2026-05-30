const { sequelize } = require('./models');

async function hasColumn(table, column) {
  const columns = await sequelize.getQueryInterface().describeTable(table);
  return Object.prototype.hasOwnProperty.call(columns, column);
}

async function addColumnIfMissing(table, column, sql) {
  if (!(await hasColumn(table, column))) {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${sql}`);
  }
}

async function runSafe(sql) {
  try {
    await sequelize.query(sql);
  } catch (error) {
    const message = error?.parent?.message || error.message || '';
    if (!/Duplicate|already exists|check constraint|foreign key constraint/i.test(message)) {
      throw error;
    }
  }
}

async function migrate() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      email_verified_at TIMESTAMP NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','manager','warehouse_staff') NOT NULL DEFAULT 'warehouse_staff',
      remember_token VARCHAR(100) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      address VARCHAR(255) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      INDEX suppliers_status_index (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(255) NOT NULL UNIQUE,
      barcode VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(20) NULL,
      purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 0,
      low_stock_threshold INT NOT NULL DEFAULT 10,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      INDEX products_barcode_index (barcode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS product_supplier (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT UNSIGNED NOT NULL,
      supplier_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY product_supplier_product_id_supplier_id_unique (product_id, supplier_id),
      CONSTRAINT product_supplier_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT product_supplier_supplier_id_foreign FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS inventories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT UNSIGNED NOT NULL UNIQUE,
      quantity INT NOT NULL DEFAULT 0,
      reorder_level INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT inventories_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT UNSIGNED NULL,
      supplier_id BIGINT UNSIGNED NULL,
      quantity INT NOT NULL,
      type VARCHAR(10) NOT NULL,
      user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      INDEX stock_movements_product_id_index (product_id),
      INDEX stock_movements_supplier_id_index (supplier_id),
      INDEX stock_movements_user_id_index (user_id),
      INDEX stock_movements_created_at_index (created_at),
      CONSTRAINT stock_movements_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      CONSTRAINT stock_movements_supplier_id_foreign FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
      CONSTRAINT stock_movements_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS personal_access_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tokenable_type VARCHAR(255) NOT NULL,
      tokenable_id BIGINT UNSIGNED NOT NULL,
      name TEXT NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      abilities TEXT NULL,
      last_used_at TIMESTAMP NULL,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      INDEX personal_access_tokens_tokenable_type_tokenable_id_index (tokenable_type, tokenable_id),
      INDEX personal_access_tokens_expires_at_index (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      email VARCHAR(255) NOT NULL PRIMARY KEY,
      token VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      payload LONGTEXT NOT NULL,
      last_activity INT NOT NULL,
      INDEX sessions_user_id_index (user_id),
      INDEX sessions_last_activity_index (last_activity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      user_id BIGINT UNSIGNED NULL,
      request_method VARCHAR(20) NULL,
      request_path VARCHAR(255) NULL,
      request_hash VARCHAR(255) NULL,
      response_data JSON NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT idempotency_keys_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await sequelize.query("UPDATE users SET role = 'warehouse_staff' WHERE role = 'staff'");
  await runSafe("ALTER TABLE users MODIFY role ENUM('admin','manager','warehouse_staff') NOT NULL DEFAULT 'warehouse_staff'");
  await addColumnIfMissing('users', 'email_verified_at', 'email_verified_at TIMESTAMP NULL AFTER email');
  await addColumnIfMissing('users', 'remember_token', 'remember_token VARCHAR(100) NULL AFTER role');
  await addColumnIfMissing('suppliers', 'status', "status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER address");
  await addColumnIfMissing('stock_movements', 'supplier_id', 'supplier_id BIGINT UNSIGNED NULL AFTER product_id');
}

module.exports = { migrate };
