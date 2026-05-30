<template>
  <div class="alerts-page q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Low Stock Alerts</div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- Alerts List -->
    <q-card v-else-if="alerts.length > 0">
      <q-list>
        <q-item
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-item"
        >
          <q-item-section avatar>
            <q-icon name="warning" color="orange" size="md" />
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-bold">
              {{ alert.product_name || alert.name }}
            </q-item-label>
            <q-item-label caption>
              SKU: {{ alert.product_sku || alert.sku }}
              | Barcode: {{ alert.product_barcode || alert.barcode }}
            </q-item-label>
          </q-item-section>

          <q-item-section side top>
            <div class="text-right">
              <q-badge
                color="negative"
                text-color="white"
                :label="`${alert.current_quantity || 0}`"
              />
              <div class="text-caption text-grey">
                Threshold: {{ alert.threshold || 10 }}
              </div>
            </div>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item>
          <q-item-section>
            <div class="text-caption text-grey">
              Total alerts: <strong>{{ alerts.length }}</strong>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Empty State -->
    <q-card v-else class="text-center q-py-xl">
      <q-icon name="check_circle" size="80px" color="positive" />
      <div class="text-h6 text-positive q-mt-md">All products have enough stock</div>
      <div class="text-grey-6 q-mb-md">No low stock alerts</div>
    </q-card>

    <!-- Error State -->
    <q-banner v-if="error" class="bg-negative text-white q-mt-md">
      <q-icon name="error" size="md" class="q-mr-sm" />
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { alertsApi, productApi, inventoryApi } from '@/services/api'

const $q = useQuasar()

// State
const alerts = ref([])
const isLoading = ref(false)
const error = ref('')

/**
 * Load alerts from API
 */
const loadAlerts = async () => {
  isLoading.value = true
  error.value = ''
  try {
    // Get low stock items from inventory
    const response = await inventoryApi.getLowStock()
    
    if (response.data && Array.isArray(response.data)) {
      alerts.value = response.data.map(item => ({
        id: item.id || item.product_id,
        product_id: item.product_id,
        product_name: item.product_name || item.name,
        product_sku: item.product_sku || item.sku,
        product_barcode: item.product_barcode || item.barcode,
        current_quantity: item.current_quantity || item.quantity,
        threshold: item.threshold || item.low_stock_threshold || item.reorder_level || 10,
      }))
    } else {
      alerts.value = []
    }
  } catch (err) {
    console.error('Error loading alerts:', err)
    error.value = 'Unable to load alerts'
    $q.notify({
      type: 'negative',
      message: 'Data loading error: ' + (err.response?.data?.message || err.message)
    })
  } finally {
    isLoading.value = false
  }
}

/**
 * Lifecycle
 */
onMounted(() => {
  loadAlerts()
})
</script>

<style scoped>
.alerts-page {
  max-width: 800px;
  margin: 0 auto;
}

.alert-item {
  border-left: 4px solid #ff9800;
  background: #fffbf0;
}

.alert-item:hover {
  background: #fff8e1;
}
</style>
