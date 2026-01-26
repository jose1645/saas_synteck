// vite.config.ts del portal ESCLAVO
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Forzamos a que el socio siempre use el 5174
    strictPort: true, // Si el 5174 está ocupado, que falle en lugar de buscar otro
  }
})