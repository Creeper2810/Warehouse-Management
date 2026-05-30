import { ref, onMounted, onUnmounted } from 'vue'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

/**
 * Composable for listening to WebSocket broadcast events from Laravel
 * Used for admin disconnect commands and real-time device status updates
 * 
 * Configuration:
 * - Use Laravel Reverb (recommended) or Pusher
 * - BROADCAST_DRIVER=reverb for development
 * - BROADCAST_DRIVER=pusher for production
 */
export function useDeviceBroadcast() {
  const echo = ref(null)
  const isConnected = ref(false)
  const connectionError = ref('')

  /**
   * Initialize WebSocket connection based on VITE config
   */
  const initializeEcho = () => {
    try {
      // Initialize Laravel Echo
      window.Pusher = Pusher

      echo.value = new Echo({
        broadcaster: import.meta.env.VITE_BROADCAST_DRIVER || 'reverb',
        key: import.meta.env.VITE_PUSHER_APP_KEY || '',
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || '',
        wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
        wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
        wssPort: import.meta.env.VITE_REVERB_PORT || 443,
        forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https' || false,
        enabledTransports: ['ws', 'wss'],
      })

      isConnected.value = true
      console.log('WebSocket connected via', import.meta.env.VITE_BROADCAST_DRIVER)
    } catch (error) {
      connectionError.value = `Failed to initialize Echo: ${error.message}`
      console.error('Echo initialization failed:', error)
      isConnected.value = false
    }
  }

  /**
   * Listen for device blocked events
   * Admin can trigger disconnection for specific devices
   * 
   * @param {number} deviceId - Device ID to listen for
   * @param {function} callback - Called when device is blocked
   */
  const onDeviceBlocked = (deviceId, callback) => {
    if (!echo.value) {
      console.warn('Echo not initialized')
      return null
    }

    const unsubscribe = echo.value
      .private(`device.${deviceId}`)
      .listen('DeviceBlockedEvent', (event) => {
        console.log('Device blocked event received:', event)
        callback(event)
      })

    return unsubscribe
  }

  /**
   * Listen for device status changes
   * Real-time updates when admin toggles device status
   * 
   * @param {number} deviceId - Device ID to listen for
   * @param {function} callback - Called when status changes
   */
  const onDeviceStatusChanged = (deviceId, callback) => {
    if (!echo.value) {
      console.warn('Echo not initialized')
      return null
    }

    const unsubscribe = echo.value
      .private(`device.${deviceId}`)
      .listen('DeviceStatusChangedEvent', (event) => {
        console.log('Device status changed:', event)
        callback(event)
      })

    return unsubscribe
  }

  /**
   * Listen for disconnect requests from admin
   * Admin can send signal to immediately disconnect device
   * 
   * @param {number} deviceId - Device ID to listen for
   * @param {function} callback - Called when disconnect is requested
   */
  const onDisconnectRequested = (deviceId, callback) => {
    if (!echo.value) {
      console.warn('Echo not initialized')
      return null
    }

    const unsubscribe = echo.value
      .private(`device.${deviceId}`)
      .listen('DisconnectRequestedEvent', (event) => {
        console.log('Disconnect requested:', event)
        callback(event)
      })

    return unsubscribe
  }

  /**
   * Listen for all device-related events for a user
   * Admin receives updates about all their devices
   * 
   * @param {number} userId - User ID
   * @param {function} callback - Called on any device event
   */
  const onUserDeviceEvent = (userId, callback) => {
    if (!echo.value) {
      console.warn('Echo not initialized')
      return null
    }

    const unsubscribe = echo.value
      .private(`user.${userId}.devices`)
      .listen('DeviceEventOccurred', (event) => {
        console.log('Device event:', event)
        callback(event)
      })

    return unsubscribe
  }

  /**
   * Disconnect WebSocket
   */
  const disconnect = () => {
    if (echo.value) {
      echo.value.disconnect()
      isConnected.value = false
    }
  }

  // Auto-initialize on composable mount
  onMounted(() => {
    initializeEcho()
  })

  // Auto-disconnect on composable unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    echo,
    isConnected,
    connectionError,
    initializeEcho,
    onDeviceBlocked,
    onDeviceStatusChanged,
    onDisconnectRequested,
    onUserDeviceEvent,
    disconnect,
  }
}
