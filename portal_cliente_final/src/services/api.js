import axios from 'axios';

// Creamos la instancia con la URL base de tu FastAPI
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variables para manejar la cola de refresco
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * INTERCEPTOR DE PETICIONES (REQUEST)
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
 * Maneja el 401 con lógica de cola para evitar peticiones redundantes de refresh.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no hemos reintentado esta petición específica
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        // Si ya hay un refresco en marcha, encolamos esta petición
        console.log("⏳ [API] Refresco en curso, encolando petición...");
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      console.log("🔐 [API] Token expirado (401). Intentando renovar...");

      return new Promise(async (resolve, reject) => {
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error("No hay Refresh Token disponible.");
          }

          // Usamos axios directo para evitar loops de interceptores
          const resp = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          if (resp.status === 200) {
            const { access_token, refresh_token: newRefresh } = resp.data;

            console.log("✅ [API] Token renovado exitosamente.");

            localStorage.setItem('token', access_token);
            localStorage.setItem('refresh_token', newRefresh);

            // Actualizamos el header por defecto para futuras peticiones
            api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            // Procesamos la cola con éxito
            processQueue(null, access_token);

            // Reintentamos la petición original
            originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
            resolve(api(originalRequest));
          } else {
            throw new Error("Fallo al renovar token (Status no 200)");
          }
        } catch (refreshError) {
          console.error("🔒 [API] Sesión expirada definitivamente. Limpiando y redirigiendo...");

          processQueue(refreshError, null);

          localStorage.clear();
          // Solo redirigimos si no estamos ya en login para evitar bucles
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }

          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }

    return Promise.reject(error);
  }
);

export default api;