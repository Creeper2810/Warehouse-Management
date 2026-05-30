// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import LoginMobile from '../pages/LoginMobile.vue'
import ForgotPassword from '../pages/ForgotPassword.vue'
import ResetPassword from '../pages/ResetPassword.vue'
import Dashboard from '../pages/Dashboard.vue'
import Products from '../pages/Products.vue'
import ProductList from '../pages/ProductList.vue'
import ProductForm from '../pages/ProductForm.vue'
import ProductDetail from '../pages/ProductDetail.vue'
import ScannerPage from '../pages/ScannerPage.vue'
import Inventory from '../pages/Inventory.vue'
import Alerts from '../pages/Alerts.vue'
import UserList from '../pages/UserList.vue'
import UserForm from '../pages/UserForm.vue'
import UserDetail from '../pages/UserDetail.vue'
import StockMovementHistory from '../pages/StockMovementHistory.vue'
import SupplierList from '../pages/SupplierList.vue'
import SupplierForm from '../pages/SupplierForm.vue'
import SupplierDetail from '../pages/SupplierDetail.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/login-mobile', component: LoginMobile, meta: { public: true } },
  { path: '/forgot-password', component: ForgotPassword, meta: { public: true } },
  { path: '/reset-password', component: ResetPassword, meta: { public: true } },
  { path: '/', component: Dashboard, meta: { requiresAuth: true, allowedAbilities: ['admin', 'view-reports'] } },
  { path: '/products', component: ProductList, meta: { requiresAuth: true, allowedAbilities: ['admin', 'view-reports'] } },
  { path: '/products/create', component: ProductForm, meta: { requiresAuth: true, allowedRoles: ['admin', 'manager'] } },
  { path: '/products/:id', component: ProductDetail, meta: { requiresAuth: true, allowedAbilities: ['admin', 'view-reports'] } },
  { path: '/products/:id/edit', component: ProductForm, meta: { requiresAuth: true, allowedRoles: ['admin', 'manager'] } },
  { path: '/scanner', component: ScannerPage, meta: { requiresAuth: true, allowedAbilities: ['stock-in', 'stock-out'] } },
  { path: '/inventory', component: Inventory, meta: { requiresAuth: true, allowedAbilities: ['admin', 'view-reports'] } },
  { path: '/alerts', component: Alerts, meta: { requiresAuth: true, allowedAbilities: ['admin', 'view-reports'] } },
  { path: '/stock-movements', component: StockMovementHistory, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/suppliers', component: SupplierList, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/suppliers/create', component: SupplierForm, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/suppliers/:id', component: SupplierDetail, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/suppliers/:id/edit', component: SupplierForm, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/users', component: UserList, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/users/create', component: UserForm, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/users/:id', component: UserDetail, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/users/:id/edit', component: UserForm, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
]


const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isPublic = to.meta?.public === true
  if (isPublic) return next()

  if (!auth.isAuthenticated) {
    return next('/login')
  }

  // Check role-based access
  if (to.meta?.allowedRoles && to.meta.allowedRoles.length) {
    const userRole = auth.user?.role || auth.user?.type || ''
    const allowed = to.meta.allowedRoles.includes(userRole)
    if (!allowed) {
      if (auth.hasAbility('stock-in') || auth.hasAbility('stock-out')) return next('/scanner')
      return next('/')
    }
  }

  // Check ability-based access
  if (to.meta?.allowedAbilities && to.meta.allowedAbilities.length) {
    const allowed = to.meta.allowedAbilities.some((ab) => auth.hasAbility(ab))
    if (!allowed) {
      if (auth.hasAbility('stock-in') || auth.hasAbility('stock-out')) return next('/scanner')
      return next('/login')
    }
  }

  next()
})

export default router
