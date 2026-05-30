<template>
  <div class="page-wrapper">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <h1 class="text-h4 q-my-none">Stock Movement History</h1>
      <q-btn
        color="primary"
        icon="download"
        label="Export CSV"
        @click="handleExport"
        :loading="isExporting"
        flat
      />
    </div>

    <!-- Filters Card -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="text-subtitle2 q-mb-md">Search and Filter</div>
        
        <div class="row q-col-gutter-md q-mb-md">
          <!-- Search -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-input
              v-model="filters.search"
              label="Product Name, SKU, Barcode"
              outlined
              dense
              debounce="300"
              @update:model-value="onFilterChange"
              clearable
            />
          </div>

          <!-- Type Filter -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filters.type"
              label="Transaction Type"
              :options="typeOptions"
              outlined
              dense
              emit-value
              map-options
              clearable
              @update:model-value="onFilterChange"
            />
          </div>

          <!-- Date From -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-input
              v-model="filters.date_from"
              label="From Date"
              type="date"
              outlined
              dense
              @update:model-value="onFilterChange"
              clearable
            />
          </div>

          <!-- Date To -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-input
              v-model="filters.date_to"
              label="To Date"
              type="date"
              outlined
              dense
              @update:model-value="onFilterChange"
              clearable
            />
          </div>

          <!-- User Filter -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filters.user_id"
              label="Performed By"
              :options="userOptions"
              option-value="id"
              option-label="name"
              outlined
              dense
              emit-value
              @update:model-value="onFilterChange"
              clearable
            />
          </div>

          <!-- Product Filter -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filters.product_id"
              label="Product"
              :options="productOptions"
              option-value="id"
              option-label="name"
              outlined
              dense
              emit-value
              @update:model-value="onFilterChange"
              clearable
            />
          </div>

          <!-- Sort By -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filters.sort_by"
              label="Sort By"
              :options="sortOptions"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onFilterChange"
            />
          </div>

          <!-- Sort Order -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filters.sort_order"
              label="Order"
              :options="sortOrderOptions"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onFilterChange"
            />
          </div>

          <!-- Per Page -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filters.per_page"
              label="Rows Per Page"
              :options="perPageOptions"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onFilterChange"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="row q-gutter-md">
          <q-btn
            color="primary"
            label="Search"
            icon="search"
            @click="searchMovements"
            :loading="isLoading"
          />
          <q-btn
            color="secondary"
            label="Clear Filters"
            icon="clear"
            @click="resetFilters"
            flat
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Results Table -->
    <q-card>
      <q-card-section>
        <div class="text-subtitle2 q-mb-md">
          Results: {{ (movements.meta && movements.meta.total) || 0 }} records
        </div>

        <div class="table-responsive">
          <q-table
            :rows="movements.data || []"
            :columns="columns"
            row-key="id"
            :loading="isLoading"
            :pagination.sync="pagination"
            @request="onPaginationChange"
            flat
            bordered
            class="full-width"
          >
            <!-- Type Column -->
            <template #body-cell-type="props">
              <q-td :props="props">
                <q-badge
                  :label="props.row.type === 'in' ? 'In' : 'Out'"
                  :color="props.row.type === 'in' ? 'positive' : 'negative'"
                />
              </q-td>
            </template>

            <!-- Quantity Column -->
            <template #body-cell-quantity="props">
              <q-td :props="props">
                <span :class="props.row.type === 'in' ? 'text-positive' : 'text-negative'">
                  {{ props.row.type === 'in' ? '+' : '-' }}{{ Math.abs(props.row.quantity) }}
                </span>
              </q-td>
            </template>

            <!-- Product Column -->
            <template #body-cell-product="props">
              <q-td :props="props">
                <div>
                  <div class="text-weight-bold">{{ props.row.product ? props.row.product.name : '' }}</div>
                  <div class="text-caption text-grey">
                    SKU: {{ props.row.product ? props.row.product.sku : '' }} | Barcode: {{ props.row.product ? props.row.product.barcode : '' }}
                  </div>
                </div>
              </q-td>
            </template>

            <!-- User Column -->
            <template #body-cell-user="props">
              <q-td :props="props">
                {{ (props.row.user && props.row.user.name) ? props.row.user.name : 'System' }}
              </q-td>
            </template>

            <!-- Created At Column -->
            <template #body-cell-created_at="props">
              <q-td :props="props">
                {{ formatDateTime(props.row.created_at) }}
              </q-td>
            </template>

            <!-- Empty State -->
            <template #no-data>
              <div class="full-width row flex-center q-py-lg">
                <q-icon name="inbox" size="48px" color="grey-5" class="q-mr-md" />
                <div>
                  <div class="text-h6">No data</div>
                  <div class="text-caption text-grey">Change filters to search</div>
                </div>
              </div>
            </template>
          </q-table>
        </div>

        <!-- Pagination Info -->
        <div class="row items-center justify-between q-mt-md text-caption text-grey">
          <span>
            Showing {{ (movements.meta && movements.meta.from) || 0 }} to {{ (movements.meta && movements.meta.to) || 0 }}
            of {{ (movements.meta && movements.meta.total) || 0 }}
          </span>
          <div class="row q-gutter-sm">
            <q-btn
              icon="first_page"
              flat
              dense
              @click="goToPage(1)"
              :disable="pagination.page === 1 || isLoading"
            />
            <q-btn
              icon="chevron_left"
              flat
              dense
              @click="goToPage(pagination.page - 1)"
              :disable="pagination.page === 1 || isLoading"
            />
            <q-btn
              icon="chevron_right"
              flat
              dense
              @click="goToPage(pagination.page + 1)"
              :disable="pagination.page === lastPage || isLoading"
            />
            <q-btn
              icon="last_page"
              flat
              dense
              @click="goToPage(lastPage)"
              :disable="pagination.page === lastPage || isLoading"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { stockMovementApi, userApi, productApi } from '@/services/api'

const $q = useQuasar()

// State
const isLoading = ref(false)
const isExporting = ref(false)
const movements = reactive({
  data: [],
  meta: {
    total: 0,
    per_page: 20,
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
  },
})

const filters = reactive({
  search: '',
  type: null,
  user_id: null,
  product_id: null,
  date_from: '',
  date_to: '',
  sort_by: 'created_at',
  sort_order: 'desc',
  per_page: 20,
  page: 1,
})

const pagination = reactive({
  page: 1,
  rowsPerPage: 20,
})

const userOptions = ref([])
const productOptions = ref([])

// Options for selects
const typeOptions = [
  { label: 'In', value: 'in' },
  { label: 'Out', value: 'out' },
]

const sortOptions = [
  { label: 'Time', value: 'created_at' },
  { label: 'Quantity', value: 'quantity' },
  { label: 'Transaction Type', value: 'type' },
]

const sortOrderOptions = [
  { label: 'Newest', value: 'desc' },
  { label: 'Oldest', value: 'asc' },
]

const perPageOptions = [10, 20, 50, 100]

const lastPage = computed(() => movements.meta.last_page || 1)

// Table columns
const columns = [
  {
    name: 'product',
    align: 'left',
    label: 'Product',
    field: 'product',
  },
  {
    name: 'type',
    align: 'center',
    label: 'Type',
    field: 'type',
  },
  {
    name: 'quantity',
    align: 'right',
    label: 'Quantity',
    field: 'quantity',
  },
  {
    name: 'user',
    align: 'left',
    label: 'Performed By',
    field: 'user',
  },
  {
    name: 'created_at',
    align: 'left',
    label: 'Time',
    field: 'created_at',
  },
]

// Methods
const searchMovements = async () => {
  try {
    isLoading.value = true
    filters.page = 1
    pagination.page = 1

    const response = await stockMovementApi.getFiltered(filters)
    movements.data = response.data.data
    movements.meta = response.data.meta

    $q.notify({
      type: 'positive',
      message: `Found ${movements.meta.total} records`,
      position: 'top',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Error loading data',
      position: 'top',
    })
  } finally {
    isLoading.value = false
  }
}

const onFilterChange = () => {
  // Debounce search on filter change
}

const onPaginationChange = async (props) => {
  const { page, rowsPerPage } = props.pagination
  filters.page = page
  filters.per_page = rowsPerPage
  pagination.page = page
  pagination.rowsPerPage = rowsPerPage
  await searchMovements()
}

const goToPage = async (pageNum) => {
  pagination.page = pageNum
  filters.page = pageNum
  await searchMovements()
}

const resetFilters = () => {
  filters.search = ''
  filters.type = null
  filters.user_id = null
  filters.product_id = null
  filters.date_from = ''
  filters.date_to = ''
  filters.sort_by = 'created_at'
  filters.sort_order = 'desc'
  filters.per_page = 20
  filters.page = 1
  pagination.page = 1
  pagination.rowsPerPage = 20
  searchMovements()
}

const handleExport = async () => {
  try {
    isExporting.value = true

    const response = await stockMovementApi.export(filters)
    const csv = response.data.csv || ''
    const filename = response.data.filename

    // Create blob and download
    // Excel on Windows often mis-detects UTF-8 without BOM and shows Vietnamese as garbled.
    const utf8Bom = '\uFEFF'
    const blob = new Blob([utf8Bom, csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    $q.notify({
      type: 'positive',
      message: 'Data exported successfully',
      position: 'top',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Error exporting data',
      position: 'top',
    })
  } finally {
    isExporting.value = false
  }
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Load initial data
const loadUsers = async () => {
  try {
    const response = await userApi.getAll({ per_page: 1000 })
    userOptions.value = Array.isArray(response.data) ? response.data : response.data.data || []
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

const loadProducts = async () => {
  try {
    const response = await productApi.getAll({ per_page: 1000 })
    productOptions.value = Array.isArray(response.data) ? response.data : response.data.data || []
  } catch (error) {
    console.error('Failed to load products:', error)
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadProducts()])
  await searchMovements()
})
</script>

<style scoped>
.page-wrapper {
  padding: 24px;
}

.table-responsive {
  overflow-x: auto;
}

@media (max-width: 600px) {
  .page-wrapper {
    padding: 12px;
  }
  
  .table-responsive {
    font-size: 12px;
  }
}
</style>
