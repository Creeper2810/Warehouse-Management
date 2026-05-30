/**
 * Composable for scanning barcodes with the camera using ZXing.
 */
import { ref, computed } from 'vue'

export function useCameraScanner() {
  const isSupported = computed(() => 'getUserMedia' in navigator.mediaDevices)
  const isScanning = ref(false)
  const stream = ref(null)
  const videoElement = ref(null)
  const error = ref(null)
  const lastScan = ref(null)
  const lastScanTime = ref(0)
  const DEBOUNCE_MS = 1000

  const startCamera = async (videoEl, deviceId = null) => {
    if (!isSupported.value) {
      error.value = 'Camera is not supported on this device'
      return
    }

    if (!videoEl) {
      throw new Error('Video element not found for attaching the stream')
    }

    try {
      videoElement.value = videoEl
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      })

      videoElement.value.srcObject = stream.value
      isScanning.value = true
      error.value = null
    } catch (err) {
      error.value = 'Unable to access camera: ' + err.message
      console.error('Camera Error:', err)
      throw err
    }
  }

  const stopCamera = () => {
    if (stream.value) {
      stream.value.getTracks().forEach((track) => track.stop())
      stream.value = null
    }
    isScanning.value = false
  }

  const processScan = (barcodeData) => {
    // Debounce duplicate scans
    const now = Date.now()
    if (barcodeData === lastScan.value && now - lastScanTime.value < DEBOUNCE_MS) {
      return null
    }

    lastScan.value = barcodeData
    lastScanTime.value = now

    return barcodeData.trim()
  }

  return {
    isSupported,
    isScanning,
    videoElement,
    error,
    lastScan,
    startCamera,
    stopCamera,
    processScan,
  }
}
