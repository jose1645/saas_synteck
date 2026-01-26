import api from '../api';

export interface PlantCreateData {
  name: string;
  city: string;
  client_id: number;
}

export const plantService = {
  // Obtener info básica del cliente
  getClientInfo: async (clientId: string | number) => {
    console.log(`📡 [DEBUG] Solicitando info base del Cliente ID: ${clientId}`);
    return await api.get(`/clients/${clientId}`);
  },

  // Obtener todas las plantas de un cliente
  getPlantsByClient: async (clientId: string | number) => {
    console.log(`📡 [DEBUG] Solicitando plantas para el Cliente ID: ${clientId}`);
    return await api.get(`/plants/client/${clientId}`);
  },

  // Crear una nueva planta
  createPlant: async (plantData: PlantCreateData) => {
    console.group("🚀 [DEBUG] API: Creando Nueva Planta");
    console.log("Payload:", plantData);
    try {
      const response = await api.post('/plants/', plantData);
      console.log("✅ Éxito:", response.data);
      return response;
    } catch (error: any) {
      console.error("❌ Error en createPlant:", error.response?.data || error.message);
      throw error;
    } finally {
      console.groupEnd();
    }
  },

  // Obtener dispositivos de una planta específica
  getDevicesByPlant: async (plantId: string | number) => {
    console.log(`🔍 [DEBUG] Buscando equipos en Planta ID: ${plantId}`);
    return await api.get(`/devices/plant/${plantId}`);
  }
};