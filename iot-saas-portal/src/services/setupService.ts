import api from '../api';

export interface CompleteSetupRequest {
  token: string;
  email: string;
  password: string;
}

export const setupService = {
  /**
   * Envía la contraseña y el token al Master para activar la cuenta
   */
  completeSetup: async (data: CompleteSetupRequest) => {
    const response = await api.post('/auth/complete-setup', data);
    return response.data;
  },

  /**
   * Opcional: Validar si el token sigue vigente antes de mostrar el formulario
   */
  verifyToken: async (token: string, email: string) => {
    const response = await api.get(`/auth/verify-token?token=${token}&email=${email}`);
    return response.data;
  }
};