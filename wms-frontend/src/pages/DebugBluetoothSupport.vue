<template>
  <div class="q-pa-md">
    <h1>🔍 Debug: Web Bluetooth Support</h1>
    
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Browser Information</div>
        <q-list bordered separator>
          <q-item>
            <q-item-section>
              <q-item-label>User Agent</q-item-label>
              <q-item-label caption>{{ userAgent }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>Platform</q-item-label>
              <q-item-label caption>{{ platform }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>Current URL</q-item-label>
              <q-item-label caption>{{ currentURL }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Web APIs Support</div>
        <q-list bordered separator>
          <q-item>
            <q-item-section>
              <q-item-label>navigator.bluetooth</q-item-label>
              <q-item-section side top>
                <q-badge
                  :color="hasBluetoothAPI ? 'positive' : 'negative'"
                  :label="hasBluetoothAPI ? '✓ Supported' : '✗ Not Supported'"
                />
              </q-item-section>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>navigator.usb</q-item-label>
              <q-item-section side top>
                <q-badge
                  :color="hasUSBAPI ? 'positive' : 'negative'"
                  :label="hasUSBAPI ? '✓ Supported' : '✗ Not Supported'"
                />
              </q-item-section>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>navigator.mediaDevices</q-item-label>
              <q-item-section side top>
                <q-badge
                  :color="hasMediaAPI ? 'positive' : 'negative'"
                  :label="hasMediaAPI ? '✓ Supported' : '✗ Not Supported'"
                />
              </q-item-section>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>navigator.permissions</q-item-label>
              <q-item-section side top>
                <q-badge
                  :color="hasPermissionsAPI ? 'positive' : 'negative'"
                  :label="hasPermissionsAPI ? '✓ Supported' : '✗ Not Supported'"
                />
              </q-item-section>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card v-if="hasBluetoothAPI" class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Bluetooth Permissions</div>
        <q-btn
          color="primary"
          label="Check Bluetooth Permissions"
          @click="checkBluetoothPermissions"
          :loading="checkingPermissions"
          class="q-mb-md"
        />
        <div v-if="bluetoothPermissions" class="bg-grey-2 q-pa-md rounded">
          <pre>{{ bluetoothPermissions }}</pre>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Solutions</div>
        <q-list>
          <q-item v-if="!hasBluetoothAPI" class="bg-red-1">
            <q-item-section>
              <q-item-label>❌ Web Bluetooth not available</q-item-label>
              <q-item-label caption lines="2">
                <strong>Solutions:</strong>
                <ul class="q-pl-md q-my-sm">
                  <li>Use Chrome, Edge, or Firefox</li>
                  <li>Make sure you're on HTTPS or localhost</li>
                  <li>Try USB or Camera Scanner instead</li>
                  <li>Check if Bluetooth is enabled on your device</li>
                </ul>
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-else class="bg-green-1">
            <q-item-section>
              <q-item-label>✓ Web Bluetooth is available</q-item-label>
              <q-item-label caption>
                You can use Bluetooth scanner. Go to Device Connection page.
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card>
      <q-card-section>
        <q-btn
          color="primary"
          label="← Back to Device Connection"
          icon="arrow_back"
          to="/device-connection"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const userAgent = ref('')
const platform = ref('')
const currentURL = ref('')
const hasBluetoothAPI = ref(false)
const hasUSBAPI = ref(false)
const hasMediaAPI = ref(false)
const hasPermissionsAPI = ref(false)
const bluetoothPermissions = ref('')
const checkingPermissions = ref(false)

onMounted(() => {
  userAgent.value = navigator.userAgent
  platform.value = navigator.platform || navigator.userAgentData?.platform || 'Unknown'
  currentURL.value = window.location.href

  // Check APIs
  hasBluetoothAPI.value = !!navigator.bluetooth
  hasUSBAPI.value = 'usb' in navigator
  hasMediaAPI.value = !!navigator.mediaDevices
  hasPermissionsAPI.value = !!navigator.permissions

  console.log('navigator.bluetooth:', navigator.bluetooth)
  console.log('navigator.usb:', navigator.usb)
  console.log('navigator.mediaDevices:', navigator.mediaDevices)
  console.log('navigator.permissions:', navigator.permissions)
})

const checkBluetoothPermissions = async () => {
  if (!hasPermissionsAPI.value) {
    bluetoothPermissions.value = 'Permissions API not supported'
    return
  }

  checkingPermissions.value = true
  try {
    const result = await navigator.permissions.query({ name: 'bluetooth' })
    bluetoothPermissions.value = JSON.stringify(result, null, 2)
  } catch (error) {
    bluetoothPermissions.value = `Error: ${error.message}`
  } finally {
    checkingPermissions.value = false
  }
}
</script>

<style scoped>
pre {
  background: #fff;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  overflow-x: auto;
}

ul {
  margin: 0.5rem 0;
}
</style>
