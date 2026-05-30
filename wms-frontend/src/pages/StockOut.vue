<template>
  <div class="stock-out-page">
    <h2 class="page-title">Stock Out</h2>

    <div class="layout-grid">
        <!-- LEFT: Scanner -->
        <div class="scanner-wrap">
          <BarcodeScanner @scan="onScan" />
        </div>

        <!-- RIGHT: Product info -->
        <div v-if="product" class="product-card">
          <div class="card-header">
            <div class="product-name">{{ product.name }}</div>
            <div class="product-price">{{ product.price.toLocaleString() }}₫</div>
          </div>

          <div class="product-meta">
            <span class="stock-badge">Stock: <strong>{{ product.stock }}</strong></span>
          </div>

          <div class="form-group">
            <label>Quantity</label>
            <input class="qty-input" type="number" v-model.number="quantity" min="1" :max="product.stock" />
          </div>

          <button
            class="btn-primary"
            :disabled="loading || quantity < 1 || quantity > product.stock"
            @click="submitStockOut"
          >
            Stock Out
          </button>
        </div>
      </div>
  </div>
</template>

<script>
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import { stockOutApi } from '@/services/api'

export default {
  name: 'StockOutPage',
  components: { BarcodeScanner },

  data() {
    return {
      product: null,
      quantity: 1,
      loading: false
    }
  },

  methods: {
    async onScan(code) {
      try {
        this.loading = true
        const res = await stockOutApi.lookupProduct(code)
        const p = res.data?.product ?? null
        if (!p) throw new Error('not found')
        // normalize fields expected by template
        this.product = {
          id: p.id,
          barcode: p.barcode,
          name: p.name,
          price: p.sale_price ?? p.price ?? 0,
          stock: p.quantity ?? p.quantity ?? 0,
        }
      } catch (e) {
        this.$q.notify({ type: 'negative', message: 'Product not found' })
      } finally {
        this.loading = false
      }
    },

    async submitStockOut() {
      try {
        this.loading = true
        await stockOutApi.stockOut({
          barcode: this.product.barcode,
          quantity: this.quantity
        })
        this.$q.notify({ type: 'positive', message: 'Stock out successful' })
        this.product = null
      } catch (e) {
        this.$q.notify({ type: 'negative', message: 'Stock out failed' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.stock-out-page {
  max-width: 900px;
  margin: auto;
  padding: 1.5rem;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}

.product-card {
  background: #ffffff;
  padding: 1.2rem;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(20,20,30,0.06);
}
.card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem }
.product-name { font-weight:700; font-size:1.15rem }
.product-price { color:#1976d2; font-weight:600 }
.stock-badge { display:inline-block; background:#f0f7ef; color:#1b5e20; padding:6px 10px; border-radius:16px; font-weight:600 }
.form-group { margin-top:0.8rem }
.qty-input { width:80px; padding:6px 8px; border:1px solid #e0e0e0; border-radius:6px }
.btn-primary { margin-top:1rem; padding:0.6rem 1rem; background:linear-gradient(180deg,#e53935,#c62828); color:#fff; border:none; border-radius:8px; cursor:pointer }
.btn-primary:disabled { opacity:0.6; cursor:not-allowed }
</style>
