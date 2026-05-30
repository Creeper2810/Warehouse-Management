<template>
  <div class="inventory-page">
    <h2>Inventory List</h2>
    <div class="search-bar">
      <input v-model="search" type="text" placeholder="Search products..." />
    </div>
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Product Name</th>
          <th>Supplier</th>
          <th class="col-price">Price</th>
          <th>Stock</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredProducts" :key="item.code">
          <td>{{ item.code }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.supplier_names || '-' }}</td>
          <td class="col-price">{{ formatVnd(item.price) }}</td>
          <td :class="{ 'low-stock': item.stock < 10 }">{{ item.stock }}</td>
        </tr>
        <tr v-if="filteredProducts.length === 0">
          <td colspan="5" class="no-data">No matching products</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { inventoryApi } from '@/services/api'

export default {
  name: 'InventoryPage',
  data() {
    return {
      search: '',
      products: [],
      loading: false,
      error: null,
    }
  },
  async created() {
    await this.loadProducts();
  },
  methods: {
    formatVnd(value) {
      if (value === null || value === undefined || value === '') return '';

      // Inventory API can return decimals as strings (e.g. "10000.00")
      const raw = String(value).trim();
      const num = Number(raw.replace(',', '.'));
      if (Number.isNaN(num)) return raw;

      const hasNonZeroDecimals = /[.,]\d+/.test(raw) && !/[.,]0+$/.test(raw);
      const digits = hasNonZeroDecimals ? 2 : 0;

      return (
        new Intl.NumberFormat('vi-VN', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(num) + '₫'
      );
    },
    async loadProducts() {
      this.loading = true;
      this.error = null;
      try {
        const res = await inventoryApi.getAll();
        const data = (res && res.data) ? res.data : [];
        // data is inventory rows joined with product fields (see backend)
        this.products = data.map(i => ({
          code: i.sku || i.id,
          name: i.name || i.barcode,
          supplier_names: i.supplier_names || '',
          price: i.sale_price || 0,
          stock: i.quantity ?? 0,
          low_stock_threshold: i.reorder_level ?? 0,
        }));
      } catch (err) {
        this.error = err?.response?.data?.message || err.message || 'Unable to load products';
      } finally {
        this.loading = false;
      }
    }
  },
  computed: {
    filteredProducts() {
      if (!this.search) return this.products;
      const s = this.search.toLowerCase();
      return this.products.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.code.toLowerCase().includes(s)
      );
    }
  }
}
</script>

<style scoped>
.inventory-page {
  max-width: 700px;
  margin: 2em auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 2em 1.5em;
}
.search-bar {
  margin-bottom: 1em;
  text-align: right;
}
.search-bar input {
  padding: 0.5em 1em;
  border: 1px solid #bdbdbd;
  border-radius: 6px;
  font-size: 1em;
  width: 220px;
}
.inventory-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}
.inventory-table th, .inventory-table td {
  padding: 0.7em 0.5em;
  border-bottom: 1px solid #e0e0e0;
  text-align: left;
}

.col-price {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.inventory-table th {
  background: #f5f6fa;
  font-weight: 600;
}
.low-stock {
  color: #d32f2f;
  font-weight: bold;
}
.no-data {
  text-align: center;
  color: #888;
  font-style: italic;
}
</style>
