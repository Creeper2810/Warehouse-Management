<template>
  <div class="products-page">
    <h2>Product List</h2>
    <div v-if="loading" class="empty-state">Loading data...</div>
    <div v-else>
      <div v-if="error" class="error-msg">Error: {{ error }}</div>

      <ul v-if="products.length" class="products-list">
        <li v-for="p in products" :key="p.id">{{ p.name }}</li>
      </ul>

      <div v-if="!products.length && !error" class="empty-state">No products to display</div>
    </div>
  </div>
</template>

<script>
import { productsApi } from '@/services/api'

export default {
  name: 'ProductsPage',
  data() {
    return {
      products: [],
      loading: false,
      error: null,
    }
  },
  created() {
    this.load();
  },
  methods: {
    formatPrice(v) {
      if (!v && v !== 0) return '-';
      return (Number(v)).toLocaleString() + '₫';
    },
    async load() {
      this.loading = true;
      try {
        const res = await productsApi.getAll();
        this.products = res.data || [];
      } catch (e) {
        this.error = e?.response?.data?.message || e.message;
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
.products-page {
  max-width: 900px;
  margin: 2em auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 2em 1.5em;
}
</style>
