<template>
  <div class="product-form-page q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        @click="$router.back()"
      />
      <div class="text-h5 q-ml-md">
        {{ isEditMode ? 'Edit Product' : 'Add New Product' }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoadingProduct" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- Form -->
    <q-card v-else>
      <q-card-section>
        <q-form @submit="handleSubmit" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <!-- SKU -->
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.sku"
                label="SKU *"
                outlined
                dense
                :rules="[val => !!val || 'SKU is required']"
                :error="!!errors.sku"
                :error-message="errors.sku"
                @update:model-value="errors.sku = ''"
              >
                <template #prepend>
                  <q-icon name="tag" />
                </template>
              </q-input>
            </div>

            <!-- Barcode -->
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.barcode"
                label="Barcode *"
                outlined
                dense
                ref="barcodeInputRef"
                :rules="[val => !!val || 'Barcode is required']"
                :error="!!errors.barcode"
                :error-message="errors.barcode"
                @update:model-value="errors.barcode = ''"
              >
                <template #prepend>
                  <q-icon name="qr_code" />
                </template>
                <template #append>
                  <q-btn-dropdown
                    flat
                    dense
                    icon="qr_code_scanner"
                    dropdown-icon="arrow_drop_down"
                  >
                    <q-list>
                      <q-item clickable v-close-popup @click="focusHIDScanner">
                        <q-item-section avatar>
                          <q-icon name="keyboard" color="primary" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>HID Scanner (USB)</q-item-label>
                          <q-item-label caption>Scan directly with a handheld scanner</q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item clickable v-close-popup @click="startCameraScanner">
                        <q-item-section avatar>
                          <q-icon name="photo_camera" color="positive" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Camera Scanner</q-item-label>
                          <q-item-label caption>Use the camera to scan a code</q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item clickable v-close-popup @click="focusManualInput">
                        <q-item-section avatar>
                          <q-icon name="edit" color="orange" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Manual Entry</q-item-label>
                          <q-item-label caption>Type the barcode with the keyboard</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-btn-dropdown>
                </template>
              </q-input>
              
              <!-- HID Scanner Status -->
              <div v-if="hidScannerActive" class="text-caption text-positive q-mt-xs">
                <q-icon name="sensors" size="xs" /> HID Scanner is active - Ready to scan
              </div>
            </div>

            <!-- Product Name -->
            <div class="col-12">
              <q-input
                v-model="form.name"
                label="Product Name *"
                outlined
                dense
                :rules="[val => !!val || 'Product name is required']"
                :error="!!errors.name"
                :error-message="errors.name"
                @update:model-value="errors.name = ''"
              >
                <template #prepend>
                  <q-icon name="inventory_2" />
                </template>
              </q-input>
            </div>

            <!-- Supplier -->
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.supplier_ids"
                :options="suppliers"
                option-label="name"
                option-value="id"
                multiple
                emit-value
                map-options
                clearable
                label="Supplier"
                outlined
                dense
                :loading="isLoadingSuppliers"
                :error="!!supplierError"
                :error-message="supplierError"
                @update:model-value="clearSupplierErrors"
              >
                <template #prepend>
                  <q-icon name="local_shipping" />
                </template>
              </q-select>
            </div>

            <!-- Unit -->
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.unit"
                label="Unit"
                outlined
                dense
                placeholder="Example: Piece, Box, Carton..."
              >
                <template #prepend>
                  <q-icon name="straighten" />
                </template>
              </q-input>
            </div>

            <!-- Low Stock Threshold -->
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.low_stock_threshold"
                label="Low Stock Alert Threshold"
                outlined
                dense
                type="number"
                min="0"
              >
                <template #prepend>
                  <q-icon name="warning" />
                </template>
              </q-input>
            </div>

            <!-- Purchase Price -->
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.purchase_price"
                label="Purchase Price (VND)"
                outlined
                dense
                type="number"
                min="0"
                step="1000"
              >
                <template #prepend>
                  <q-icon name="shopping_cart" />
                </template>
                <template #append>
                  <span class="text-grey-6">{{ formatPrice(form.purchase_price) }}</span>
                </template>
              </q-input>
            </div>

            <!-- Sale Price -->
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.sale_price"
                label="Sale Price (VND)"
                outlined
                dense
                type="number"
                min="0"
                step="1000"
              >
                <template #prepend>
                  <q-icon name="sell" />
                </template>
                <template #append>
                  <span class="text-grey-6">{{ formatPrice(form.sale_price) }}</span>
                </template>
              </q-input>
            </div>
          </div>

          <!-- Actions -->
          <div class="row q-gutter-sm justify-end q-mt-md">
            <q-btn
              flat
              label="Cancel"
              color="grey"
              @click="$router.back()"
            />
            <q-btn
              type="submit"
              :label="isEditMode ? 'Update' : 'Create'"
              color="primary"
              :loading="isSaving"
              :disable="isSaving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <!-- Barcode Scanner Dialog -->
    <q-dialog v-model="scannerDialog" full-width @show="onScannerShow" @hide="onScannerHide">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Scan Barcode</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div class="scanner-container">
            <video ref="videoElement" class="scanner-video" autoplay playsinline webkit-playsinline muted></video>

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
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { productApi, supplierApi } from '@/services/api'
import { useHIDScanner } from '@/composables/useHIDScanner'
import { useScannedBarcode } from '@/composables/useScannedBarcode'
import { BrowserMultiFormatReader } from '@zxing/library'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { getAndClearBarcode } = useScannedBarcode()

// Check permissions
const canManageProducts = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin' || role === 'manager'
})

// Redirect if no permission
onMounted(() => {
  if (!canManageProducts.value) {
    $q.notify({
      type: 'negative',
      message: 'You do not have permission to access this feature'
    })
    router.push('/products')
  }
})

// Mode detection
const isEditMode = computed(() => !!route.params.id)
const productId = computed(() => route.params.id)

// State
const isLoadingProduct = ref(false)
const isSaving = ref(false)
const errors = ref({})

const suppliers = ref([])
const isLoadingSuppliers = ref(false)

// Form data
const form = ref({
  sku: '',
  barcode: '',
  name: '',
  supplier_ids: [],
  unit: 'pcs',
  purchase_price: 0,
  sale_price: 0,
  low_stock_threshold: 10
})

const supplierError = computed(() => {
  return (
    errors.value?.supplier_ids ||
    errors.value?.['supplier_ids.0'] ||
    ''
  )
})

const clearSupplierErrors = () => {
  if (!errors.value) return
  errors.value.supplier_ids = ''
  errors.value['supplier_ids.0'] = ''
}

// Scanner
const scannerDialog = ref(false)
const videoElement = ref(null)
const barcodeInputRef = ref(null)
const hidScannerActive = ref(false)
let codeReader = null

// HID Scanner setup
const { onScan: onHIDScan } = useHIDScanner()
let hidCleanup = null

// Setup HID Scanner listener
onMounted(() => {
  hidCleanup = onHIDScan((barcode) => {
    if (barcode) {
      form.value.barcode = barcode
      hidScannerActive.value = true
      
      $q.notify({
        type: 'positive',
        message: `Scanned: ${barcode}`,
        icon: 'qr_code',
        timeout: 1500
      })
      
      // Reset active status after 3 seconds
      setTimeout(() => {
        hidScannerActive.value = false
      }, 3000)
    }
  })
})

onBeforeUnmount(() => {
  if (hidCleanup) {
    hidCleanup()
  }
})

// Methods
const focusHIDScanner = () => {
  $q.notify({
    type: 'info',
    message: 'HID Scanner is ready. Please scan a barcode...',
    icon: 'sensors',
    timeout: 2000
  })
  hidScannerActive.value = true
  
  // Keep input focused for HID scanner
  setTimeout(() => {
    if (barcodeInputRef.value) {
      barcodeInputRef.value.focus()
    }
  }, 100)
}

const focusManualInput = () => {
  setTimeout(() => {
    if (barcodeInputRef.value) {
      barcodeInputRef.value.focus()
    }
  }, 100)
}

const startCameraScanner = async () => {
  scannerDialog.value = true
}

const stopVideoStream = () => {
  const video = videoElement.value
  if (!video) return

  const stream = video.srcObject
  if (stream && typeof stream.getTracks === 'function') {
    stream.getTracks().forEach((t) => t.stop())
  }
  video.srcObject = null
}

const onScannerShow = async () => {
  await nextTick()

  try {
    if (!videoElement.value) {
      throw new Error('Unable to initialize camera (video element is not ready)')
    }

    // Camera APIs require a secure context (HTTPS with valid cert) or localhost.
    // Self-signed HTTPS on an IP may still be treated as "Not secure" and be blocked.
    if (!window.isSecureContext) {
      throw new Error('Camera is blocked: page is not in a secure context (valid HTTPS or http://localhost is required)')
    }

    if (!codeReader) {
      codeReader = new BrowserMultiFormatReader()
    }

    const md = navigator?.mediaDevices
    if (!md?.getUserMedia) {
      throw new Error('This browser does not support camera access (HTTPS or localhost is required)')
    }

    // Clean up any previous session
    try { stopScanner() } catch (e) {}
    try { stopVideoStream() } catch (e) {}

    const buildConstraints = (mode) => ({
      audio: false,
      video: {
        facingMode: mode === 'exact'
          ? { exact: 'environment' }
          : { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    })

    let stream = null
    try {
      stream = await md.getUserMedia(buildConstraints('exact'))
    } catch (e) {
      stream = await md.getUserMedia(buildConstraints('ideal'))
    }

    videoElement.value.srcObject = stream
    try { await videoElement.value.play() } catch (e) {}

    Promise
      .resolve(codeReader.decodeFromStream(stream, videoElement.value, (result, error) => {
        if (result) {
          const text = result.getText()
          form.value.barcode = text
          scannerDialog.value = false

          $q.notify({
            type: 'positive',
            message: `Scanned: ${text}`,
            icon: 'photo_camera'
          })
        }
      }))
      .catch((err) => {
        console.error('Camera decode error:', err)
      })
  } catch (error) {
    const msg = error?.message || 'Unable to start camera'
    $q.notify({ type: 'negative', message: msg })
    scannerDialog.value = false
  }
}

const onScannerHide = () => {
  stopScanner()
  stopVideoStream()
}

const stopScanner = () => {
  if (codeReader) {
    codeReader.reset()
  }
}

// Methods
const loadProduct = async () => {
  if (!isEditMode.value) return

  isLoadingProduct.value = true
  try {
    const response = await productApi.getById(productId.value)
    const product = response.data

    form.value = {
      sku: product.sku || '',
      barcode: product.barcode || '',
      name: product.name || '',
      supplier_ids: Array.isArray(product.suppliers)
        ? product.suppliers.map(s => s.id)
        : (product.supplier_ids || []),
      unit: product.unit || 'pcs',
      purchase_price: product.purchase_price || 0,
      sale_price: product.sale_price || 0,
      low_stock_threshold: product.low_stock_threshold || 10
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load product details'
    })
    router.push('/products')
  } finally {
    isLoadingProduct.value = false
  }
}

const loadSuppliers = async () => {
  isLoadingSuppliers.value = true
  try {
    const response = await supplierApi.getAll()
    suppliers.value = response.data || []
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load suppliers'
    })
  } finally {
    isLoadingSuppliers.value = false
  }
}

const handleSubmit = async () => {
  errors.value = {}
  isSaving.value = true

  try {
    if (isEditMode.value) {
      await productApi.update(productId.value, form.value)
      $q.notify({
        type: 'positive',
        message: 'Product updated successfully'
      })
    } else {
      await productApi.create(form.value)
      $q.notify({
        type: 'positive',
        message: 'Product created successfully'
      })
    }

    router.push('/products')
  } catch (error) {
    const message = error.response?.data?.message || 'An error occurred'
    
    // Handle validation errors
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors
    }

    $q.notify({
      type: 'negative',
      message: message
    })
  } finally {
    isSaving.value = false
  }
}

const formatPrice = (value) => {
  if (!value && value !== 0) return ''
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

const prefillBarcodeFromScanner = () => {
  if (isEditMode.value) return

  const scanned = getAndClearBarcode()
  if (scanned) {
    form.value.barcode = scanned

    $q.notify({
      type: 'info',
      message: `Filled barcode from the previous scan: ${scanned}`,
      timeout: 2000
    })

    nextTick(() => {
      if (barcodeInputRef.value) {
        barcodeInputRef.value.focus()
      }
    })
  }
}

// Lifecycle
onMounted(() => {
  prefillBarcodeFromScanner()

  loadSuppliers()

  if (isEditMode.value) {
    loadProduct()
  }
})
</script>

<style scoped>
.scanner-container {
  width: 100%;
  height: 400px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.scanner-video {
  width: 100%;
  height: 100%;
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
  padding: 1rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  width: 100%;
}

.instruction-text {
  color: #fff;
  font-size: 1.05rem;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

@media (max-width: 600px) {
  .viewfinder-box {
    width: 220px;
    height: 160px;
  }

  .instruction-text {
    font-size: 0.95rem;
  }
}
</style>
