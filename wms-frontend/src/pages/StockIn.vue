<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import { stockInApi } from '@/services/api'

const $q = useQuasar()

const scannedProduct = ref(null)
const quantity = ref(1)
const notes = ref('')
const isSubmitting = ref(false)
const message = ref('')
const autoSubmit = ref(true)

const handleScan = async (barcode) => {
  try {
    // Lookup product
    const response = await stockInApi.lookupProduct(barcode)
    scannedProduct.value = response.data.product
    message.value = ''

    // Immediately submit stock-in with quantity=1 (no UI confirmation)
    isSubmitting.value = true
    try {
      const requestId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `r-${Date.now()}-${Math.floor(Math.random()*1000)}`
      const res = await stockInApi.stockIn({
        barcode: scannedProduct.value.barcode,
        quantity: 1,
        notes: 'Auto scan submit'
      }, { headers: { 'Idempotency-Key': requestId } })
      $q.notify({ type: 'positive', message: 'Stocked in (1)', caption: `SKU: ${scannedProduct.value.sku}` })
      // update UI briefly
      message.value = `Stocked in 1 product (SKU ${scannedProduct.value.sku})`
      // reset scanned product after a short delay so scanner can continue
      setTimeout(() => {
        scannedProduct.value = null
        message.value = ''
      }, 900)
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Stock in failed' })
    } finally {
      isSubmitting.value = false
    }

  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Product not found'
    })
  }
}

const submitStockIn = async () => {
  if (!scannedProduct.value || quantity.value < 1) return
  
  isSubmitting.value = true
  
  try {
    const response = await stockInApi.stockIn({
      barcode: scannedProduct.value.barcode,
      quantity: quantity.value,
      notes: notes.value
    })
    
    $q.notify({
      type: 'positive',
      message: 'Stock in successful',
      caption: `New quantity: ${response.data.data.new_quantity}`
    })
    
    message.value = `Stocked in ${quantity.value} products!`
    
    // Reset form
    scannedProduct.value = null
    quantity.value = 1
    notes.value = ''
    
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Stock in failed'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="stock-in-page">
    <h2 class="page-title">Stock In</h2>

    <div class="layout-grid">
      <div class="left">
        <div class="scanner-wrap">
          <BarcodeScanner mode="hardware" :disabled="isSubmitting" @scan="handleScan" />
        </div>
        <div class="auto-submit-row">
          <input type="checkbox" id="autoSubmit" v-model="autoSubmit" />
          <label for="autoSubmit">Auto-confirm after scan</label>
        </div>
      </div>

      <div class="right">
        <q-card v-if="scannedProduct" class="product-card">
          <q-card-section>
            <div class="product-head">
              <div>
                <div class="product-name">{{ scannedProduct.name }}</div>
                <div class="product-sku">SKU: {{ scannedProduct.sku }}</div>
              </div>
              <div class="product-price">{{ scannedProduct.price.toLocaleString() }}₫</div>
            </div>

            <div class="product-meta">
              <div>Current stock: <strong>{{ scannedProduct.inventory ? scannedProduct.inventory.quantity : 0 }}</strong></div>
            </div>

            <div class="form-group">
              <label>Stock-in Quantity</label>
              <input type="number" v-model.number="quantity" min="1" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input type="text" v-model="notes" placeholder="Notes (optional)" />
            </div>

            <div class="actions">
              <button class="btn-primary" @click="submitStockIn" :disabled="isSubmitting">Confirm Stock In</button>
            </div>

            <p v-if="message" class="message">{{ message }}</p>
          </q-card-section>
        </q-card>

      </div>
    </div>
  </div>
</template>

<style scoped>
.stock-in-page {
  max-width: 920px;
  margin: 1.2em auto;
  padding: 1rem;
}
.scanner-section {
  margin-bottom: 1.5em;
}
.product-info {
  margin-top: 1em;
  background: transparent;
  border-radius: 8px;
  padding: 0;
}
.form-group {
  margin: 0.7em 0;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}
input[type="number"], input[type="text"] {
  padding: 0.5em;
  border: 1px solid #bdbdbd;
  border-radius: 5px;
  font-size: 1em;
}
.btn-primary {
  background: linear-gradient(90deg,#388e3c,#66bb6a);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.85em 1.2em;
  font-size: 1.05rem;
  font-weight: 700;
  margin-top: 0.6em;
  cursor: pointer;
  width: 100%;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed }
.hint {
  color: #888;
  text-align: center;
  margin-top: 2em;
}
.message {
  color: #388e3c;
  margin-top: 0.7em;
  text-align: center;
}

/* layout grid */
.layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem }
.scanner-wrap { background: #fff; border-radius: 10px; padding: 0.8rem }
.product-card { border-radius: 10px }
.product-head { display:flex; justify-content:space-between; align-items:center; gap:0.8rem }
.product-name { font-size:1.1rem; font-weight:700 }
.product-price { font-weight:700; color:#1976d2 }
.product-meta { margin-top:0.6rem; color:#555 }
.auto-submit-row { margin-top:0.6rem }

@media (max-width: 800px) {
  .layout-grid { grid-template-columns: 1fr; }
  .stock-in-page { padding: 0.6rem }
  .scanner-wrap { padding: 0.4rem }
  .product-head { flex-direction: column; align-items:flex-start; gap:0.4rem }
  .action { display:flex; gap:0.5rem }
  .btn-primary { padding: 0.9rem }
}
</style>
