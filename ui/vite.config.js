import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'
import { resolve } from 'path'

// Load .env file from the ui directory
dotenv.config()

// Find all HTML files in the root directory for multi-page build
const pages = fs.readdirSync(__dirname).filter(file => file.endsWith('.html'))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: 'localhost', // Explicitly set for macOS
  },
  envPrefix: ['VITE_', 'TAURI_'],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_APP_ENV': JSON.stringify(process.env.VITE_APP_ENV || 'production'),
  },
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      // Build multiple HTML pages: index.html and clipboard-popup.html
      input: Object.fromEntries(
        pages.map(file => [
          file.replace('.html', ''),
          resolve(__dirname, file)
        ])
      ),
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'tiptap': ['@tiptap/react', '@tiptap/starter-kit'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
})
