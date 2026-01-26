import api from './api';

export const dashboardService = {
  /**
   * Obtiene los tags técnicos (telemetría) configurados para un dispositivo.
   * Este endpoint valida la pertenencia al cliente (Multitenancy) en el backend.
   * @param {number} deviceId - ID único del dispositivo en la base de datos.
   */
  getDeviceLiveTags: async (deviceId) => {
    console.log(`📊 [dashboardService] Cargando configuración de tags para equipo: ${deviceId}`);
    return await api.get(`/dashboards/device/${deviceId}/tags`);
  },

  /**
   * Obtiene datos históricos para la gráfica de tendencias (Trend History).
   * @param {number} deviceId - ID del dispositivo.
   * @param {string} range - Rango de tiempo (ej: '1h', '24h', '7d').
   * @param {Array} keys - Lista de mqtt_keys a consultar.
   */
  getTrendHistory: async (deviceId, range = '24h', keys = []) => {
    console.log(`📈 [dashboardService] Solicitando histórico (${range}) para keys:`, keys);
    return await api.post(`/dashboards/device/${deviceId}/history`, {
      range,
      keys
    });
  },

  /**
   * Obtiene un resumen de métricas en tiempo real (KPIs) calculados.
   */
  getLiveKpis: async (deviceId) => {
    return await api.get(`/dashboards/device/${deviceId}/kpis`);
  }
};