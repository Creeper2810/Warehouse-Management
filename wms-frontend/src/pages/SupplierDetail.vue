<template>
  <div class="supplier-detail-page q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" @click="$router.back()" />
      <div class="text-h5 q-ml-md">Supplier Details</div>
      <q-space />
      <q-btn
        v-if="canManageSuppliers"
        color="orange"
        icon="edit"
        label="Edit"
        @click="router.push(`/suppliers/${supplierId}/edit`)"
      />
    </div>

    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <q-card v-else-if="supplier">
      <q-card-section>
        <div class="row items-center q-col-gutter-md">
          <div class="col-12 col-md-8">
            <div class="text-h6">{{ supplier.name }}</div>
            <div class="text-body2 text-grey-7">
              {{ supplier.address || '—' }}
            </div>
          </div>

          <div class="col-12 col-md-4" style="text-align:right">
            <q-chip
              :color="supplier.status === 'inactive' ? 'grey-6' : 'positive'"
              text-color="white"
              dense
            >
              {{ supplier.status === 'inactive' ? 'Inactive' : 'Active' }}
            </q-chip>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-item>
              <q-item-section avatar><q-icon name="person" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Contact Person</q-item-label>
                <q-item-label>{{ supplier.contact_name || '—' }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>

          <div class="col-12 col-md-6">
            <q-item>
              <q-item-section avatar><q-icon name="phone" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Phone Number</q-item-label>
                <q-item-label>{{ supplier.phone || '—' }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>

          <div class="col-12 col-md-6">
            <q-item>
              <q-item-section avatar><q-icon name="mail" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Email</q-item-label>
                <q-item-label>{{ supplier.email || '—' }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Related Products</div>
        <q-table
          :rows="supplier.products || []"
          :columns="productColumns"
          row-key="id"
          flat
          :rows-per-page-options="[10, 25, 50]"
          no-data-label="This supplier has no linked products"
        />
      </q-card-section>
    </q-card>

    <q-card v-else class="text-center q-py-xl">
      <q-icon name="error_outline" size="60px" color="grey-5" />
      <div class="text-h6 text-grey-7 q-mt-md">Supplier not found</div>
      <q-btn flat color="primary" class="q-mt-md" label="Back" @click="router.push('/suppliers')" />
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { supplierApi } from '@/services/api'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const supplierId = computed(() => route.params.id)
const isLoading = ref(false)
const supplier = ref(null)

const canManageSuppliers = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin'
})

const productColumns = [
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left', sortable: true },
  { name: 'barcode', label: 'Barcode', field: 'barcode', align: 'left', sortable: true },
  { name: 'name', label: 'Product Name', field: 'name', align: 'left', sortable: true },
]

const loadSupplier = async () => {
  isLoading.value = true
  try {
    const res = await supplierApi.getById(supplierId.value)
    supplier.value = res.data
  } catch (e) {
    supplier.value = null
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Unable to load supplier details'
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!canManageSuppliers.value) {
    $q.notify({ type: 'negative', message: 'You do not have permission to access this feature' })
    router.push('/')
    return
  }

  loadSupplier()
})
</script>
