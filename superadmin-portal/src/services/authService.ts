import api from '../api';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    partner_id: number | null;
    client_id: number | null;
    permissions: string[]; // Añadimos los permisos que genera tu backend
  };
}

export const authService = {
  /**
   * Petición de login enviando JSON + Portal Header
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Definimos el tipo de portal. 
    // Para tu portal actual de gestión, usamos PARTNER_PORTAL.
    const response = await api.post('/auth/login', 
      { 
        email, 
        password 
      }, 
      {
      headers: { 'x-portal-type': 'ADMIN_PORTAL' } // <--- Cambia esto
      }
    );
    
    return response.data;
  },

  /**
   * Intercambia el refresh_token por un nuevo access_token
   */
  refresh: async (refreshToken: string): Promise<{ access_token: string, refresh_token: string }> => {
    const response = await api.post('/auth/refresh', { 
      refresh_token: refreshToken 
    });
    return response.data;
  },

logout: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    try {
      if (refreshToken) {
        // IMPORTANTE: Enviar el cuerpo del JSON que espera el backend
        await api.post('/auth/logout', { 
          refresh_token: refreshToken 
        });
        console.log("✅ Servidor notificado del cierre de sesión");
      }
    } catch (e) {
      console.warn("⚠️ Error al notificar logout al servidor:", e);
    } finally {
      // Limpieza local ocurra lo que ocurra
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      // Si usas redirección física:
      window.location.href = '/login';
    }
  }
};