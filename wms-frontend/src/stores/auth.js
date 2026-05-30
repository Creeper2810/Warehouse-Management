import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const ROLE_ABILITIES = {
  admin: ['admin', 'view-reports', 'stock-in', 'stock-out', 'suppliers'],
  manager: ['view-reports', 'stock-in', 'stock-out'],
  warehouse_staff: ['stock-in', 'stock-out'],
}

export const useAuthStore = defineStore('auth', () => {
  let userRaw = localStorage.getItem('user')
  if (!userRaw || userRaw === 'undefined') userRaw = 'null'
  const user = ref(JSON.parse(userRaw))

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => (user.value && user.value.role) || null)
  const abilities = computed(() => {
    const base = role.value && ROLE_ABILITIES[role.value]
    return base ? Array.from(new Set(base)) : []
  })

  const hasAbility = (ability) => abilities.value.includes('admin') || abilities.value.includes(ability)

  let csrfFetched = false
  const login = async (email, password) => {
    if (!csrfFetched) {
      await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
      csrfFetched = true
    }
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password }, { withCredentials: true })
      user.value = response.data.user
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (e) {
      // If a 419 occurs, clear csrfFetched so the next login fetches CSRF again.
      if (e?.response?.status === 419) {
        csrfFetched = false
      }
      throw e
    }
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('user')
  }

  const initAuth = () => {
    // nothing needed for cookie-based
  }

  return { user, role, abilities, isAuthenticated, login, logout, initAuth, hasAbility }
})
