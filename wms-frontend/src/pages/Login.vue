

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="onLogin">
      <div class="mode-switch">
        <div class="mode-track" :data-mode="loginMode">
          <button type="button" class="mode-btn" :class="{active: loginMode === 'spa'}" @click="loginMode='spa'" aria-pressed="true">
            <span class="btn-icon">🌐</span>
            <span class="btn-text">SPA (Web)</span>
          </button>
          <button type="button" class="mode-btn" :class="{active: loginMode === 'mobile'}" @click="loginMode='mobile'" aria-pressed="false">
            <span class="btn-icon">📱</span>
            <span class="btn-text">Mobile (Token)</span>
          </button>
          <span class="switch-indicator" aria-hidden="true"></span>
        </div>
      </div>
      <div class="login-logo">
        <img src="/vite.svg" alt="Logo" />
      </div>
      <h2 class="login-title">System Login</h2>
      <div class="form-group">
        <label for="username">Username / Email</label>
        <div class="input-icon-group">
          <span class="input-icon"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="#90caf9"/></svg></span>
          <input v-model="username" id="username" :type="loginMode==='mobile'? 'email':'text'" required :placeholder="loginMode==='mobile' ? 'Enter email' : 'Enter username'" autocomplete="username" />
        </div>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <div class="input-icon-group">
          <span class="input-icon"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-7V7a6 6 0 10-12 0v3a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zm-8-3a4 4 0 118 0v3H6V7z" fill="#90caf9"/></svg></span>
          <input v-model="password" id="password" type="password" required placeholder="Enter password" autocomplete="current-password" />
        </div>
      </div>
      <button type="submit" :disabled="loading" class="login-btn">{{ loginMode==='spa' ? 'Login' : 'Get token' }}</button>

      <router-link v-if="loginMode==='spa'" class="forgot-link" to="/forgot-password">Forgot password?</router-link>

      <p v-if="token" class="token-box">
        <strong>Token:</strong>
        <span class="token-value">{{ token }}</span>
        <button @click.prevent="copyToken" class="copy-btn">Copy</button>
      </p>

      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

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
.mode-switch { width: 100%; display:flex; justify-content:center }
.mode-track { position: relative; display: flex; gap: 6px; background: linear-gradient(90deg,#eef6ff,#ffffff); padding:6px; border-radius:999px; box-shadow: 0 4px 18px rgba(33,150,243,0.06); }
.mode-btn { position: relative; border: none; background: transparent; padding: 0.45rem 0.9rem; border-radius: 999px; cursor: pointer; display:flex; align-items:center; gap:0.6rem; font-weight:600; color:#1976d2; transform: translateZ(0); overflow: hidden; }
.mode-btn .btn-icon { font-size: 1.05rem; display:inline-block }
.mode-btn .btn-text { font-size: 0.95rem }
.mode-btn:not(.active):hover { transform: translateY(-2px); }
.mode-btn.active { color: #fff; }
.mode-btn.active:after { content: ''; position: absolute; inset: 0; border-radius: 999px; box-shadow: 0 6px 20px rgba(25,118,210,0.18); }
.switch-indicator { position: absolute; top: 4px; bottom: 4px; width: calc(50% - 6px); border-radius: 999px; background: linear-gradient(90deg,#1976d2,#42a5f5); transition: transform 260ms cubic-bezier(.2,.9,.2,1), box-shadow 260ms; box-shadow: 0 6px 18px rgba(25,118,210,0.18); z-index: 0 }
.mode-track[data-mode='spa'] .switch-indicator { transform: translateX(4px); }
.mode-track[data-mode='mobile'] .switch-indicator { transform: translateX(calc(100% + 4px)); }
.mode-track .mode-btn { z-index: 1 }

/* Ripple effect */
.mode-btn::after { content: ''; position: absolute; border-radius: 50%; transform: scale(0); background: rgba(255,255,255,0.18); opacity: 0; transition: transform 360ms, opacity 360ms; pointer-events: none }
.mode-btn:active::after { transform: scale(4); opacity: 1; transition: transform 120ms, opacity 360ms }
.login-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.5em;
}
.login-logo img {
  width: 54px;
  height: 54px;
  border-radius: 12px;
  box-shadow: 0 2px 8px #90caf9aa;
}
.login-title {
  color: #1976d2;
  font-size: 2.5em;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.7em;
  line-height: 1.1;
}
.form-group {
  width: 100%;
  margin-bottom: 0.7em;
}
.form-group label {
  display: block;
  margin-bottom: 0.4em;
  color: #333;
  font-weight: 500;
}
.input-icon-group {
  display: flex;
  align-items: center;
  background: #f7f9fb;
  border-radius: 8px;
  border: 1.5px solid #dbe2ef;
  padding: 0.1em 0.7em 0.1em 0.5em;
  transition: border 0.2s;
}
.input-icon-group:focus-within {
  border: 1.5px solid #1976d2;
  box-shadow: 0 0 0 2px #90caf9aa;
}
.input-icon {
  margin-right: 0.5em;
  display: flex;
  align-items: center;
  color: #90caf9;
}
.input-icon svg {
  display: block;
}
.input-icon-group input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 1.1em;
  padding: 0.8em 0.2em;
  width: 100%;
}
.login-btn {
  width: 100%;
  padding: 1em 0;
  background: linear-gradient(90deg, #1976d2 60%, #42a5f5 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.18em;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.5em;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  transition: background 0.2s;
}
.login-btn:disabled {
  background: #90caf9;
  cursor: not-allowed;
}
.forgot-link {
  color: #1976d2;
  font-weight: 700;
  text-decoration: none;
  margin-top: -0.2em;
}
.forgot-link:hover { text-decoration: underline }
.error {
  color: #e53935;
  margin-top: 1em;
  text-align: center;
  font-size: 1em;
}
@media (max-width: 600px) {
  .login-form {
    min-width: unset;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    padding: 1.2em 0.8em 1.2em 0.8em;
    border-radius: 10px;
  }
  .login-title {
    font-size: 1.5em !important;
  }
}

/* Mobile: make center strip full-bleed and remove extra rounded edges that cause visible lines */
@media (max-width: 480px) {
  .center-wrap {
    width: 100vw;
    max-width: 100vw;
    padding: 28px 0;
    border-radius: 0;
    box-shadow: none;
    background: linear-gradient(180deg, var(--muted-strip) 0%, var(--muted-strip-2) 40%, #f8feff 100%);
  }

  /* keep the card visible but inset slightly so strip looks even */
  .login-form {
    margin: 0 12px;
    max-width: calc(100% - 24px);
    box-shadow: 0 10px 30px rgba(13,110,253,0.06);
  }

  /* reduce heavy shadows on small screens to avoid banding */
  .switch-indicator, .mode-track { box-shadow: none }
}
</style>



<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const token = ref('')
const loginMode = ref('spa') // 'spa' or 'mobile'
const router = useRouter()
const auth = useAuthStore()
import axios from '@/plugins/axios'
import { Notify } from 'quasar'

const onLogin = async () => {
  loading.value = true
  error.value = ''
  token.value = '' // Thêm dòng này để xóa token cũ nếu có
  
  try {
    if (loginMode.value === 'spa') {
      // 1. Gửi lệnh đăng nhập lên Backend Railway để xác thực
      await auth.login(username.value, password.value)
      
      // 2. TẠO THỜI GIAN CHỜ 300MS TẠI ĐÂY:
      // Ép Frontend dừng lại 1 chút cho trình duyệt kịp lưu Cookie 'Set-Cookie' từ Railway trả về
      setTimeout(() => {
        router.push('/') // Sau đó mới nhảy vào trang chính Dashboard
        Notify.create({ 
          type: 'positive', 
          message: 'Logged in successfully!' 
        })
      }, 300) // 300 mili-giây là đủ để trình duyệt đồng bộ xong dữ liệu phiên

    } else {
      // Đoạn xử lý mobile token flow của bạn giữ nguyên...
      const resp = await axios.post('/api/v1/auth/login-mobile', { email: username.value, password: password.value })
      token.value = resp.data.token
      Notify.create({ type: 'positive', message: 'Token issued' })
    }
  } catch (e) {
    // Cải tiến đoạn bắt lỗi hiển thị rõ ràng hơn
    error.value = e?.response?.data?.message || (loginMode.value === 'spa' ? 'Invalid username or password' : 'Login failed')
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
