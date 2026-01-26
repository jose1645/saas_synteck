import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno del directorio actual (process.cwd())
  // El tercer parámetro '' carga todas las variables sin importar el prefijo si es necesario,
  // pero por defecto Vite solo carga las que empiezan con VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Aquí mapeamos la variable del .env al código
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL)
    }
  }
})