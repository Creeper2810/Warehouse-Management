<template>
  <div class="product-list-page q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Product Management</div>
      <q-btn
        v-if="canManageProducts"
        color="primary"
        icon="add"
        label="Add Product"
        @click="$router.push('/products/create')"
      />
    </div>

    <!-- Search -->
    <q-card class="q-mb-md">
      <q-card-section>
        <q-input
          v-model="searchQuery"
          placeholder="Search by name, SKU, or barcode..."
          outlined
          dense
          clearable
          @update:model-value="handleSearch"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- Products Table -->
    <q-card v-else-if="products.length > 0">
      <q-table
        :rows="products"
        :columns="columns"
        row-key="id"
        :rows-per-page-options="[10, 25, 50]"
        flat
        class="products-table"
      >
        <template #body-cell-barcode="props">
          <q-td :props="props">
            <code class="barcode-text">{{ props.row.barcode }}</code>
          </q-td>
        </template>

        <template #body-cell-purchase_price="props">
          <q-td :props="props">
            {{ formatPrice(props.row.purchase_price) }}
          </q-td>
        </template>

        <template #body-cell-sale_price="props">
          <q-td :props="props">
            {{ formatPrice(props.row.sale_price) }}
          </q-td>
        </template>

        <template #body-cell-quantity="props">
          <q-td :props="props">
            <q-badge
              :color="getQuantity(props.row) <= (props.row.low_stock_threshold || 0) ? 'negative' : 'positive'"
            >
              {{ getQuantity(props.row) || 0 }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row q-gutter-sm no-wrap">
              <q-btn
                flat
                dense
                round
                color="primary"
                icon="visibility"
                size="sm"
                @click="viewProduct(props.row.id)"
              >
                <q-tooltip>View details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canManageProducts"
                flat
                dense
                round
                color="orange"
                icon="edit"
                size="sm"
                @click="editProduct(props.row.id)"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canManageProducts"
                flat
                dense
                round
                color="negative"
                icon="delete"
                size="sm"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Empty State -->
    <q-card v-else class="text-center q-py-xl">
      <q-icon name="inventory_2" size="80px" color="grey-4" />
      <div class="text-h6 text-grey-6 q-mt-md">No products yet</div>
      <div class="text-grey-5 q-mb-md">Add the first product to get started</div>
      <q-btn
        v-if="canManageProducts"
        color="primary"
        label="Add Product"
        @click="$router.push('/products/create')"
      />
    </q-card>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Confirm Delete</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          Are you sure you want to delete product <strong>{{ productToDelete ? productToDelete.name : '' }}</strong>?
          <div class="text-caption text-orange q-mt-sm">
            Products with inventory or transaction history cannot be deleted.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            :loading="isDeleting"
            @click="deleteProduct"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { productApi } from '@/services/api'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

// Permissions
const canManageProducts = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin' || role === 'manager'
})

// State
const products = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const deleteDialog = ref(false)
const productToDelete = ref(null)
const isDeleting = ref(false)

// Table columns
const columns = [
  {
    name: 'sku',
    label: 'SKU',
    field: 'sku',
    align: 'left',
    sortable: true
  },
  {
    name: 'barcode',
    label: 'Barcode',
    field: 'barcode',
    align: 'left',
    sortable: true
  },
  {
    name: 'name',
    label: 'Product Name',
    field: 'name',
    align: 'left',
    sortable: true
  },
  {
    name: 'unit',
    label: 'Unit',
    field: 'unit',
    align: 'center',
    sortable: true
  },
  {
    name: 'purchase_price',
    label: 'Purchase Price',
    field: 'purchase_price',
    align: 'right',
    sortable: true
  },
  {
    name: 'sale_price',
    label: 'Sale Price',
    field: 'sale_price',
    align: 'right',
    sortable: true
  },
  {
    name: 'quantity',
    label: 'Stock',
    field: 'quantity',
    align: 'center',
    sortable: true
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'center'
  }
]

// Methods
const loadProducts = async () => {
  isLoading.value = true
  try {
    const params = {}
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const response = await productApi.getAll(params)
    products.value = response.data || []
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load products'
    })
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  // Debounce search
  clearTimeout(window.searchTimeout)
  window.searchTimeout = setTimeout(() => {
    loadProducts()
  }, 500)
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

const viewProduct = (id) => {
  router.push(`/products/${id}`)
}

const editProduct = (id) => {
  router.push(`/products/${id}/edit`)
}

const confirmDelete = (product) => {
  productToDelete.value = product
  deleteDialog.value = true
}

const deleteProduct = async () => {
  if (!productToDelete.value) return
  
  isDeleting.value = true
  try {
    await productApi.delete(productToDelete.value.id)
    
    $q.notify({
      type: 'positive',
      message: 'Product deleted successfully'
    })
    
    deleteDialog.value = false
    productToDelete.value = null
    loadProducts()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to delete product'
    })
  } finally {
    isDeleting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadProducts()
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

.products-table {
  font-size: 14px;
}
</style>
