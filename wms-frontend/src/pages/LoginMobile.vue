<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="onLogin">
      <div class="login-logo">
        <img src="/vite.svg" alt="Logo" />
      </div>
      <h2 class="login-title">Mobile/API Login</h2>
      <div class="form-group">
        <label for="email">Email</label>
        <input v-model="email" id="email" type="email" required placeholder="email@domain.com" autocomplete="username" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input v-model="password" id="password" type="password" required placeholder="Password" autocomplete="current-password" />
      </div>

      <button type="submit" :disabled="loading" class="login-btn">Get token</button>

      <p v-if="token" class="token-box">
        <strong>Token:</strong>
        <span class="token-value">{{ token }}</span>
        <button @click.prevent="copyToken" class="copy-btn">Copy</button>
      </p>

      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from '@/plugins/axios'
import { Notify } from 'quasar'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const token = ref('')

const onLogin = async () => {
  loading.value = true
  error.value = ''
  token.value = ''
  try {
    const resp = await axios.post('/api/v1/auth/login-mobile', { email: email.value, password: password.value })
    token.value = resp.data.token
    Notify.create({ type: 'positive', message: 'Login successful. Token received.' })
  } catch (e) {
    error.value = e.response?.data?.message || 'Login failed'
    Notify.create({ type: 'negative', message: error.value })
  } finally {
    loading.value = false
  }
}

const copyToken = async () => {
  if (!token.value) return
  try {
    await navigator.clipboard.writeText(token.value)
    Notify.create({ type: 'positive', message: 'Token copied' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Copy failed' })
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display:flex; align-items:center; justify-content:center; background: linear-gradient(120deg,#e3f2fd 60%,#f5f6fa 100%); }
.login-form { background:#fff; padding:2em; border-radius:16px; width:100%; max-width:420px; display:flex; flex-direction:column; gap:1rem; }
.login-title { color:#1976d2; font-weight:700; text-align:center; }
.form-group label { display:block; margin-bottom:0.3rem }
.form-group input { width:100%; padding:0.6rem; border-radius:6px; border:1px solid #dbe2ef }
.login-btn { padding:0.8rem; background:linear-gradient(90deg,#1976d2,#42a5f5); color:#fff; border:none; border-radius:8px }
.token-box { background:#f1f8e9; padding:0.8rem; border-radius:8px; display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap }
.token-value { font-family:monospace; word-break:break-all }
.copy-btn { padding:0.3rem 0.6rem; border-radius:6px; border:none; background:#1976d2; color:#fff }
.error { color:#e53935; text-align:center }
</style>
