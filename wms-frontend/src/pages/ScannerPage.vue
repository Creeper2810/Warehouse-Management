<template>
  <div class="scanner-page">
    <div class="row q-col-gutter-sm">
      <!-- Left: Stock movement logs (always visible) -->
      <div class="col-12 col-md-3">
        <q-card class="log-card">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1">Stock Log</div>
            <q-btn
              flat
              dense
              icon="refresh"
              :loading="isLogLoading"
              @click="fetchMovementLogs"
              aria-label="Refresh log"
            />
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pa-none">
            <q-scroll-area class="log-scroll">
              <div class="q-pa-md">
                <q-input
                  v-model="logSearch"
                  dense
                  outlined
                  clearable
                  debounce="200"
                  placeholder="Search product name"
                  class="q-mb-sm"
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>

                <div v-if="isLogLoading" class="q-mb-md">
                  <q-linear-progress indeterminate color="primary" />
                </div>

                <div v-else-if="filteredMovementLogs.length === 0" class="text-center text-grey-6">
                  No matching logs
                </div>

                <q-table
                  v-else
                  :rows="filteredMovementLogs"
                  :columns="logColumns"
                  row-key="id"
                  dense
                  flat
                  bordered
                  hide-pagination
                  :rows-per-page-options="[]"
                  class="log-table"
                >
                  <template #body-cell-status="props">
                    <q-td :props="props" class="text-center">
                      <q-badge
                        :label="props.row.type === 'in' ? 'IN' : 'OUT'"
                        :color="props.row.type === 'in' ? 'positive' : 'negative'"
                      />
                    </q-td>
                  </template>

                  <template #body-cell-product_name="props">
                    <q-td :props="props">
                      <div class="ellipsis">
                        {{ getMovementProductName(props.row) }}
                      </div>
                    </q-td>
                  </template>

                  <template #body-cell-quantity="props">
                    <q-td :props="props" class="text-right">
                      <span :class="props.row.type === 'in' ? 'text-positive' : 'text-negative'">
                        {{ props.row.type === 'in' ? '+' : '-' }}{{ Math.abs(props.row.quantity || 0) }}
                      </span>
                    </q-td>
                  </template>

                  <template #body-cell-user="props">
                    <q-td :props="props">
                      {{ getMovementUserLabel(props.row) }}
                    </q-td>
                  </template>
                </q-table>
              </div>
            </q-scroll-area>
          </q-card-section>
        </q-card>
      </div>

      <!-- Right: Scanner UI -->
      <div class="col-12 col-md-8">
        <!-- Compact Header -->
        <div class="page-header q-mb-md">
          <div>
            <h1 class="text-h5 q-ma-none">Scan Barcode</h1>
            <div class="text-caption text-grey-7">Fast scan, manual entry, or camera input</div>
          </div>
          <q-chip
            :color="scannerStatusColor"
            text-color="white"
            icon="sensors"
            dense
          >
            {{ scannerStatusText }}
          </q-chip>
        </div>

        <!-- Quick Input Section -->
        <q-card class="q-mb-md input-card">
          <q-card-section class="q-pa-sm">
            <div class="row q-col-gutter-sm items-end">
              <div class="col-grow">
                <q-input
                  v-model="manualBarcode"
                  dense
                  outlined
                  placeholder="Enter barcode or scan (HID)..."
                  @keyup.enter="handleManualEntry"
                >
                  <template #prepend>
                    <q-icon name="qr_code" />
                  </template>
                  <template #append>
                    <q-btn
                      flat
                      dense
                      icon="check"
                      color="positive"
                      @click="handleManualEntry"
                      :disable="!manualBarcode"
                    />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-12 col-sm-6">
                <q-btn
                  outline
                  dense
                  color="primary"
                  icon="photo_camera"
                  label="Camera"
                  :disable="cameraActive"
                  class="full-width"
                  @click="toggleCamera"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-btn
                  outline
                  dense
                  color="info"
                  icon="history"
                  label="History"
                  class="full-width"
                  @click="fillFromHistory"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

    <!-- Camera Section (Lazy Loaded) -->
    <div v-if="cameraVisible" class="q-mb-md camera-section">
      <q-card>
        <q-card-section class="camera-wrapper q-pa-none">
          <div class="camera-container">
            <video ref="videoRef" class="camera-preview" autoplay playsinline webkit-playsinline muted></video>
            
            <div class="scan-overlay">
              <div class="viewfinder-container">
                <div class="viewfinder-box">
                  <div class="corner corner-tl"></div>
                  <div class="corner corner-tr"></div>
                  <div class="corner corner-bl"></div>
                  <div class="corner corner-br"></div>
                  <div class="scan-line"></div>
                </div>
              </div>
              
              <div class="scan-instructions">
                <div class="instruction-text">Place the barcode inside the frame</div>
              </div>

              <div v-if="isScanningCamera" class="scan-status">
                <q-spinner-dots color="white" size="md" />
                <span>Scanning...</span>
              </div>
            </div>

            <div class="camera-controls">
              <q-btn
                round
                color="negative"
                icon="close"
                size="md"
                @click="stopCamera"
              />
              <q-btn
                v-if="hasMultipleCameras"
                round
                color="primary"
                icon="flip_camera_ios"
                size="md"
                @click="switchCamera"
              />
              <q-btn
                v-if="hasTorch"
                round
                :color="torchOn ? 'warning' : 'white'"
                :icon="torchOn ? 'flash_on' : 'flash_off'"
                size="md"
                @click="toggleTorch"
              />
            </div>
          </div>
          <canvas ref="canvasRef" style="display: none"></canvas>
        </q-card-section>
      </q-card>
    </div>

    <!-- Product Section (Show when product found) -->
    <template v-if="!isLoading && (productNotFound || currentProduct)">
      <!-- Loading Indicator -->
      <div v-if="isLoading" class="q-mb-md">
        <q-linear-progress indeterminate color="primary" />
      </div>

      <!-- Product Not Found Alert -->
      <q-banner v-else-if="productNotFound" class="bg-negative text-white q-mb-md">
        <template #avatar>
          <q-icon name="error" />
        </template>
        <div>
          <div class="text-weight-bold">Product not found</div>
          <div class="text-caption">Barcode: {{ lastScannedBarcode }}</div>
          <q-btn
            v-if="canAddProduct"
            flat
            size="sm"
            label="Add New"
            icon="add"
            to="/products/create"
            class="q-mt-sm"
          />
        </div>
      </q-banner>

      <!-- Product Found Card -->
      <q-card v-else-if="currentProduct" class="product-card q-mb-md">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center">
            <div class="col">
              <div class="text-h6">{{ currentProduct.name }}</div>
              <div class="text-caption">{{ currentProduct.sku }}</div>
            </div>
            <div class="col-auto">
              <q-chip color="white" text-color="primary" dense>
                {{ currentProduct.barcode }}
              </q-chip>
            </div>
          </div>
        </q-card-section>

        <!-- Low Stock / Out of Stock Banner -->
        <q-banner
          v-if="isOutOfStock"
          class="bg-negative text-white text-center q-pa-md"
          dense
        >
          <q-icon name="warning" size="md" class="q-mr-sm" />
          <strong>Out of stock</strong> - stock in required
        </q-banner>
        <q-banner
          v-else-if="isLowStock"
          class="bg-warning text-white text-center q-pa-md"
          dense
        >
          <q-icon name="error" size="md" class="q-mr-sm" />
          <strong>Low stock alert</strong> - Stock: {{ getProductQuantity(currentProduct) }}, Threshold: {{ currentProduct.low_stock_threshold || 0 }}
        </q-banner>

        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-6 col-md-3">
              <div class="stat-box" :class="{ 'low-stock': isLowStock, 'out-of-stock': isOutOfStock }">
                <div class="stat-label">Stock</div>
                <div class="stat-value">{{ getProductQuantity(currentProduct) }}</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-box">
                <div class="stat-label">Alert</div>
                <div class="stat-value">{{ currentProduct.low_stock_threshold || 0 }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Action Buttons -->
        <q-card-section>
          <div class="row q-col-gutter-sm">
            <template v-if="canStockIn">
              <div class="col-6">
                <q-btn
                  outline
                  color="positive"
                  icon="add_circle"
                  label="In"
                  class="full-width"
                  @click="showStockInForm = !showStockInForm"
                />
              </div>
            </template>
            <template v-if="canStockOut">
              <div class="col-6">
                <q-btn
                  outline
                  color="negative"
                  icon="remove_circle"
                  label="Out"
                  class="full-width"
                  @click="showStockOutForm = !showStockOutForm"
                />
              </div>
            </template>
          </div>
        </q-card-section>

        <!-- Stock In Form (Collapsed) -->
        <q-expansion-item
          v-if="canStockIn"
          v-model="showStockInForm"
          header-class="bg-positive text-white"
          label="Stock In"
          icon="add_box"
        >
          <q-card>
            <q-card-section class="q-gutter-md">
              <q-input
                v-model.number="quantity"
                type="number"
                min="1"
                label="Quantity"
                outlined
                dense
              />
              <q-input
                v-model="notes"
                label="Notes"
                outlined
                dense
                type="textarea"
              />
              <q-btn
                color="positive"
                label="Confirm In"
                icon="check"
                class="full-width"
                :loading="isSubmitting"
                @click="submitStockIn"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <!-- Stock Out Form (Collapsed) -->
        <q-expansion-item
          v-if="canStockOut"
          v-model="showStockOutForm"
          header-class="bg-negative text-white"
          label="Stock Out"
          icon="remove_box"
        >
          <q-card>
            <q-card-section class="q-gutter-md">
              <q-input
                v-model.number="quantity"
                type="number"
                min="1"
                :max="getProductQuantity(currentProduct)"
                label="Quantity"
                outlined
                dense
              />
              <q-input
                v-model="notes"
                label="Notes"
                outlined
                dense
                type="textarea"
              />
              <q-linear-progress
                :value="Math.min(quantity, getProductQuantity(currentProduct)) / Math.max(getProductQuantity(currentProduct), 1)"
                size="8px"
                class="q-mb-md"
              />
              <q-btn
                color="negative"
                label="Confirm Out"
                icon="check"
                class="full-width"
                :loading="isSubmitting"
                :disable="quantity <= 0 || quantity > getProductQuantity(currentProduct)"
                @click="submitStockOut"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-card>
    </template>

      </div>
    </div>

    <!-- History Panel -->
    <q-dialog
      v-model="historyDrawer"
      position="right"
    >
      <q-card class="history-panel">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="text-h6">Lich su quet ({{ scanHistory.length }})</div>
          <q-btn flat round dense icon="close" @click="historyDrawer = false" />
        </q-card-section>
        <q-separator />
        <q-scroll-area class="history-scroll">
        <div class="q-pa-md">
          
          <div v-if="scanHistory.length === 0" class="text-center text-grey-6">
            No scans yet
          </div>

          <q-timeline
            v-else
            color="primary"
            layout="dense"
            :entries="scanHistory.map((scan, i) => ({
              title: scan.productName || 'Not found',
              subtitle: scan.time,
              avatar: scan.success ? 'check_circle' : 'error',
              color: scan.success ? 'positive' : 'negative',
              key: i
            }))"
          >
            <template #default="scope">
              <div class="text-caption">
                <div>{{ scope.entry.title }}</div>
                <div>{{ scope.entry.subtitle }}</div>
              </div>
            </template>
          </q-timeline>
        </div>
      </q-scroll-area>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { productApi, stockInApi, stockOutApi, stockMovementApi } from '@/services/api'
import { useHIDScanner } from '@/composables/useHIDScanner'
import { useCameraScanner } from '@/composables/useCameraScanner'
import { useScannedBarcode } from '@/composables/useScannedBarcode'
import { BrowserMultiFormatReader } from '@zxing/library'

const $q = useQuasar()
const auth = useAuthStore()

// Permissions
const canStockIn = computed(() => auth.hasAbility('stock-in'))
const canStockOut = computed(() => auth.hasAbility('stock-out'))
const canAddProduct = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin' || role === 'manager'
})

// UI State
const cameraVisible = ref(false)
const historyDrawer = ref(false)
const showStockInForm = ref(false)
const showStockOutForm = ref(false)

// HID Scanner
const { lastScan: hidLastScan, onScan: onHIDScan } = useHIDScanner()
const hidActive = computed(() => !!hidLastScan.value)

// Camera Scanner (lazy setup)
const {
  isScanning: cameraActive,
  videoElement: videoRef,
  startCamera: startCam,
  stopCamera: stopCam,
} = useCameraScanner()
const { saveBarcode, getBarcode } = useScannedBarcode()
const canvasRef = ref(null)
const codeReader = ref(null)
const hasTorch = ref(false)
const torchOn = ref(false)
const hasMultipleCameras = ref(false)
const currentCameraIndex = ref(0)
const availableCameras = ref([])
const isScanningCamera = ref(false)

// Scanner state
const lastScannedBarcode = ref('')
const manualBarcode = ref('')
const scannerStatusColor = computed(() => {
  if (cameraActive.value) return 'positive'
  if (hidActive.value) return 'blue'
  return 'grey'
})
const scannerStatusText = computed(() => {
  if (cameraActive.value) return 'Camera scanning'
  if (hidActive.value) return 'HID ready'
  return 'Waiting for scan'
})

// Product lookup
const currentProduct = ref(null)
const productNotFound = ref(false)
const isLoading = ref(false)
const quantity = ref(1)
const notes = ref('')
const isSubmitting = ref(false)

// History
const scanHistory = ref([])
const MAX_HISTORY = 10

// Stock movement logs (DB)
const movementLogs = ref([])
const isLogLoading = ref(false)
const logSearch = ref('')

const currentUserId = computed(() => {
  if (auth && auth.user && auth.user.id) return auth.user.id
  return null
})

const filteredMovementLogs = computed(() => {
  const all = movementLogs.value || []
  const userId = currentUserId.value

  const onlyMine = userId
    ? all.filter((m) => {
      const idFromRelation = m && m.user && m.user.id ? m.user.id : null
      const idFromField = m && m.user_id ? m.user_id : null
      return idFromRelation === userId || idFromField === userId
    })
    : all

  // Search is handled by the API (fetchMovementLogs). This is only a safe display layer.
  return onlyMine
})

const logColumns = [
  { name: 'status', label: 'Status', field: 'type', align: 'center' },
  { name: 'product_name', label: 'Product Name', field: 'product_name', align: 'left' },
  { name: 'quantity', label: 'Quantity', field: 'quantity', align: 'right' },
  { name: 'user', label: 'Performed By', field: 'user', align: 'left' },
]

const getMovementProductName = (movement) => {
  if (movement && movement.product && movement.product.name) return movement.product.name
  return ''
}

const getMovementUserLabel = (movement) => {
  if (movement && movement.user) {
    const name = movement.user.name || ''
    const id = movement.user.id || ''
    if (name && id) return `${name} (#${id})`
    if (name) return name
    if (id) return String(id)
  }
  if (movement && movement.user_id) return String(movement.user_id)
  return 'System'
}

const formatLogTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

const buildLogSearchParams = (raw) => {
  const keyword = String(raw || '').trim().toLowerCase()
  if (!keyword) return { search: '', type: '' }

 
  if (keyword.startsWith('in:')) {
    const search = keyword.slice(3).trim()
    return { type: 'in', search }
  }
  if (keyword.startsWith('out:')) {
    const search = keyword.slice(4).trim()
    return { type: 'out', search }
  }

  const inTokens = new Set(['in'])
  const outTokens = new Set(['out'])
  if (inTokens.has(keyword)) return { type: 'in', search: '' }
  if (outTokens.has(keyword)) return { type: 'out', search: '' }

  return { search: keyword, type: '' }
}

const fetchMovementLogs = async (overrides = {}) => {
  isLogLoading.value = true
  try {
    const params = { per_page: 20, page: 1, ...overrides }
    if (currentUserId.value) params.user_id = currentUserId.value

    if (!params.search) delete params.search
    if (!params.type) delete params.type

    const res = await stockMovementApi.getLogs(params)
    movementLogs.value = (res && res.data && res.data.data) ? res.data.data : []
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Error loading logs',
      position: 'top',
    })
  } finally {
    isLogLoading.value = false
  }
}

let logSearchTimer = null
watch(logSearch, (val) => {
  if (logSearchTimer) clearTimeout(logSearchTimer)
  logSearchTimer = setTimeout(() => {
    const { search, type } = buildLogSearchParams(val)
    fetchMovementLogs({ search, type, page: 1 })
  }, 350)
})

// Keep latest scan actions for the history drawer
const addHistoryEntry = (entry) => {
  scanHistory.value.unshift({
    time: new Date().toLocaleTimeString(),
    ...entry,
  })

  if (scanHistory.value.length > MAX_HISTORY) {
    scanHistory.value.pop()
  }
}

/**
 * Get current quantity from product
 */
const getProductQuantity = (product) => {
  if (!product) return 0
  return product.inventory?.quantity ?? product.current_quantity ?? product.quantity ?? 0
}

/**
 * Check if product has low stock
 */
const isLowStock = computed(() => {
  if (!currentProduct.value) return false
  const qty = getProductQuantity(currentProduct.value)
  const threshold = currentProduct.value.low_stock_threshold || 0
  return qty <= threshold && qty > 0
})

/**
 * Check if product is out of stock
 */
const isOutOfStock = computed(() => {
  if (!currentProduct.value) return false
  return getProductQuantity(currentProduct.value) === 0
})

/**
 * Lookup product by barcode
 */
const lookupProduct = async (barcode) => {
  if (!barcode || barcode.length < 3) return

  saveBarcode(barcode)
  lastScannedBarcode.value = barcode
  isLoading.value = true
  productNotFound.value = false
  currentProduct.value = null
  quantity.value = 1
  notes.value = ''
  showStockInForm.value = false
  showStockOutForm.value = false

  try {
    const response = await productApi.getByBarcode(barcode)
    if (response.data && response.data.data) {
      const product = response.data.data
      // Ensure we have a current_quantity field for easier display
      if (!product.current_quantity) {
        product.current_quantity = getProductQuantity(product)
      }
      currentProduct.value = product
      productNotFound.value = false

      addHistoryEntry({
        barcode,
        productName: product.name,
        action: 'Lookup',
        quantity: getProductQuantity(product),
        success: true,
      })
    } else {
      productNotFound.value = true
      addHistoryEntry({
        barcode,
        productName: 'Not found',
        action: 'Lookup',
        quantity: 0,
        success: false,
      })
      $q.notify({
        type: 'warning',
        message: 'Product not found',
      })
    }
  } catch (error) {
    console.error('Product lookup error:', error)
    productNotFound.value = true
    addHistoryEntry({
      barcode,
      productName: 'Lookup error',
      action: 'Lookup',
      quantity: 0,
      success: false,
    })
    $q.notify({
      type: 'negative',
      message: 'Product lookup error: ' + (error.response?.data?.message || error.message),
    })
  } finally {
    isLoading.value = false
  }
}

/**
 * Toggle camera visibility and start/stop
 */
const toggleCamera = async () => {
  if (cameraVisible.value) {
    stopCamera()
  } else {
    await startCamera()
  }
}

/**
 * Start camera scanning
 */
const startCamera = async () => {
  try {
    cameraVisible.value = true
    await nextTick()

    if (!videoRef.value) {
      throw new Error('Camera element not found')
    }

    const md = navigator?.mediaDevices
    if (!md?.getUserMedia) {
      throw new Error('This browser does not support camera access (HTTPS or localhost is required)')
    }

    // Stop any existing stream without hiding the camera UI
    try {
      if (codeReader.value) codeReader.value.reset()
    } catch (e) {}
    try {
      if (videoRef.value?.srcObject?.getTracks) {
        videoRef.value.srcObject.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
      }
      if (videoRef.value) videoRef.value.srcObject = null
    } catch (e) {}

    // Build constraints to strongly prefer the rear camera and request HD.
    // Chrome Android tends to look blurry when the stream falls back to 640x480.
    const buildConstraints = (preset, deviceId = null) => {
      const wantsExact = String(preset).startsWith('exact')
      const base = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: wantsExact ? { exact: 'environment' } : { ideal: 'environment' } }

      const is1080 = String(preset).includes('1080')
      const size = is1080
        ? { width: wantsExact ? { exact: 1920 } : { ideal: 1920 }, height: wantsExact ? { exact: 1080 } : { ideal: 1080 } }
        : { width: wantsExact ? { exact: 1280 } : { ideal: 1280 }, height: wantsExact ? { exact: 720 } : { ideal: 720 } }

      return {
        audio: false,
        video: {
          ...base,
          ...size,
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30 },
          // Hint: avoid browser resizing down aggressively (ignored if unsupported)
          resizeMode: 'none',
        },
      }
    }

    const openRearStream = async () => {
      // Prefer an already selected camera deviceId if we have one
      const selectedDeviceId = availableCameras.value?.[currentCameraIndex.value]?.deviceId
      const attempts = []
      if (selectedDeviceId) {
        attempts.push(buildConstraints('exact1080', selectedDeviceId))
        attempts.push(buildConstraints('exact720', selectedDeviceId))
        attempts.push(buildConstraints('ideal1080', selectedDeviceId))
        attempts.push(buildConstraints('ideal720', selectedDeviceId))
      }
      // Prefer exact environment first (avoids front camera on many devices)
      attempts.push(buildConstraints('exact1080', null))
      attempts.push(buildConstraints('exact720', null))
      // Then allow ideal environment
      attempts.push(buildConstraints('ideal1080', null))
      attempts.push(buildConstraints('ideal720', null))

      let lastErr = null
      for (const c of attempts) {
        try {
          return await md.getUserMedia(c)
        } catch (e) {
          lastErr = e
        }
      }
      throw lastErr
    }

    // Step 1: request permission + open rear camera stream in one go.
    const stream = await openRearStream()

    videoRef.value.srcObject = stream
    try { await videoRef.value.play() } catch (e) {}

    // Step 2: enumerate cameras after permission and prefer a "back" one by label when possible.
    let devices = []
    try {
      devices = await md.enumerateDevices()
    } catch (e) {
      devices = []
    }

    availableCameras.value = devices.filter(d => d.kind === 'videoinput')
    hasMultipleCameras.value = availableCameras.value.length > 1

    const findBackCameraIndex = () => {
      if (!availableCameras.value.length) return -1
      const labelRegex = /(back|rear|environment)/i
      const idx = availableCameras.value.findIndex(d => labelRegex.test(d.label || ''))
      return idx
    }

    const backIdx = findBackCameraIndex()
    if (backIdx >= 0) {
      currentCameraIndex.value = backIdx
    } else if (availableCameras.value.length > 1) {
      // Heuristic: on many phones, the last camera is the rear one.
      currentCameraIndex.value = availableCameras.value.length - 1
    }

    // Check for torch capability
    try {
      const track = stream?.getVideoTracks?.()[0]
      const capabilities = track && track.getCapabilities ? track.getCapabilities() : null
      hasTorch.value = capabilities && capabilities.torch

      // Debug: log actual stream resolution on Chrome Android
      try {
        const settings = track && track.getSettings ? track.getSettings() : null
        if (settings && settings.width && settings.height) {
          console.log('[ScannerPage] camera stream', settings.width, 'x', settings.height, 'fps', settings.frameRate)
        }
      } catch (e) {}

      // Best-effort: request continuous focus/exposure/whitebalance for sharper scanning
      if (track && track.applyConstraints) {
        try {
          track.applyConstraints({
            advanced: [
              { focusMode: 'continuous' },
              { exposureMode: 'continuous' },
              { whiteBalanceMode: 'continuous' },
            ]
          })
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // Torch not supported
    }

    // Start decoding
    if (!codeReader.value) {
      codeReader.value = new BrowserMultiFormatReader()
    }

    isScanningCamera.value = true
    // Decode from the exact stream we opened (keeps HD + focus constraints).
    Promise
      .resolve(codeReader.value.decodeFromStream(stream, videoRef.value, (result, error) => {
        if (result) {
          const barcode = result.getText()
          lookupProduct(barcode)
          isScanningCamera.value = false
          try { codeReader.value && codeReader.value.reset() } catch (e) {}
        }
      }))
      .catch((err) => {
        console.error('Camera decode error:', err)
      })
  } catch (error) {
    cameraVisible.value = false
    $q.notify({
      type: 'negative',
      message: error.message || 'Unable to start camera'
    })
  }
}

/**
 * Stop camera
 */
const stopCamera = () => {
  cameraVisible.value = false
  if (codeReader.value) {
    codeReader.value.reset()
  }
  if (videoRef.value && videoRef.value.srcObject) {
    const tracks = videoRef.value.srcObject.getTracks()
    tracks.forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
  isScanningCamera.value = false
}

/**
 * Handle HID scanner input
 */
onMounted(() => {
  const unsubscribe = onHIDScan((barcode) => {
    console.log('HID scan:', barcode)
    lookupProduct(barcode)
  })

  fetchMovementLogs()

  onBeforeUnmount(() => {
    unsubscribe()
  })
})

/**
 * Handle manual barcode entry
 */
const handleManualEntry = () => {
  if (manualBarcode.value) {
    lookupProduct(manualBarcode.value)
    manualBarcode.value = ''
  }
}

/**
 * Switch between cameras
 */
const switchCamera = async () => {
  if (availableCameras.value.length < 2) return
  
  stopCamera()
  currentCameraIndex.value = (currentCameraIndex.value + 1) % availableCameras.value.length
  
  try {
    await startCamera()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Unable to switch camera: ' + error.message,
    })
  }
}

/**
 * Toggle camera torch/flash
 */
const toggleTorch = async () => {
  try {
    const stream = videoRef.value?.srcObject
    if (stream) {
      const track = stream.getVideoTracks()[0]
      await track.applyConstraints({
        advanced: [{ torch: !torchOn.value }]
      })
      torchOn.value = !torchOn.value
    }
  } catch (error) {
    console.error('Torch toggle error:', error)
  }
}

// Fill manual input from last scanned barcode stored in session
const fillFromHistory = () => {
  const stored = getBarcode()
  if (!stored) {
    $q.notify({
      type: 'warning',
      message: 'No barcode in this session'
    })
    return
  }

  manualBarcode.value = stored
  lastScannedBarcode.value = stored
  lookupProduct(stored)

  $q.notify({
    type: 'info',
    message: `Filled the latest barcode: ${stored}`,
    timeout: 1500
  })
}

/**
 * Submit Stock In
 */
const submitStockIn = async () => {
  if (!currentProduct.value || quantity.value <= 0) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a valid quantity',
    })
    return
  }

  // Validate quantity is within reasonable range
  if (quantity.value > 10000) {
    $q.notify({
      type: 'warning',
      message: 'Stock-in quantity is too large (maximum 10,000)',
    })
    return
  }

  isSubmitting.value = true
  try {
    const response = await stockInApi.stockIn({
      barcode: currentProduct.value.barcode,
      quantity: quantity.value,
      notes: notes.value,
    })

    $q.notify({
      type: 'positive',
      message: `Stocked in ${quantity.value} ${currentProduct.value.name}`,
    })

    addHistoryEntry({
      barcode: currentProduct.value.barcode,
      productName: currentProduct.value.name,
      action: 'Stock In',
      quantity: quantity.value,
      success: true,
    })

    // Refetch product to show updated quantity
    await lookupProduct(currentProduct.value.barcode)
    await fetchMovementLogs()
    
    // Reset form
    quantity.value = 1
    notes.value = ''
    showStockInForm.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Stock-in error: ' + (error.response?.data?.message || error.message),
    })
    
    addHistoryEntry({
      barcode: currentProduct.value.barcode,
      productName: currentProduct.value.name,
      action: 'Stock In',
      quantity: quantity.value,
      success: false,
    })
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Submit Stock Out
 */
const submitStockOut = async () => {
  if (!currentProduct.value) {
    $q.notify({
      type: 'warning',
      message: 'Please scan a product',
    })
    return
  }

  if (quantity.value <= 0) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a valid quantity',
    })
    return
  }

  // Get current quantity from loaded product
  const currentQty = currentProduct.value.inventory?.quantity ?? currentProduct.value.current_quantity ?? 0

  // Validate sufficient stock
  if (quantity.value > currentQty) {
    $q.notify({
      type: 'negative',
      message: `Stock-out quantity exceeds available stock (Available: ${currentQty})`,
    })
    return
  }

  // Validate quantity is not zero or negative
  if (currentQty - quantity.value < 0) {
    $q.notify({
      type: 'negative',
      message: 'Not enough stock to stock out',
    })
    return
  }

  // Validate quantity is within reasonable range
  if (quantity.value > 10000) {
    $q.notify({
      type: 'warning',
      message: 'Stock-out quantity is too large (maximum 10,000)',
    })
    return
  }

  isSubmitting.value = true
  try {
    const response = await stockOutApi.stockOut({
      barcode: currentProduct.value.barcode,
      quantity: quantity.value,
      notes: notes.value,
    })

    $q.notify({
      type: 'positive',
      message: `Stocked out ${quantity.value} ${currentProduct.value.name}`,
    })

    addHistoryEntry({
      barcode: currentProduct.value.barcode,
      productName: currentProduct.value.name,
      action: 'Stock Out',
      quantity: quantity.value,
      success: true,
    })

    // Refetch product to show updated quantity
    await lookupProduct(currentProduct.value.barcode)
    await fetchMovementLogs()
    
    // Reset form
    quantity.value = 1
    notes.value = ''
    showStockOutForm.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Stock-out error: ' + (error.response?.data?.message || error.message),
    })
    
    addHistoryEntry({
      barcode: currentProduct.value.barcode,
      productName: currentProduct.value.name,
      action: 'Stock Out',
      quantity: quantity.value,
      success: false,
    })
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Lifecycle
 */
onMounted(() => {
  const unsubscribe = onHIDScan((barcode) => {
    console.log('HID scan:', barcode)
    lookupProduct(barcode)
  })

  onBeforeUnmount(() => {
    unsubscribe()
    stopCamera()
  })
})

</script>

<style scoped>
.scanner-page {
  max-width: 100%;
  margin: 0;
  padding: 1rem 1rem 1rem 0;
}

.log-card {
  position: sticky;
  top: 1rem;
}

.log-scroll {
  height: calc(100vh - 220px);
  min-height: 320px;
}

.log-table :deep(th) {
  white-space: nowrap;
}

.log-table :deep(td) {
  vertical-align: top;
}

.history-panel {
  width: min(420px, 92vw);
  height: 100vh;
}

.history-scroll {
  height: calc(100vh - 58px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.scanner-status-card {
  height: 100%;
}

.camera-section {
  max-width: 800px;
  margin: 0 auto;
}

.camera-wrapper {
  padding: 0;
  position: relative;
  background: #000;
}

.camera-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.camera-preview {
  width: 100%;
  height: auto;
  display: block;
  max-height: 600px;
  object-fit: cover;
}

.scan-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.viewfinder-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.viewfinder-box {
  position: relative;
  width: 280px;
  height: 200px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
}

.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border-color: #42b983;
  border-style: solid;
}

.corner-tl {
  top: -2px;
  left: -2px;
  border-width: 4px 0 0 4px;
  border-top-left-radius: 12px;
}

.corner-tr {
  top: -2px;
  right: -2px;
  border-width: 4px 4px 0 0;
  border-top-right-radius: 12px;
}

.corner-bl {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 4px 4px;
  border-bottom-left-radius: 12px;
}

.corner-br {
  bottom: -2px;
  right: -2px;
  border-width: 0 4px 4px 0;
  border-bottom-right-radius: 12px;
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #42b983, transparent);
  animation: scan-animation 2s ease-in-out infinite;
  box-shadow: 0 0 10px #42b983;
}

@keyframes scan-animation {
  0%, 100% {
    top: 10%;
    opacity: 0;
  }
  50% {
    top: 50%;
    opacity: 1;
  }
}

.scan-instructions {
  padding: 1.5rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  width: 100%;
}

.instruction-text {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  pointer-events: auto;
}

.control-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.scan-status {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  color: #fff;
  font-weight: 500;
  pointer-events: none;
}

.product-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.info-box {
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}

.info-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.info-value {
  font-size: 2rem;
  font-weight: 700;
}

.quantity-input {
  font-size: 1.2rem;
}

.stat-box {
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-box.low-stock {
  background: #fff3cd;
  border: 2px solid #ffc107;
}

.stat-box.out-of-stock {
  background: #f8d7da;
  border: 2px solid #dc3545;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  font-weight: 600;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
}

.stat-box.low-stock .stat-value {
  color: #ff6b00;
}

.stat-box.out-of-stock .stat-value {
  color: #dc3545;
}

@media (max-width: 600px) {
  .viewfinder-box {
    width: 220px;
    height: 160px;
  }
  
  .instruction-text {
    font-size: 0.95rem;
  }
  
  .camera-controls {
    gap: 0.5rem;
  }
  
  .control-btn {
    width: 48px !important;
    height: 48px !important;
  }
}
</style>
