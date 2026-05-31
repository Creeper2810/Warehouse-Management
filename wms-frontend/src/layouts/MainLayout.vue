<template>
  <div class="main-layout">
    <header class="main-header">
      <div class="header-left">
        <div class="logo-badge">WMS</div>
      </div>
      <nav class="main-nav">
        <slot name="header" />
        <NavBar />
      </nav>
      <div class="main-header-right"> 
        <div class="user-chip">
          <div class="user-avatar">{{ userName.charAt(0) }}</div>
          <div class="user-meta">
            <div class="user-name">{{ userName }}</div>
            <div class="user-role" v-if="userRole">{{ userRole }}</div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </header>
    <main class="main-content">
      <slot />
    </main>
    <footer class="main-footer">
      <slot name="footer" />
      <span>© {{ new Date().getFullYear() }} WMS System</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useAuthStore } from '@/stores/auth'

const NavBar = defineAsyncComponent(() => import('@/components/NavBar.vue'))
const LogoutButton = defineAsyncComponent(() => import('@/components/LogoutButton.vue'))

const auth = useAuthStore()
const userName = computed(() => {
  const u = auth.user && (auth.user.name || auth.user.username)
  if (u && typeof u === 'string') return u
  return 'User'
})

const userRole = computed(() => {
  if (!auth.user) return ''
  if (typeof auth.user.role === 'string' && auth.user.role.length) return auth.user.role
  if (auth.user.is_admin === true || auth.user.isAdmin === true) return 'Admin'
  return auth.user.type || auth.user.role_name || 'User'
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6fa;
}
.main-header {
 background: linear-gradient(300deg, #2f598f 60%, #16357b 100%);
  color: #fff;
  padding: 0.9em 1.6em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 6px 20px rgba(24,102,198,0.12);
}
.header-left { display:flex; align-items:center; gap:0.6rem }
.logo-badge {
  background: rgba(255,255,255,0.12);
  padding: 0.45rem 0.8rem;
  border-radius: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}
.brand-sub { font-size: 0.85rem; opacity: 0.95 }
.main-nav {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  gap: 1rem;
}
.main-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.user-chip { display:flex; align-items:center; gap:0.6rem; background: rgba(255,255,255,0.06); padding:6px 8px; border-radius: 12px }
.user-avatar { width:36px; height:36px; border-radius:8px; background: #fff; color:#1976d2; display:flex; align-items:center; justify-content:center; font-weight:700 }
.user-meta { line-height:1 }
.user-name { font-weight:700; font-size:0.95rem }
.user-role { font-size:0.75rem; opacity:0.85 }
.main-content {
  flex: 1;
  padding: 2em 0.5em 2em 0.5em;
}
.main-footer {
  background: #222;
  color: #fff;
  text-align: center;
  padding: 1em 0;
  font-size: 0.98em;
  border-top: 1px solid #333;
}
@media (max-width: 600px) {
  .main-header, .main-footer {
    padding: 1em 0.5em;
  }
  .main-content {
    padding: 1em 0.2em 1em 0.2em;
  }
}
</style>
