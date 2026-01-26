import api from '../api';
import axios from 'axios'; // Importa el axios original, no tu instancia 'api'
export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  is_verified: boolean;
  partner_id: number | null;
  client_id: number | null;
  permissions: string[]; // Añadimos los permisos que envía el backend
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string; // 👈 Agregamos el refresh_token
  token_type: string;
  user: AuthUser;
}

export const authService = {
  /**
   * Login: Guarda el par de tokens y el usuario
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/auth/login',
      { email, password }, // Body
      {
        headers: {
          'x-portal-type': 'PARTNER_PORTAL' // <--- LA LLAVE QUE FALTABA
        }
      }
    );

    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
    }

    return response.data;
  },

  /**
   * Refresh: Este método puede ser llamado manualmente o por el interceptor
   */
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      authService.logout();
      throw new Error("No hay refresh token");
    }

    try {
      // Usamos la ruta que creamos en el backend
      const response = await api.post<AuthResponse>('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token: new_refresh, user } = response.data;

      // Actualizamos el storage con la rotación de tokens
      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', new_refresh);
      localStorage.setItem('user', JSON.stringify(user));

      return access_token;
    } catch (error) {
      authService.logout();
      throw error;
    }
  },

  /**
   * Logout: Limpia y rompe sesión
   */
  /**
     * Logout: Avisa al backend e invalida la sesión local
     */
  // services/authService.ts

  logout: async () => {
    console.log("DEBUG 1: Entrando a authService.logout");
    const refreshToken = localStorage.getItem('refresh_token');
    const token = localStorage.getItem('token');

    if (refreshToken) {
      try {
        console.log("DEBUG 2: Intentando POST a /auth/logout con token:", refreshToken.substring(0, 10));

        // Usamos la URL completa y axios directo
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await axios.post(`${apiUrl}/auth/logout`,
          { refresh_token: refreshToken },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log("DEBUG 3: Backend respondió OK");
      } catch (error) {
        console.error("DEBUG ERROR: Falló la petición física", error);
      }
    } else {
      console.log("DEBUG 2b: No hay refresh_token en storage");
    }

    console.log("DEBUG 4: Limpiando LocalStorage...");
    localStorage.clear();
  },

  getCurrentUser: (): AuthUser | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => localStorage.getItem('token'),
};