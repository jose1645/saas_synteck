import axios from 'axios';

const api = axios.create({

  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Interceptor de Peticiones: Añade el Token de Acceso
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // Usamos "token" para ser consistentes
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Respuestas: Maneja el Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si hay error 401 y NO es el login ni un reintento previo
    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/login') && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          console.log("🔄 Rotando tokens...");
          // Llamada directa a axios para no entrar en bucle con este interceptor
          const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/refresh`, {
            refresh_token: refreshToken
          });

          // EXTRAEMOS AMBOS TOKENS DEL BACKEND
          const { access_token, refresh_token: new_refresh } = res.data;

          // ACTUALIZAMOS EL STORAGE CON LAS NUEVAS LLAVES
          localStorage.setItem("token", access_token);
          localStorage.setItem("refresh_token", new_refresh); // <--- ESTO ES VITAL

          console.log("✅ Sesión renovada");

          // Reintentamos la petición original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (err) {
          console.error("❌ Refresh token inválido o expirado");
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;