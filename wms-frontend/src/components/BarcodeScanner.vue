<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useScanner } from '@/composables/useScanner'
import { useQuasar } from 'quasar'

const props = defineProps({
  mode: {
    type: String,
    default: 'camera', // 'camera' or 'hardware'
  }
  ,
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['scan'])

const $q = useQuasar()
const { startCameraScanning, stopCameraScanning, enableHardwareScanner, isScanning } = useScanner()

const videoRef = ref(null)
const manualBarcode = ref('')

const handleScan = (barcode) => {
  if (props.disabled) return
  $q.notify({ type: 'positive', message: `Scanned: ${barcode}`, timeout: 1000 })
  emit('scan', barcode)
}

let cleanupHardware = null
const startScanning = async () => {
  if (props.mode === 'camera') {
    try {
      // wrap handleScan to respect disabled state
      const wrapper = (barcode) => { if (!props.disabled) handleScan(barcode) }
      await startCameraScanning(videoRef.value, wrapper)
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Camera access denied or not available' })
    }
  } else {
    // enable hardware and keep cleanup function
    cleanupHardware = enableHardwareScanner(handleScan)
  }
}

const submitManual = () => {
  if (manualBarcode.value.trim()) {
    handleScan(manualBarcode.value.trim())
    manualBarcode.value = ''
  }
}

onMounted(() => {
  if (props.mode === 'hardware') {
    startScanning()
  }
})

onUnmounted(() => {
  if (cleanupHardware) cleanupHardware()
})
</script>

<template>
  <div class="scanner-container">
    <div v-if="mode === 'camera'" class="camera-view">
      <video ref="videoRef" class="scanner-video" />
      <q-btn 
        v-if="!isScanning"
        @click="startScanning"
        color="primary"
        label="Start Camera"
        icon="camera_alt"
        size="lg"
      />
      <q-btn
        v-else
        @click="stopCameraScanning"
        color="negative"
        label="Stop Camera"
        icon="stop"
        size="lg"
      />
    </div>
    
    <div v-else class="hardware-mode">
      <q-icon name="qr_code_scanner" size="64px" color="primary" />
      <p class="text-h6">Ready for hardware scanner</p>
      <p class="text-caption">Scan barcode with your device</p>
    </div>
    
    <!-- Manual input fallback -->
    <div class="manual-input">
      <q-input
        v-model="manualBarcode"
        label="Or enter barcode manually"
        outlined
        @keyup.enter="submitManual"
      >
        <template v-slot:append>
          <q-btn 
            flat 
            icon="send" 
            @click="submitManual"
            :disable="!manualBarcode.trim()"
          />
        </template>
      </q-input>
    </div>
  </div>
</template>

<style scoped>
.scanner-container {
  padding: 20px;
}

.camera-view {
  position: relative;
  text-align: center;
}

.scanner-video {
  width: 100%;
  max-width: 640px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.hardware-mode {
  text-align: center;
  padding: 40px 20px;
}

.manual-input {
  margin-top: 24px;
}
</style>