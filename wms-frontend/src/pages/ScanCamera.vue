
<template>
  <div class="scan-camera-page">
    <div class="scan-card">
      <h2 class="scan-title">Scan Barcode With Camera</h2>
      <div class="camera-frame">
        <ScannerCamera @detected="onDetected" :enableFullscreen="true" :showGuide="true" />
      </div>
      <div v-if="barcode" class="result-box">
        <span class="result-label">Result:</span>
        <span class="result-value">{{ barcode }}</span>
      </div>
      <p class="scan-tip">Point the camera at a barcode to scan automatically</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ScannerCamera from '@/components/ScannerCamera.vue'
const barcode = ref('')

const onDetected = (text) => {
  barcode.value = text
}
</script>


<style scoped>
.scan-camera-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
}
.scan-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 24px rgba(25, 118, 210, 0.10);
  padding: 2em 1.5em 1.5em 1.5em;
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.scan-title {
  color: #1976d2;
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 1.2em;
  text-align: center;
}
.camera-frame {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1.6/1;
  background: #222;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
}
#scanner-container {
  width: 100%;
  height: 200px;
}
.result-box {
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 8px;
  padding: 0.7em 1em;
  margin-bottom: 0.7em;
  font-size: 1.1em;
  display: flex;
  gap: 0.5em;
  align-items: center;
}
.result-label {
  font-weight: 600;
}
.result-value {
  font-family: monospace;
  font-size: 1.1em;
}
.scan-tip {
  color: #888;
  font-size: 0.98em;
  margin-top: 0.5em;
  text-align: center;
}
@media (max-width: 600px) {
  .scan-card {
    max-width: 98vw;
    padding: 1.2em 0.5em 1em 0.5em;
    border-radius: 10px;
  }
  .scan-title {
    font-size: 1.3em;
  }
  .camera-frame {
    max-width: 98vw;
    height: 160px;
  }
}
</style>
