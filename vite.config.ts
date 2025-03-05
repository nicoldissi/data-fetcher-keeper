
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { componentTagger } from 'lovable-tagger'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: "0.0.0.0",    
    port: parseInt(process.env.PORT || "8080"),
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8080"),
  }
}))
