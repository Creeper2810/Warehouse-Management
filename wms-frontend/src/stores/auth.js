import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from '@/plugins/axios'

const USER_STORAGE_KEY = 'user'
const TOKEN_STORAGE_KEY = 'auth_token'

const ROLE_ABILITIES = {
  admin: ['admin', 'view-reports', 'stock-in', 'stock-out', 'suppliers'],
  manager: ['view-reports', 'stock-in', 'stock-out'],
  warehouse_staff: ['stock-in', 'stock-out'],
}

function readStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw || raw === 'undefined') return null

  try {
    return JSON.parse(raw)
  } catch (e) {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

function applyAuthToken(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete axios.defaults.headers.common.Authorization
  }
}

export const useAuthStore = defineStore('auth', () => {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || ''
  if (!storedToken) localStorage.removeItem(USER_STORAGE_KEY)
  const storedUser = storedToken ? readStoredUser() : null
  if (storedToken && !storedUser) localStorage.removeItem(TOKEN_STORAGE_KEY)

  const user = ref(storedUser)
  const token = ref(storedUser ? storedToken : '')

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => (user.value && user.value.role) || null)
  const abilities = computed(() => {
    const base = role.value && ROLE_ABILITIES[role.value]
    return base ? Array.from(new Set(base)) : []
  })

  const hasAbility = (ability) => abilities.value.includes('admin') || abilities.value.includes(ability)

  const setAuthState = (nextUser, nextToken) => {
    user.value = nextUser || null
    token.value = nextToken || ''

    if (user.value) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user.value))
    else localStorage.removeItem(USER_STORAGE_KEY)

    if (token.value) localStorage.setItem(TOKEN_STORAGE_KEY, token.value)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)

    applyAuthToken(token.value)
  }

  const login = async (email, password) => {
    const response = await axios.post('/api/v1/auth/login-mobile', { email, password })
    const issuedToken = response.data?.token

    if (!issuedToken) {
      throw new Error('Login response did not include an auth token')
    }

    setAuthState(response.data.user, issuedToken)
    return response
  }

  const logout = () => {
    setAuthState(null, '')
  }

  const logoutRemote = async () => {
    const currentToken = token.value || localStorage.getItem(TOKEN_STORAGE_KEY)
    try {
      if (currentToken) {
        await axios.post('/api/v1/auth/logout-mobile', null, {
          headers: { Authorization: `Bearer ${currentToken}` },
        })
      }
    } finally {
      logout()
    }
  }

  const initAuth = () => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || ''
    token.value = storedToken
    applyAuthToken(storedToken)
  }

  initAuth()

  return { user, token, role, abilities, isAuthenticated, login, logout, logoutRemote, initAuth, hasAbility }
})
