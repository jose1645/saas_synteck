import api from '../api';

export const partnerService = {
    // Obtener perfil del partner logueado
    getMyProfile: async () => {
        const response = await api.get('/partners/me/profile');
        // Nota: Si no existe GET /me (solo agregué PUT), podemos inferirlo del user o agregar GET
        // Por ahora confiar en lo que viene del user context o agregar GET /me si hace falta
        return response.data;
    },

    // Actualizar perfil propio branding
    updateMyProfile: async (data) => {
        const response = await api.put('/partners/me/profile', data);
        return response.data;
    }
};
