import axios from 'axios';

// Captura la URL inyectada por Docker o el .env local
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log("📍 API URL CARGADA:", BASE_URL); // Esto aparecerá en la consola apenas cargue la web
const api = axios.create({
  baseURL: BASE_URL,
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es la ruta de login
    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/login') && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          // Usamos la misma constante BASE_URL para el refresh
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          const { access_token, refresh_token: new_refresh } = res.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", new_refresh);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;