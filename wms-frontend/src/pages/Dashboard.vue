<template>
  <div class="q-pa-md">

    <!-- USER INFO -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="bg-primary text-white">
          <q-card-section class="d-flex items-center justify-between">
            <div>
              <div v-if="user" class="text-h6">Hello, {{ user.name }}</div>
              <div v-if="user" class="text-subtitle2">
                Role: <strong>{{ user.role }}</strong>
              </div>
            </div>
            <div />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- STATS -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-6 col-sm-6 col-md-3" v-for="stat in stats" :key="stat.label">
        <q-card class="text-center stat-card">
          <q-card-section>
            <div class="text-h5">{{ stat.value }}</div>
            <div class="text-grey">{{ stat.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- QUICK ACTIONS (centered on desktop) -->
    <div class="q-mt-md quick-actions">
      <div class="actions-row">
        <div class="action-item" v-for="act in actions" :key="act.label">
          <router-link :to="act.to">
            <q-card class="action-card text-center">
              <q-card-section class="d-flex flex-column items-center">
                <q-icon :name="act.icon" size="36px" class="action-icon" color="primary" />
                <div class="action-label">{{ act.label }}</div>
              </q-card-section>
            </q-card>
          </router-link>
        </div>
      </div>
    </div>

    <!-- CHART -->
    <div class="q-mt-lg chart-wrap">
      <q-card>
        <q-card-section>
          <div class="text-h6">Stock In/Out Chart</div>
        </q-card-section>
        <q-card-section class="chart-section">
          <div class="chart-container">
            <Bar :data="chartData" :options="chartOptions" />
          </div>
        </q-card-section>
      </q-card>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

import { useAuthStore } from '@/stores/auth'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

// USER
const auth = useAuthStore()
const user = auth.user || null
const router = useRouter()

const handleLogout = async () => {
  try {
    await auth.logoutRemote()
  } catch (e) {
    console.warn('Network logout failed')
  }
  await router.push('/login')
}

import axios from 'axios'
import { onMounted } from 'vue'

const stats = ref([
  { label: 'Total Products', value: '-' },
  { label: 'Low Stock', value: '-' },
  { label: 'Inventory', value: '-' },
  { label: 'Stock In Today', value: '-' },
])

const actions = ref([
  { label: 'Scan', to: '/scanner', icon: 'photo_camera' }
])

const chartData = ref({
  labels: [],
  datasets: []
})

onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/dashboard/summary', { withCredentials: true })
    // Backend is expected to return { stats: [...], chart: { labels: [], datasets: [] } }
    if (res.data.stats) stats.value = res.data.stats
    if (res.data.chart) chartData.value = res.data.chart
  } catch (e) {
    // Handle errors here if needed.
  }
})



const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
}
</script>

<style scoped>
.q-card {
  border-radius: 12px;
}

.text-h5 {
  font-weight: bold;
}

.stat-card { padding: 0.8rem 0; }
.stat-card .text-h5 { font-size: 1.2rem }
.stat-card .text-grey { color: #666 }

.quick-actions { margin-top: 1rem }
.action-card { padding: 0.8rem; border-radius: 10px; }
.action-card { padding: 1.2rem 6rem; min-height: 96px; display:flex; align-items:center; justify-content:center }
.action-icon { margin-bottom: 0.4rem }
.action-label { font-size: 0.95rem; margin-top: 0.35rem }

.quick-actions .row { justify-content: center }
.actions-row { display: flex; gap: 1rem; justify-content: center; align-items: stretch; flex-wrap: wrap }
.action-item { flex: 0 0 280px; max-width: 320px; display:flex }

@media (max-width: 900px) {
  .action-item { flex: 0 0 46%; max-width: 48%; }
}

@media (max-width: 600px) {
  .action-item { flex: 0 0 100%; max-width: 100%; }
}

.chart-wrap .chart-section { padding: 0 }
.chart-container { width: 100%; height: 320px }

@media (max-width: 600px) {
  .chart-container { height: 220px }
  .action-label { font-size: 0.85rem }
  .stat-card .text-h5 { font-size: 1rem }
}
</style>
