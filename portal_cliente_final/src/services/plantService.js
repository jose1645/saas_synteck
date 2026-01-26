import api from "./api";

export const plantService = {
  // 1. Obtener información básica de un cliente (nombre, ubicación, etc.)
  getClientInfo: async (clientId) => {
    console.log(`📡 [plantService] Consultando Cliente ID: ${clientId}`);
    return await api.get(`/clients/${clientId}`);
  },

  // 2. Obtener todas las plantas asociadas a un cliente específico
 getPlantsByClient: async (clientId) => {
    // Validación de seguridad para evitar el 404 por 'undefined'
    if (!clientId || clientId === 'undefined') {
      console.warn("⚠️ [plantService] Intento de consulta sin clientId válido.");
      return { data: [] }; 
    }

    console.log(`📡 [plantService] Listando plantas del Cliente: ${clientId}`);
    // Quitamos la barra inicial si tu baseURL ya la tiene
    return await api.get(`plants/client/${clientId}`); 
  },

  // 3. Crear una nueva planta
  // payload: { name: string, city: string, client_id: number }
  createPlant: async (payload) => {
    console.log("🚀 [plantService] Registrando nueva planta...", payload);
    return await api.post('/plants/', payload);
  },

  // 4. Obtener detalle de una sola planta por su ID
  getPlantById: async (plantId) => {
    return await api.get(`/plants/${plantId}`);
  }
};