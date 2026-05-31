import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import { Notify } from 'quasar'

const TOKEN_STORAGE_KEY = 'auth_token'

// Keep credentials enabled for legacy cookie/session routes; bearer auth is used by the SPA.
axios.defaults.withCredentials = true
// Ensure axios uses same-origin (Vite dev server) so proxy sends to backend
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://warehouse-management-production-29fb.up.railway.app'
// Legacy CSRF defaults for cookie/session routes.
axios.defaults.xsrfCookieName = 'XSRF-TOKEN'
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'

axios.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    let authStore = null
    try {
      authStore = useAuthStore()
    } catch (e) {}
    const requestUrl = error.config?.url || ''
    const isLoginRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/login-mobile')

    if (error.response?.status === 401 && !isLoginRequest) {
      if (authStore) authStore.logout()
      if (router.currentRoute.value.path !== '/login') router.push('/login')
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
