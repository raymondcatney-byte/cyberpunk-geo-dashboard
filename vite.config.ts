import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'https://cyberpunk-dashboard-v2.vercel.app'
export default defineConfig({
  plugins: [
    react(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./srs"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 3000, // Disable chunk size warnings
    // No manualChunks - let Vite handle automatically
    rollupOptions: {
      // external: [],
    },
  },
})
