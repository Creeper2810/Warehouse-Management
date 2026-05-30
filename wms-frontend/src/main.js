import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import 'quasar/dist/quasar.css'
import '@quasar/extras/material-icons/material-icons.css'
import '@/plugins/axios'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(Quasar, {
  plugins: {
    Notify,
    Dialog,
    Loading
  },
  config: {
    notify: { position: 'top', timeout: 2500 }
  }
})

import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
auth.initAuth()

// Register service worker only in production. In dev, Vite HTTPS commonly uses
// a local certificate, and service workers are stricter about certificate trust.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('Service worker registered:', reg.scope)
    }).catch(err => {
      console.warn('Service worker registration failed:', err)
    })
  })
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => registrations.forEach(reg => reg.unregister()))
    .catch(err => console.warn('Service worker cleanup failed:', err))
}

app.mount('#app')
