const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');

const ROLE_ABILITIES = {
  admin: ['admin', 'view-reports', 'stock-in', 'stock-out', 'suppliers'],
  manager: ['view-reports', 'stock-in', 'stock-out'],
  warehouse_staff: ['stock-in', 'stock-out'],
};

function plain(model) {
  if (!model) return null;
  return typeof model.toJSON === 'function' ? model.toJSON() : model;
}

function sanitizeUser(user) {
  const data = plain(user);
  if (!data) return null;
  delete data.password;
  delete data.remember_token;
  return data;
}

function sanitizeMovement(movement) {
  const data = plain(movement);
  if (!data) return null;
  if (data.user) data.user = sanitizeUser(data.user);
  return data;
}

function productWithConvenienceFields(product) {
  const data = plain(product);
  if (!data) return null;
  const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
  data.supplier_ids = suppliers.map((supplier) => supplier.id);
  data.supplier_names = suppliers.map((supplier) => supplier.name);
  return data;
}

function validationError(res, errors, message = 'Validation failed') {
  return res.status(422).json({ message, errors });
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = [];
  errors[field].push(message);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function hashPlainToken(plainToken) {
  return crypto.createHash('sha256').update(plainToken).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), config.bcryptRounds);
}

async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(String(password), hash);
}

function abilitiesForRole(role) {
  return ROLE_ABILITIES[role] || [];
}

function parseAbilities(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function can(user, ability, tokenAbilities = []) {
  if (!user) return false;
  const abilities = new Set([...abilitiesForRole(user.role), ...tokenAbilities]);
  return abilities.has('*') || abilities.has('admin') || abilities.has(ability);
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayMonthLabel(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = {
  ROLE_ABILITIES,
  plain,
  sanitizeUser,
  sanitizeMovement,
  productWithConvenienceFields,
  validationError,
  addError,
  isEmail,
  hashPlainToken,
  randomToken,
  hashPassword,
  verifyPassword,
  abilitiesForRole,
  parseAbilities,
  can,
  csvEscape,
  localDateString,
  dayMonthLabel,
};
