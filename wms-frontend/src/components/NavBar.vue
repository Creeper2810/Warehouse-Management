<template>
  <div class="nav-wrapper">
    <button class="burger" @click="toggleMobile" aria-label="menu" :aria-expanded="mobileOpen">Menu</button>

    <!-- Desktop inline nav (links only) -->
    <nav class="nav-links desktop">
      <template v-if="isAuthenticated">
        <router-link v-if="canViewReports" to="/" class="nav-link" aria-current="page">Dashboard</router-link>
        <router-link v-if="canViewReports" to="/products" class="nav-link">Products</router-link>
        <router-link v-if="canViewReports" to="/inventory" class="nav-link">Inventory</router-link>
        <router-link v-if="canStockIn || canStockOut" to="/scanner" class="nav-link">Scan</router-link>
        <router-link v-if="isAdmin" to="/stock-movements" class="nav-link">Stock History</router-link>
        <router-link v-if="isAdmin" to="/suppliers" class="nav-link">Suppliers</router-link>
        <router-link v-if="isAdmin" to="/users" class="nav-link">Users</router-link>
        <router-link v-if="canViewReports" to="/alerts" class="nav-link">Alerts</router-link>
      </template>
      <template v-else>
        <router-link to="/login" class="nav-link">Login</router-link>
        <router-link to="/login-mobile" class="nav-link">Mobile</router-link>
      </template>
    </nav>

    <!-- Mobile drawer -->
    <div class="mobile-drawer" v-show="mobileOpen" role="dialog" aria-modal="true">
      <div class="mobile-header">
        <div class="brand">WMS</div>
        <button class="close" @click="closeMobile" aria-label="close">x</button>
      </div>
      <div class="mobile-links">
        <template v-if="isAuthenticated">
          <router-link v-if="canViewReports" to="/" class="mobile-link" @click.native="closeMobile">Dashboard</router-link>
          <router-link v-if="canViewReports" to="/products" class="mobile-link" @click.native="closeMobile">Products</router-link>
          <router-link v-if="canViewReports" to="/inventory" class="mobile-link" @click.native="closeMobile">Inventory</router-link>
          <router-link v-if="canStockIn || canStockOut" to="/scanner" class="mobile-link" @click.native="closeMobile">Scan</router-link>
          <router-link v-if="isAdmin" to="/stock-movements" class="mobile-link" @click.native="closeMobile">Stock History</router-link>
          <router-link v-if="isAdmin" to="/suppliers" class="mobile-link" @click.native="closeMobile">Suppliers</router-link>
          <router-link v-if="isAdmin" to="/users" class="mobile-link" @click.native="closeMobile">User Management</router-link>
          <router-link v-if="canViewReports" to="/alerts" class="mobile-link" @click.native="closeMobile">Alerts</router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="mobile-link" @click.native="closeMobile">Login</router-link>
          <router-link to="/login-mobile" class="mobile-link" @click.native="closeMobile">Mobile Login</router-link>
        </template>
      </div>
    </div>

    <div class="drawer-backdrop" v-show="mobileOpen" @click="closeMobile" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const mobileOpen = ref(false)
const toggleMobile = () => (mobileOpen.value = !mobileOpen.value)
const closeMobile = () => (mobileOpen.value = false)

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const isAuthenticated = auth.isAuthenticated
const canStockIn = computed(() => auth.hasAbility('stock-in'))
const canStockOut = computed(() => auth.hasAbility('stock-out'))
const canViewReports = computed(() => auth.hasAbility('admin') || auth.hasAbility('view-reports'))
const isAdmin = computed(() => auth.hasAbility('admin'))


watch(() => route.fullPath, () => {
  closeMobile()
})

const onKey = (e) => {
  if (e.key === 'Escape') closeMobile()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const mobileLogout = async () => {
  try {
    await auth.logoutRemote()
  } catch (e) {
    console.warn('Network logout failed')
  }
  closeMobile()
  try { await router.push('/login') } catch (e) {}
}
</script>

<style scoped>
.nav-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center;
}
.nav-wrapper {
  /* brighter accent variables for this component */
  --nav-accent-start: #06b6d4; /* teal */
  --nav-accent-end: #7c3aed; /* violet */
  --nav-accent-strong: rgba(12, 74, 110, 0.18);
  --nav-text: #ffffff;
}
.burger {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
}
.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.nav-link {
  color: var(--nav-text);
  text-decoration: none;
  padding: 0.5rem 0.9rem;
  border-radius: 12px;
  background: transparent;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-weight: 700;
  letter-spacing: 0.2px;
  transition: transform 320ms cubic-bezier(.2,.9,.2,1), background 420ms ease, box-shadow 420ms ease, color 320ms ease;
}
.nav-link:hover {
  transform: translateY(-3px);
  background: linear-gradient(90deg, rgba(6,182,212,0.10), rgba(124,58,237,0.07));
  box-shadow: 0 10px 30px var(--nav-accent-strong);
}
.nav-link[aria-current='page'], .nav-link.router-link-active {
  background: linear-gradient(90deg, var(--nav-accent-start), var(--nav-accent-end));
  color: #fff;
  box-shadow: 0 12px 36px rgba(92, 42, 255, 0.18);
  transform: translateY(-1px);
}
.nav-user {
  color: #fff;
  margin-left: 0.5rem;
}
.nav-logout { margin-left: 0.75rem; display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(90deg,#ff6b6b,#ff8a65); color: #fff; border: none; padding: 0.45rem 0.7rem; border-radius: 10px; cursor: pointer; transition: transform .28s cubic-bezier(.2,.9,.2,1), box-shadow .32s ease; box-shadow: 0 8px 22px rgba(255,99,132,0.12) }
.nav-logout i.material-icons {
  font-size: 18px;
  line-height: 1;
}
.nav-logout:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(255,105,135,0.16) }
.logout-text { display: inline-block; }
.user-greet { opacity: 0.9; margin-right: 0.25rem; }
.user-name { color: #fff; }
.nav-spacer {
  width: 1rem;
}

@media (max-width: 800px) {
  .burger { display: block; }
  .nav-links.desktop { display: none; }
  .mobile-drawer {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 80vw;
    max-width: 320px;
    background: linear-gradient(180deg, var(--nav-accent-start), var(--nav-accent-end));
    color: #fff;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    padding: 0.8rem;
  }
  .mobile-header { display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0.6rem }
  .mobile-links { display:flex; flex-direction:column; gap:0.6rem; padding:0.6rem }
  .mobile-link { color: #fff; text-decoration:none; padding:0.7rem; border-radius:6px; background: rgba(255,255,255,0.04) }
  .mobile-user { margin-top:1rem; padding:0.6rem 0.7rem; font-weight:600 }
  .mobile-logout { margin-top:0.6rem; padding:0.6rem; background: rgba(255,255,255,0.12); border: none; color:#fff; border-radius:8px }
  .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000 }
}
</style>
