import api from "./api";

// 1. Asegúrate de que diga "export const authService"
export const authService = {
  
  login: async (email, password) => {
    // Tu lógica de login que inyecta el header x-portal-type
    const response = await api.post('/auth/login', 
      { email, password },
      { headers: { 'x-portal-type': 'CLIENT_PORTAL' } } // O el portal que estés usando
    );
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token); 
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      // Llamada al backend para invalidar en DB
      await api.post('/auth/logout', { refresh_token: refreshToken });
    }
  }
};