<template>
  <button class="header-logout" @click="handleLogout" title="Logout">
    Logout
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const handleLogout = async () => {
  try {
    await auth.logoutRemote()
  } catch (e) {
    console.warn('Network logout failed')
  }
  await router.push('/login')
}
</script>

<style scoped>
.header-logout {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.18);
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.header-logout:hover { background: rgba(255,255,255,0.08); }
</style>
