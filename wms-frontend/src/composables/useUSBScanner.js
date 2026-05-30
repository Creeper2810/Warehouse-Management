/**
 * Composable for connecting USB barcode scanners.
 * Uses the Web USB API.
 */
import { ref, computed } from 'vue'

export function useUSBScanner() {
  const isSupported = computed(() => 'usb' in navigator)
  const isConnected = ref(false)
  const device = ref(null)
  const error = ref(null)

  const requestDevice = async () => {
    if (!isSupported.value) {
      error.value = 'Web USB API is not supported in this browser'
      return null
    }

    try {
      const usbDevices = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0951 }, // Kingston (common USB device)
          { classCode: 3 }, // Human Interface Device (HID)
        ],
      })

      if (usbDevices) {
        device.value = usbDevices
        await connectDevice()
        return device.value
      }
    } catch (err) {
      error.value = err.message || 'Unable to connect to the USB device'
      console.error('USB Request Error:', err)
    }
    return null
  }

  const connectDevice = async () => {
    try {
      if (!device.value) return

      await device.value.open()
      isConnected.value = true
      error.value = null
      console.log('USB Device connected:', device.value)

      // Start listening for data from USB.
      startListening()
    } catch (err) {
      error.value = 'Unable to open the USB device: ' + err.message
      console.error('USB Connect Error:', err)
    }
  }

  const startListening = async () => {
    if (!device.value || !isConnected.value) return

    try {
      while (isConnected.value && device.value) {
        // Read data from the USB device (polling).
        const data = await device.value.transferIn(1, 64)
        if (data.data && data.data.byteLength > 0) {
          const buffer = data.data.buffer
          const view = new Uint8Array(buffer)
          const barcodeData = new TextDecoder().decode(view)
          console.log('USB Barcode:', barcodeData)

          // Emit data.
          window.dispatchEvent(
            new CustomEvent('usbBarcodeScan', { detail: barcodeData.trim() })
          )
        }
      }
    } catch (err) {
      if (isConnected.value) {
        error.value = 'Error reading from USB: ' + err.message
        console.error('USB Read Error:', err)
      }
    }
  }

  const disconnect = async () => {
    try {
      if (device.value) {
        await device.value.close()
      }
      isConnected.value = false
      device.value = null
      error.value = null
    } catch (err) {
      error.value = 'Unable to disconnect USB: ' + err.message
      console.error('USB Disconnect Error:', err)
    }
  }

  return {
    isSupported,
    isConnected,
    device,
    error,
    requestDevice,
    connectDevice,
    disconnect,
  }
}
