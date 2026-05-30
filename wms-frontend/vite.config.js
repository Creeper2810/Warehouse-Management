import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import path from 'path'

let basicSsl
try {
  // Optional dependency: only needed when enabling HTTPS without providing cert files.
  // eslint-disable-next-line import/no-extraneous-dependencies
  basicSsl = (await import('@vitejs/plugin-basic-ssl')).default
} catch (e) {
  basicSsl = null
}

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar({
      sassVariables: 'src/quasar-variables.sass'
    }),
    // Enable when VITE_HTTPS=1 and plugin is installed
    ...(process.env.VITE_HTTPS === '1' && basicSsl ? [basicSsl()] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', '127.0.0.1', '.local'],

    // Camera/WebRTC requires a secure context.
    // - http://localhost is allowed by browsers.
    // - For LAN IP access, enable HTTPS by setting VITE_HTTPS=1.
    // If you have your own certs, set VITE_SSL_KEY and VITE_SSL_CERT to absolute paths.
    https: process.env.VITE_HTTPS === '1'
      ? (process.env.VITE_SSL_KEY && process.env.VITE_SSL_CERT
          ? {
              key: require('fs').readFileSync(process.env.VITE_SSL_KEY),
              cert: require('fs').readFileSync(process.env.VITE_SSL_CERT),
            }
          : true)
      : false,
    
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',  // Laragon virtual host
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, '/api'),
      }
      ,
      '/sanctum': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/sanctum/, '/sanctum'),
      }
    }
  }
})
