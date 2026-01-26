import api from './api'; // Asegúrate de que apunte a tu configuración de Axios

export const deviceService = {
  /**
   * Obtiene todos los dispositivos del partner actual (Vista Integrador)
   */
  getAllDevices: async () => {
    console.log("📡 [deviceService] Solicitando listado global...");
    return await api.get('/devices/'); 
  },
  
  /**
   * Obtiene los dispositivos de una planta específica
   */
 getDevicesByPlant: async (plant_id) => {
    console.log(`📡 [deviceService] Listando equipos de la planta: ${plant_id}`);
    // Apuntamos a la nueva ruta en el controlador de Clients
    return await api.get(`/clients/plants/${plant_id}/devices`);
  },
  /**
   * NUEVO: Obtiene el dispositivo con toda su jerarquía (Partner, Cliente, Planta)
   * Útil para el Dashboard del Cliente Final para obtener los IDs del WebSocket.
   */
  getDeviceFullContext: async (deviceId) => {
    console.log(`🔍 [deviceService] Recuperando contexto completo del equipo: ${deviceId}`);
    return await api.get(`/devices/${deviceId}/full-context`);
  },

  /**
   * Gestión de AWS IoT: Aprovisionamiento (Crear Thing, Certs, etc.)
   */
  provisionDevice: async (deviceId) => {
    console.log(`🚀 [deviceService] Iniciando aprovisionamiento AWS para ID: ${deviceId}`);
    return await api.post(`/devices/${deviceId}/provision`, {});
  },

  /**
   * Gestión de AWS IoT: Verificar si el equipo ya existe en la nube
   */
  getProvisionStatus: async (deviceId) => {
    return await api.get(`/devices/${deviceId}/provision-status`);
  },

  // ======================================================
  // SECCIÓN DE MAPEADO (TAGS / VARIABLES)
  // ======================================================

  /**
   * Registra o actualiza el mapeo de una variable (Upsert)
   */
  registerTag: async (tagPayload) => {
    console.log(`💾 [deviceService] Guardando tag: ${tagPayload.mqtt_key}`);
    return await api.post('/devices/tags/register', tagPayload);
  },

  /**
   * Obtiene los tags registrados para un dispositivo
   */
  getDeviceTags: async (deviceId) => {
    return await api.get(`/devices/${deviceId}/tags`);
  },

  /**
   * Elimina un mapeo específico
   */
  deleteTag: async (deviceId, mqttKey, path) => {
    console.log(`🗑️ [deviceService] Eliminando tag: ${mqttKey}`);
    return await api.delete(`/devices/${deviceId}/tags/${mqttKey}?path=${path}`);
  }
};