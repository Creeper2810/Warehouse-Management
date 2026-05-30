/**
 * Composable for capturing keyboard events from HID barcode scanners.
 * HID scanners work like keyboards: scan a code, send characters, then Enter.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useHIDScanner() {
  const lastScan = ref('')
  const lastScanTime = ref(0)
  const isScanning = ref(false)
  const buffer = ref('')
  const bufferTimeout = ref(null)
  
  // Configuration
  const DEBOUNCE_MS = 1000 // Debounce duplicate scans
  const BUFFER_TIMEOUT_MS = 100 // Time to collect characters before processing
  const MIN_BARCODE_LENGTH = 4 // Minimum barcode length (filter typos)
  
  /**
   * Process barcode when buffer is complete
   */
  const processBuffer = () => {
    const barcode = buffer.value.trim()
    
    // Validate barcode
    if (barcode.length < MIN_BARCODE_LENGTH) {
      buffer.value = ''
      return null
    }
    
    // Debounce duplicate scans
    const now = Date.now()
    if (barcode === lastScan.value && now - lastScanTime.value < DEBOUNCE_MS) {
      buffer.value = ''
      return null
    }
    
    // Update state
    lastScan.value = barcode
    lastScanTime.value = now
    buffer.value = ''
    
    return barcode
  }
  
  /**
   * Handle keyboard input
   */
  const handleKeyDown = (event) => {
    // Ignore if user is typing in an input field
    const target = event.target
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }
    
    // Enter key = end of barcode
    if (event.key === 'Enter') {
      clearTimeout(bufferTimeout.value)
      const barcode = processBuffer()
      
      if (barcode) {
        // Emit custom event
        window.dispatchEvent(
          new CustomEvent('hidBarcodeScan', { detail: barcode })
        )
      }
      return
    }
    
    // Accumulate characters
    if (event.key.length === 1) {
      buffer.value += event.key
      
      // Reset timeout on each keystroke
      clearTimeout(bufferTimeout.value)
      bufferTimeout.value = setTimeout(() => {
        // If no Enter received, process buffer anyway
        const barcode = processBuffer()
        if (barcode) {
          window.dispatchEvent(
            new CustomEvent('hidBarcodeScan', { detail: barcode })
          )
        }
      }, BUFFER_TIMEOUT_MS)
    }
  }
  
  /**
   * Register custom event listener
   */
  const onScan = (callback) => {
    const handler = (event) => callback(event.detail)
    window.addEventListener('hidBarcodeScan', handler)
    return () => window.removeEventListener('hidBarcodeScan', handler)
  }
  
  /**
   * Start listening for keyboard events
   */
  const start = () => {
    window.addEventListener('keydown', handleKeyDown)
    isScanning.value = true
  }
  
  /**
   * Stop listening
   */
  const stop = () => {
    window.removeEventListener('keydown', handleKeyDown)
    clearTimeout(bufferTimeout.value)
    buffer.value = ''
    isScanning.value = false
  }
  
  // Auto start on mount, stop on unmount
  onMounted(() => start())
  onBeforeUnmount(() => stop())
  
  return {
    lastScan,
    isScanning,
    onScan,
    start,
    stop,
  }
}
