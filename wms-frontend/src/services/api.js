import axios from '@/plugins/axios'

// Helper: backend API base prefix (routes in Laravel `routes/api.php` are under `/api`)
const API_PREFIX = '/api/v1'

export const stockInApi = {
  // backend exposes products listing; use barcode param to find single product
  lookupProduct: (barcode) => axios.get(`${API_PREFIX}/products`, { params: { barcode } }).then(res => ({ data: { product: res.data && res.data.length ? res.data[0] : null } })),
  // allow optional axios config as second arg (e.g., headers)
  stockIn: (data, config = {}) => axios.post(`${API_PREFIX}/stock-in`, data, config),
}

export const stockOutApi = {
  // Lookup via `inventory` endpoint so we get inventory.quantity (stock) joined with product
  lookupProduct: (barcode) => axios.get(`${API_PREFIX}/inventory`, { params: { barcode } }).then(res => ({ data: { product: res.data && res.data.length ? res.data[0] : null } })),
  stockOut: (data, config = {}) => axios.post(`${API_PREFIX}/stock-out`, data, config),
}

export const inventoryApi = {
  getAll: (params) => axios.get(`${API_PREFIX}/inventory`, { params }),
  getLowStock: () => axios.get(`${API_PREFIX}/inventory/low-stock`),
}

export const alertsApi = {
  getAll: (params) => axios.get(`${API_PREFIX}/alerts`, { params }),
  markAsRead: (id) => axios.patch(`${API_PREFIX}/alerts/${id}/read`),
}

export const productApi = {
  getAll: (params) => axios.get(`${API_PREFIX}/products`, { params }),
  getById: (id) => axios.get(`${API_PREFIX}/products/${id}`),
  getByBarcode: (barcode) => axios.get(`${API_PREFIX}/products`, { params: { barcode } }).then(res => {
    const product = res.data && res.data.length ? res.data[0] : null
    return { data: { data: product } }
  }),
  create: (data) => axios.post(`${API_PREFIX}/products`, data),
  update: (id, data) => axios.put(`${API_PREFIX}/products/${id}`, data),
  delete: (id) => axios.delete(`${API_PREFIX}/products/${id}`),
}

export const productsApi = productApi // Alias for backward compatibility

export const userApi = {
  getAll: (params) => axios.get(`${API_PREFIX}/users`, { params }),
  getById: (id) => axios.get(`${API_PREFIX}/users/${id}`),
  create: (data) => axios.post(`${API_PREFIX}/users`, data),
  update: (id, data) => axios.put(`${API_PREFIX}/users/${id}`, data),
  delete: (id) => axios.delete(`${API_PREFIX}/users/${id}`),
}

export const supplierApi = {
  getAll: (params) => axios.get(`${API_PREFIX}/suppliers`, { params }),
  getById: (id) => axios.get(`${API_PREFIX}/suppliers/${id}`),
  create: (data) => axios.post(`${API_PREFIX}/suppliers`, data),
  update: (id, data) => axios.put(`${API_PREFIX}/suppliers/${id}`, data),
  delete: (id) => axios.delete(`${API_PREFIX}/suppliers/${id}`),
}

export const suppliersApi = supplierApi // Alias for convenience

export const passwordResetApi = {
  forgot: (data) => axios.post(`${API_PREFIX}/auth/forgot-password`, data),
  reset: (data) => axios.post(`${API_PREFIX}/auth/reset-password`, data),
}

export const stockMovementApi = {
  getFiltered: (params) => axios.get(`${API_PREFIX}/stock-movements`, { params }),
  getLogs: (params) => axios.get(`${API_PREFIX}/stock-movements/logs`, { params }),
  export: (params) => axios.get(`${API_PREFIX}/stock-movements/export`, { params }),
}

// Device management APIs removed