import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import { Notify } from 'quasar'

// Every request uses credentials for Sanctum-style SPA cookies.
axios.defaults.withCredentials = true
// Ensure axios uses same-origin (Vite dev server) so proxy sends to backend
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://railway.app'
// Laravel defaults
axios.defaults.xsrfCookieName = 'XSRF-TOKEN'
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'

// Response interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    let authStore = null
    try {
      authStore = useAuthStore()
    } catch (e) {}
    if (error.response?.status === 401) {
      if (authStore) authStore.logout()
      router.push('/login')
      Notify.create({
        type: 'negative',
        message: 'Session expired. Please login again.'
      })
    } else if (error.response?.status === 422) {
      // Validation errors
      const errors = error.response.data.errors || {}
      const firstError = Object.values(errors)[0]?.[0]
      Notify.create({
        type: 'warning',
        message: firstError || 'Validation failed'
      })
    } else if (error.response?.status === 403) {
      Notify.create({
        type: 'negative',
        message: 'You do not have permission to perform this action'
      })
    }
    return Promise.reject(error)
  }
)

export default axios
