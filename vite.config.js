import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    open: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  }
});
