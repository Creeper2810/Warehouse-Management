<template>
  <div class="product-detail-page q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        @click="$router.back()"
      />
      <div class="text-h5 q-ml-md">Product Details</div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- Product Details -->
    <div v-else-if="product">
      <q-card class="q-mb-md">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ product.name }}</div>
          <div class="text-caption">SKU: {{ product.sku }}</div>
        </q-card-section>

        <q-card-section>
          <div class="row q-col-gutter-md">
            <!-- Basic Info -->
            <div class="col-12 col-md-6">
              <q-list>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="qr_code" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Barcode</q-item-label>
                    <q-item-label>
                      <code class="barcode-text">{{ product.barcode }}</code>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="straighten" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Unit</q-item-label>
                    <q-item-label>{{ product.unit || 'pcs' }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="inventory" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Stock</q-item-label>
                    <q-item-label>
                      <q-badge
                        :color="getQuantity(product) <= (product.low_stock_threshold || 0) ? 'negative' : 'positive'"
                        class="text-h6"
                      >
                        {{ getQuantity(product) }}
                      </q-badge>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="warning" color="orange" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Alert Threshold</q-item-label>
                    <q-item-label>{{ product.low_stock_threshold || 0 }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="local_shipping" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Supplier</q-item-label>
                    <q-item-label>
                      {{ (product.supplier_names && product.supplier_names.length)
                        ? product.supplier_names.join(', ')
                        : (product.suppliers && product.suppliers.length)
                          ? product.suppliers.map(s => s.name).join(', ')
                          : '-' }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Price Info -->
            <div class="col-12 col-md-6">
              <q-list>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="shopping_cart" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Purchase Price</q-item-label>
                    <q-item-label class="text-h6">{{ formatPrice(product.purchase_price) }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="sell" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Sale Price</q-item-label>
                    <q-item-label class="text-h6">{{ formatPrice(product.sale_price) }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="trending_up" color="positive" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Estimated Profit</q-item-label>
                    <q-item-label class="text-h6 text-positive">
                      {{ formatPrice((product.sale_price || 0) - (product.purchase_price || 0)) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-card-section>

        <!-- Actions -->
        <q-card-actions v-if="canManageProducts" align="right" class="q-pa-md">
          <q-btn
            color="primary"
            icon="edit"
            label="Edit"
            @click="$router.push(`/products/${product.id}/edit`)"
          />
        </q-card-actions>
      </q-card>

      <!-- Additional Info -->
      <q-card>
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Additional Information</div>
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-icon name="event" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption>Created At</q-item-label>
                <q-item-label>{{ formatDate(product.created_at) }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon name="update" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption>Last Updated</q-item-label>
                <q-item-label>{{ formatDate(product.updated_at) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>

    <!-- Error State -->
    <q-card v-else class="text-center q-py-xl">
      <q-icon name="error_outline" size="80px" color="negative" />
      <div class="text-h6 text-grey-6 q-mt-md">Product not found</div>
      <q-btn
        color="primary"
        label="Back"
        class="q-mt-md"
        @click="$router.push('/products')"
      />
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { productApi } from '@/services/api'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Permissions
const canManageProducts = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin' || role === 'manager'
})

// State
const product = ref(null)
const isLoading = ref(false)

// Methods
const loadProduct = async () => {
  isLoading.value = true
  try {
    const response = await productApi.getById(route.params.id)
    product.value = response.data
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load product details'
    })
  } finally {
    isLoading.value = false
  }
}

const formatPrice = (value) => {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

const getQuantity = (product) => {
  // Priority: inventory.quantity (from eager loaded relationship) > quantity field
  return product.inventory?.quantity ?? product.quantity ?? 0
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadProduct()
})
</script>

<style scoped>
.barcode-text {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}
</style>
