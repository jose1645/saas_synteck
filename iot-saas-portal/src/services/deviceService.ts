import api from '../api';

export const deviceService = {
  getAllDevices: async () => {
    console.log("📡 [DEBUG] Solicitando listado global de dispositivos...");
    return await api.get('/devices/');
  },

  getDevicesByClient: async (clientId) => {
    return await api.get(`/devices/client/${clientId}`);
  },

  getProvisionStatus: async (deviceId) => {
    console.log(`🔍 [DEBUG] Verificando status de aprovisionamiento para dispositivo: ${deviceId}`);
    return await api.get(`/devices/${deviceId}/provision-status`);
  },

  provisionDevice: async (deviceId) => {
    console.log(`🚀 [DEBUG] Iniciando POST de aprovisionamiento para ID: ${deviceId}`);
    return await api.post(`/devices/${deviceId}/provision`, {});
  },

  // --- NUEVAS FUNCIONES PARA MAPEO DE VARIABLES ---

  /**
   * Obtiene todos los mapeos (tags) ya registrados en la DB para un equipo.
   * Alimenta la tabla "Base de Datos" del frontend.
   */
  getDeviceTags: async (deviceId) => {
    console.log(`📥 [DEBUG] Cargando tags registrados para equipo: ${deviceId}`);
    return await api.get(`/devices/${deviceId}/tags`);
  },

  /**
   * Registra o actualiza un tag individual.
   * Envía el JSON con path, key, alias, unidad y rangos.
   */
  registerTag: async (tagPayload) => {
    console.log(`💾 [DEBUG] Persistiendo variable: ${tagPayload.mqtt_key}`);
    // El backend espera el esquema TagRegistration:
    // { device_uid, path, mqtt_key, display_name, data_type, unit, min_value, max_value, ... }
    return await api.post('/devices/tags/register', tagPayload);
  },

  deleteTag: async (deviceId, mqttKey, path) => {
    console.log(`🗑️ [DEBUG] Solicitando eliminación de: ${mqttKey} en ${path}`);
    // Pasamos el path como query string para evitar problemas con las barras '/' en la URL
    return await api.delete(`/devices/${deviceId}/tags/${mqttKey}?path=${path}`);
  },

  updateDevice: async (deviceId, data) => {
    return await api.put(`/devices/${deviceId}`, data);
  }
};