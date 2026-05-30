<template>
  <div class="supplier-list-page q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Suppliers</div>
      <q-btn
        v-if="canManageSuppliers"
        color="primary"
        icon="add"
        label="Add Supplier"
        @click="$router.push('/suppliers/create')"
      />
    </div>

    <!-- Search -->
    <q-card class="q-mb-md">
      <q-card-section>
        <q-input
          v-model="searchQuery"
          placeholder="Search by name, phone, or email..."
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

    <!-- Suppliers Table -->
    <q-card v-else-if="suppliers.length > 0">
      <q-table
        :rows="filteredSuppliers"
        :columns="columns"
        row-key="id"
        :rows-per-page-options="[10, 25, 50]"
        flat
      >
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
                @click="viewSupplier(props.row.id)"
              >
                <q-tooltip>View details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canManageSuppliers"
                flat
                dense
                round
                color="orange"
                icon="edit"
                size="sm"
                @click="editSupplier(props.row.id)"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canManageSuppliers"
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
      <q-icon name="local_shipping" size="80px" color="grey-4" />
      <div class="text-h6 text-grey-6 q-mt-md">No suppliers yet</div>
      <div class="text-grey-5 q-mb-md">Add the first supplier to get started</div>
      <q-btn
        v-if="canManageSuppliers"
        color="primary"
        label="Add Supplier"
        @click="$router.push('/suppliers/create')"
      />
    </q-card>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Confirm Delete</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          Are you sure you want to delete supplier <strong>{{ supplierToDelete ? supplierToDelete.name : '' }}</strong>?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            :loading="isDeleting"
            @click="deleteSupplier"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { supplierApi } from '@/services/api'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const canManageSuppliers = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin'
})

const suppliers = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const deleteDialog = ref(false)
const supplierToDelete = ref(null)
const isDeleting = ref(false)

const columns = [
  { name: 'name', label: 'Supplier Name', field: 'name', align: 'left', sortable: true },
  { name: 'contact_name', label: 'Contact Person', field: 'contact_name', align: 'left', sortable: true },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'address', label: 'Address', field: 'address', align: 'left' },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'left',
    sortable: true,
    format: (val) => {
      if (!val) return '—'
      return val === 'inactive' ? 'Inactive' : 'Active'
    }
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const viewSupplier = (id) => {
  router.push(`/suppliers/${id}`)
}

const filteredSuppliers = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (!q) return suppliers.value

  return suppliers.value.filter((s) => {
    const hay = [s.name, s.contact_name, s.phone, s.email, s.address]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const loadSuppliers = async () => {
  isLoading.value = true
  try {
    const response = await supplierApi.getAll()
    suppliers.value = response.data || []
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load suppliers'
    })
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  // search is computed client-side
}

const editSupplier = (id) => {
  router.push(`/suppliers/${id}/edit`)
}

const confirmDelete = (supplier) => {
  supplierToDelete.value = supplier
  deleteDialog.value = true
}

const deleteSupplier = async () => {
  if (!supplierToDelete.value) return

  isDeleting.value = true
  try {
    await supplierApi.delete(supplierToDelete.value.id)
    $q.notify({ type: 'positive', message: 'Supplier deleted successfully' })
    deleteDialog.value = false
    supplierToDelete.value = null
    await loadSuppliers()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to delete supplier'
    })
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  if (!canManageSuppliers.value) {
    $q.notify({ type: 'negative', message: 'You do not have permission to access this feature' })
    router.push('/')
    return
  }

  loadSuppliers()
})
</script>
