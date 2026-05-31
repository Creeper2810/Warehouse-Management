<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="onSubmit">
      <div class="login-logo">
        <img src="/vite.svg" alt="Logo" />
      </div>

      <h2 class="login-title">Reset Password</h2>

      <div class="form-group">
        <label for="email">Email</label>
        <div class="input-icon-group">
          <span class="input-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="#90caf9"/></svg>
          </span>
          <input v-model.trim="email" id="email" type="email" required placeholder="Email" autocomplete="email" />
        </div>
      </div>

      <div class="form-group">
        <label for="password">New Password</label>
        <div class="input-icon-group">
          <span class="input-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-7V7a6 6 0 10-12 0v3a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zm-8-3a4 4 0 118 0v3H6V7z" fill="#90caf9"/></svg>
          </span>
          <input v-model="password" id="password" type="password" required placeholder="New password" autocomplete="new-password" />
        </div>
      </div>

      <div class="form-group">
        <label for="password_confirmation">Confirm Password</label>
        <div class="input-icon-group">
          <span class="input-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-7V7a6 6 0 10-12 0v3a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zm-8-3a4 4 0 118 0v3H6V7z" fill="#90caf9"/></svg>
          </span>
          <input v-model="passwordConfirmation" id="password_confirmation" type="password" required placeholder="Confirm password" autocomplete="new-password" />
        </div>
      </div>

      <button type="submit" :disabled="loading" class="login-btn">Confirm</button>

      <p v-if="message" class="info">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <router-link class="link" to="/login">Back to login</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { passwordResetApi } from '@/services/api'

const route = useRoute()
const router = useRouter()

const email = ref('')
const token = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

onMounted(() => {
  email.value = (route.query.email || '').toString()
  token.value = (route.query.token || '').toString()
})

async function onSubmit () {
  loading.value = true
  message.value = ''
  error.value = ''

  try {
    if (!token.value) {
      error.value = 'The link is invalid or has expired.'
      return
    }

    const resp = await passwordResetApi.reset({
      email: email.value,
      token: token.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    message.value = resp?.data?.message || 'Password reset successfully.'

    // Optional: redirect after short delay
    setTimeout(() => router.push('/login'), 700)
  } catch (e) {
    const first = e?.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : null
    error.value = first || e?.response?.data?.message || 'Unable to reset password. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(120deg, #e3f2fd 60%, #f5f6fa 100%);
}
.login-form {
  background: #fff;
  padding: 2.7em 2em 2em 2em;
  border-radius: 20px;
  box-shadow: 0 4px 32px rgba(25, 118, 210, 0.13);
  min-width: 340px;
  width: 100%;
  max-width: 390px;
  display: flex;
  flex-direction: column;
  gap: 1.2em;
  align-items: center;
}
.login-logo img { width: 54px; height: 54px }
.login-title { margin: 0; color: #1976d2; font-weight: 600; letter-spacing: 0.2px;font-size: 28px; }
.form-group { width: 100%; display: flex; flex-direction: column; gap: 0.45em }
.form-group label { font-weight: 600; color: #1565c0 }
.input-icon-group { display:flex; align-items:center; gap: 0.6em; border: 1px solid #e3f2fd; border-radius: 12px; padding: 0.6em 0.75em; background: #fbfdff }
.input-icon { display:flex; align-items:center }
.input-icon-group input { border: none; outline: none; width: 100%; font-size: 1rem; background: transparent }
.login-btn { width: 100%; border: none; border-radius: 12px; padding: 0.85em 1em; font-weight: 800; color: #fff; background: linear-gradient(90deg,#1976d2,#42a5f5); cursor:pointer }
.login-btn:disabled { opacity: 0.7; cursor: not-allowed }
.error { color: #d32f2f; margin: 0; font-weight: 600; text-align: center }
.info { color: #2e7d32; margin: 0; font-weight: 600; text-align: center }
.actions { width: 100%; display:flex; justify-content:center }
.link { color: #1976d2; text-decoration: none; font-weight: 700 }
.link:hover { text-decoration: underline }
</style>
