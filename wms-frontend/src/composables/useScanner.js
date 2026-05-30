import { ref, onMounted, onUnmounted } from 'vue'
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'

export function useScanner() {
  const isScanning = ref(false)
  const lastScan = ref(null)
  const lastScanTime = ref(0)
  const DEBOUNCE_MS = 1000  // prevent duplicate scans of same value
  const COOL_DOWN_MS = 800  // short cooldown after any accepted scan
  const coolingUntil = ref(0)
  
  let codeReader = null
  let videoElement = null
  
  // Hardware scanner support (USB/Bluetooth)
  const hardwareScanBuffer = ref('')
  
  const handleKeyPress = (event) => {
    // Hardware scanners simulate keyboard input; accumulate printable chars only
    if (event.key.length === 1) {
      hardwareScanBuffer.value += event.key
    }

    // Clear buffer after 120ms of inactivity (reset timer on each key)
    if (handleKeyPress._clearTimer) clearTimeout(handleKeyPress._clearTimer)
    handleKeyPress._clearTimer = setTimeout(() => {
      hardwareScanBuffer.value = ''
    }, 120)
  }
  
  const processScan = (barcode) => {
    const now = Date.now()
    // If we are cooling down from a previous accepted scan, ignore
    if (now < coolingUntil.value) {
      // console.log('In cooldown, ignoring scan', barcode)
      return null
    }

    // Debounce: ignore repeated identical scans within DEBOUNCE_MS
    if (barcode === lastScan.value && now - lastScanTime.value < DEBOUNCE_MS) {
      // console.log('Duplicate scan ignored:', barcode)
      return null
    }

    lastScan.value = barcode
    lastScanTime.value = now
    // start a short cooldown to avoid accidental duplicates
    coolingUntil.value = now + COOL_DOWN_MS

    return barcode
  }
  
  // Camera scanning
  const startCameraScanning = async (videoElementRef, onScan) => {
    // Accept either a raw HTMLVideoElement or a Vue `ref` pointing to it
    const targetVideo = (videoElementRef && videoElementRef.value) ? videoElementRef.value : videoElementRef
    videoElement = targetVideo

    // prevent double-start
    if (isScanning.value) return

    // cleanup previous reader and any existing media tracks
    if (codeReader) {
      try { codeReader.reset() } catch (e) { /* ignore */ }
      codeReader = null
    }
    const stopVideoElementStream = () => {
      try {
        const stream = videoElement && videoElement.srcObject
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(t => {
            try { t.stop() } catch (e) { /* ignore */ }
          })
        }
        if (videoElement) videoElement.srcObject = null
      } catch (e) {
        /* ignore */
      }
    }

    // configure hints for ZXing
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ])

    codeReader = new BrowserMultiFormatReader(hints)

    try {
      const videoInputDevices = await codeReader.listVideoInputDevices()
      if (videoInputDevices.length === 0) {
        throw new Error('No camera found')
      }

      // prefer rear/environment camera when available
      let selected = videoInputDevices.find(d => /back|rear|environment/i.test(d.label))
      if (!selected) selected = videoInputDevices[videoInputDevices.length - 1]

      isScanning.value = true

      // attempt helper that tries to start decoding and falls back on failure
      const attemptStart = async (deviceId) => {
        // ensure any previously opened stream is stopped
        stopVideoElementStream()

        try {
          // decodeFromVideoDevice may reject with NotReadableError if device is busy
          await codeReader.decodeFromVideoDevice(
            deviceId,
            videoElement,
            (result, error) => {
              if (result) {
                const barcode = processScan(result.getText())
                if (barcode) {
                  onScan(barcode)
                }
              }
            }
          )
          return true
        } catch (err) {
          console.warn('decodeFromVideoDevice failed for device', deviceId, err && err.name)
          throw err
        }
      }

      // Primary attempt: preferred device
      try {
        await attemptStart(selected.deviceId)
        return
      } catch (err) {
        // If device busy / not readable, try other devices quickly
        if (err && (err.name === 'NotReadableError' || /Could not start video source/i.test(String(err)))) {
          const others = videoInputDevices.filter(d => d.deviceId !== selected.deviceId)
          for (const d of others) {
            try {
              await attemptStart(d.deviceId)
              return
            } catch (e) {
              // continue trying other devices
            }
          }

          // final fallback: ask browser to choose default camera (no deviceId)
          try {
            await attemptStart(undefined)
            return
          } catch (finalErr) {
            console.error('All camera start attempts failed')
            throw finalErr
          }
        }

        // other errors: rethrow
        throw err
      }
    } catch (error) {
      // ensure we clear any partial streams on failure
      try { stopVideoElementStream() } catch (e) { /* ignore */ }
      console.error('Camera scanning error:', error)
      throw error
    }
  }
  
  const stopCameraScanning = () => {
    if (codeReader) {
      try { codeReader.reset() } catch (e) { /* ignore */ }
      codeReader = null
    }
    try {
      if (videoElement && videoElement.srcObject && videoElement.srcObject.getTracks) {
        videoElement.srcObject.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
      }
      if (videoElement) videoElement.srcObject = null
    } catch (e) { /* ignore */ }
    isScanning.value = false
  }
  
  // Enable hardware scanner listening
  let hardwareHandler = null
  const enableHardwareScanner = (onScan) => {
    // attach a single keydown listener that accumulates chars until Enter
    hardwareHandler = (event) => {
      if (event.key === 'Enter') {
        const barcode = hardwareScanBuffer.value
        hardwareScanBuffer.value = ''
        const accepted = processScan(barcode)
        if (accepted) onScan(accepted)
      } else {
        handleKeyPress(event)
      }
    }

    window.addEventListener('keydown', hardwareHandler)

    return () => {
      if (hardwareHandler) {
        window.removeEventListener('keydown', hardwareHandler)
        hardwareHandler = null
      }
      if (handleKeyPress._clearTimer) {
        clearTimeout(handleKeyPress._clearTimer)
        handleKeyPress._clearTimer = null
      }
    }
  }
  
  onUnmounted(() => {
    stopCameraScanning()
  })
  
  return {
    isScanning,
    startCameraScanning,
    stopCameraScanning,
    enableHardwareScanner,
    processScan
  }
}