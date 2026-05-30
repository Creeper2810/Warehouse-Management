<template>
  <div class="scanner-camera">
    <div class="controls" v-if="showControls">
        <select v-if="videoInputDevices.length" v-model="selectedDeviceId">
          <option v-for="dev in videoInputDevices" :key="dev.deviceId" :value="dev.deviceId">{{ dev.label || 'Camera ' + dev.deviceId }}</option>
        </select>
        <button @click="toggleScanning" class="btn-toggle">{{ scanning ? 'Stop' : 'Start' }}</button>
        <button v-if="enableFullscreen" @click="toggleFullscreen" class="btn-toggle">{{ isFullscreen ? 'Exit' : 'Fullscreen' }}</button>
        <button v-if="torchAvailable" @click="toggleTorch" class="btn-toggle">{{ torchOn ? 'Torch off' : 'Torch' }}</button>
      </div>
    <div class="frame">
      <div :id="containerId" :class="['scanner-container', { fullscreen: isFullscreen }]">
        <video :id="videoId" class="scanner-video" playsinline muted autoplay></video>
        <div class="error-overlay" v-if="errorMsg">
          <div class="error-box">
            <div class="error-title">Camera error</div>
            <div class="error-text">{{ errorMsg }}</div>
            <div class="error-actions">
              <button class="btn-toggle" @click="retry">Retry</button>
              <button class="btn-toggle" @click="clearError">Close</button>
            </div>
          </div>
        </div>
        <div class="guide-overlay" v-if="showGuide">
          <div class="guide-box" />
          <div class="guide-text">Place the barcode inside the frame</div>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'

const props = defineProps({
  autoStart: { type: Boolean, default: true },
  showControls: { type: Boolean, default: true },
  containerId: { type: String, default: 'scanner-container' },
  disabled: { type: Boolean, default: false },
  enableFullscreen: { type: Boolean, default: true },
  showGuide: { type: Boolean, default: true }
})
const emit = defineEmits(['detected','error','started','stopped'])

const errorMsg = ref('')

let codeReader = null
const videoInputDevices = ref([])
const selectedDeviceId = ref(null)
const scanning = ref(false)
const isFullscreen = ref(false)
const torchAvailable = ref(false)
const torchOn = ref(false)
let currentVideoTrack = null
let activeStream = null

const listDevices = async () => {
  try {
    const reader = new BrowserMultiFormatReader()
    const devices = await reader.listVideoInputDevices()
    videoInputDevices.value = devices
    if (devices.length) {
      // Prefer rear/back camera when labels are available; otherwise heuristic: last device.
      const back = devices.find(d => /back|rear|environment/i.test(d.label || ''))
      selectedDeviceId.value = (back ? back.deviceId : devices[devices.length - 1].deviceId)
    }
    reader.reset()
  } catch (e) {
    emit('error', e)
  }
}

const startScanning = async () => {
  if (scanning.value) return
  try {
    // stop any other ZXing reader running in the page (defensive)
    try {
      if (window.__zxing_active_reader && window.__zxing_active_reader !== codeReader) {
        try { window.__zxing_active_reader.reset() } catch (e) {}
        try { delete window.__zxing_active_reader } catch (e) {}
      }
    } catch (e) {}

    // reset previous reader if exists to avoid "video already playing" warnings
    if (codeReader) {
      try { codeReader.reset() } catch (e) { /* ignore */ }
      codeReader = null
    }
    codeReader = new BrowserMultiFormatReader()
    window.__zxing_active_reader = codeReader
    // set hints for common consumer barcodes and be more aggressive
    try {
      codeReader.hints = new Map()
      codeReader.hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.CODE_128
      ])
      codeReader.hints.set(DecodeHintType.TRY_HARDER, true)
    } catch (e) {
      // non-fatal if hints aren't supported
    }
    scanning.value = true
    emit('started')
    // if selectedDeviceId null, pass null to choose default
    // pass the actual video element to ZXing to avoid ambiguous id lookup
    const vidEl = document.getElementById(videoId)
    if (vidEl) {
      vidEl.playsInline = true
      vidEl.muted = true
      vidEl.autoplay = true
      try { vidEl.pause() } catch (e) {}
      try { if (vidEl.srcObject && vidEl.srcObject.getTracks) vidEl.srcObject.getTracks().forEach(t=>{try{t.stop()}catch(e){}}) } catch(e){}
      vidEl.srcObject = null
    }

    const md = navigator && navigator.mediaDevices
    if (!md || !md.getUserMedia) {
      throw new Error('This browser does not support camera access (HTTPS or localhost is required)')
    }

    const buildVideoConstraints = (preset) => {
      const base = selectedDeviceId.value
        ? { deviceId: { exact: selectedDeviceId.value } }
        : { facingMode: { ideal: 'environment' } }

      if (preset === '1080') {
        return {
          ...base,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30 },
        }
      }

      // 720 fallback
      return {
        ...base,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30 },
      }
    }

    const openStream = async () => {
      const presets = ['1080', '720']
      let lastErr = null
      for (const p of presets) {
        try {
          return await md.getUserMedia({ audio: false, video: buildVideoConstraints(p) })
        } catch (e) {
          lastErr = e
        }
      }
      throw lastErr
    }

    // Stop any existing stream before opening a new one
    try {
      if (activeStream && activeStream.getTracks) {
        activeStream.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
      }
    } catch (e) {}
    activeStream = await openStream()

    // Best-effort: enable continuous focus/exposure/whitebalance if supported
    try {
      const track = activeStream.getVideoTracks && activeStream.getVideoTracks()[0]
      if (track) {
        currentVideoTrack = track
        const caps = track.getCapabilities && track.getCapabilities()
        torchAvailable.value = !!(caps && caps.torch)
        try {
          track.applyConstraints({
            advanced: [
              { focusMode: 'continuous' },
              { exposureMode: 'continuous' },
              { whiteBalanceMode: 'continuous' },
            ],
          })
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {}

    // Start decoding without awaiting (it runs until reset())
    const onDecode = (result, err) => {
      if (result) {
        const text = (typeof result.getText === 'function') ? result.getText() : result.text
        emit('detected', text)
        // optionally stop after first detection
        // stopScanning()
      }
      if (err && err.name && err.name !== 'NotFoundException') {
        // Optional: emit('error', err)
      }
    }

    Promise
      .resolve(codeReader.decodeFromStream(activeStream, vidEl || null, onDecode))
      .catch((startErr) => {
        console.warn('decodeFromStream failed', startErr && startErr.name)
        const msg = startErr && startErr.name ? `${startErr.name}: ${startErr.message || ''}` : String(startErr)
        errorMsg.value = msg
        emit('error', startErr)
        scanning.value = false
        try {
          if (activeStream && activeStream.getTracks) {
            activeStream.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
          }
        } catch (e) {}
        activeStream = null
      })
    } catch (e) {
      // capture error for UI so user sees what's happening
      const msg = e && e.name ? `${e.name}: ${e.message || ''}` : String(e)
      errorMsg.value = msg
      emit('error', e)
      scanning.value = false
    }
}

const stopScanning = () => {
  try {
    if (codeReader) {
      codeReader.reset()
      codeReader = null
    }
  } catch (e) {
    // ignore
  }
  try {
    if (window.__zxing_active_reader) {
      try { window.__zxing_active_reader.reset() } catch (e) {}
      try { delete window.__zxing_active_reader } catch (e) {}
    }
  } catch (e) {}
  try {
    const vid = document.getElementById(videoId)
    if (vid && vid.srcObject && vid.srcObject.getTracks) {
      vid.srcObject.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
    }
    if (vid) vid.srcObject = null
  } catch (e) {}

  try {
    if (activeStream && activeStream.getTracks) {
      activeStream.getTracks().forEach(t => { try { t.stop() } catch (e) {} })
    }
  } catch (e) {}
  activeStream = null
  scanning.value = false
  emit('stopped')
}

const clearError = () => { errorMsg.value = '' }
const retry = () => {
  clearError()
  try { stopScanning() } catch (e) {}
  setTimeout(() => { startScanning() }, 600)
}

const toggleScanning = () => {
  if (scanning.value) stopScanning(); else startScanning()
}

const toggleFullscreen = async () => {
  try {
    const el = document.getElementById(props.containerId)
    if (!el) return
    if (!isFullscreen.value) {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
      isFullscreen.value = true
    } else {
      if (document.exitFullscreen) await document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      isFullscreen.value = false
    }
  } catch (e) {
    emit('error', e)
  }
}

const toggleTorch = async () => {
  try {
    if (!currentVideoTrack) return
    torchOn.value = !torchOn.value
    await currentVideoTrack.applyConstraints({ advanced: [{ torch: torchOn.value }] })
  } catch (e) {
    emit('error', e)
    torchOn.value = false
  }
}

// watch fullscreenchange to sync state
document.addEventListener('fullscreenchange', () => {
  const el = document.getElementById(props.containerId)
  isFullscreen.value = !!(document.fullscreenElement === el)
})

// expose videoId based on containerId
const videoId = `${props.containerId}-video`

onMounted(async () => {
  await listDevices()
  if (props.autoStart) startScanning()
})

onBeforeUnmount(() => {
  stopScanning()
})

watch(selectedDeviceId, () => {
  // restart scanning on device change
  if (scanning.value) {
    stopScanning()
    startScanning()
  }
})

watch(() => props.disabled, (v) => {
  if (v && scanning.value) stopScanning()
  else if (!v && props.autoStart && !scanning.value) startScanning()
})
</script>

<style scoped>
.scanner-camera { width:100%; position:relative }
.controls { display:flex; gap:0.5rem; align-items:center; margin-bottom:0.6rem }
.frame { width:100%; max-width:640px }
.scanner-container { width:100%; height:280px; background:#000; border-radius:8px; overflow:hidden; position:relative }
.scanner-container.fullscreen { position:fixed; inset:0; width:100vw; height:100vh; z-index:2200; border-radius:0 }
.scanner-video { width:100%; height:100%; object-fit:cover }
.guide-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none }
.guide-box { width:70%; max-width:420px; aspect-ratio: 2.2/1; border: 3px dashed rgba(255,255,255,0.6); border-radius:12px; box-shadow: 0 0 0 2000px rgba(0,0,0,0.25); }
.guide-text { margin-top:0.6rem; color:#fff; font-weight:600; background: rgba(0,0,0,0.4); padding:0.35rem 0.6rem; border-radius:6px }
.btn-toggle { padding:0.4rem 0.8rem; border-radius:6px; border:none; background:#1976d2; color:#fff }
.scan-tips { margin-top:0.45rem; font-size:0.82rem; color: rgba(255,255,255,0.85); background: rgba(0,0,0,0.18); padding:0.28rem 0.5rem; border-radius:6px }
@media (max-width:600px) { .scanner-container { height:200px } }
</style>
