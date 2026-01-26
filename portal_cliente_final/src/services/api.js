import axios from 'axios';

// Creamos la instancia con la URL base de tu FastAPI
const api = axios.create({

  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * INTERCEPTOR DE PETICIONES (REQUEST)
 * Agrega el token de acceso a cada llamada antes de que salga al servidor.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * INTERCEPTOR DE RESPUESTAS (RESPONSE)
 * Maneja errores globales, especialmente el 401 (Token expirado).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no hemos reintentado aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error("No refresh token");

        // Intentamos renovar el token en el endpoint que creamos en el backend
        // Usamos axios directo para evitar loop infinito de interceptores
        const resp = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        if (resp.status === 200) {
          const { access_token, refresh_token: newRefresh } = resp.data;
          
          // Guardamos los nuevos tokens
          localStorage.setItem('token', access_token);
          localStorage.setItem('refresh_token', newRefresh);

          // Reintentamos la petición original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Si el refresh también falla, limpiamos y mandamos al login
        console.error("🔒 Sesión expirada definitivamente. Redirigiendo...");
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;