import api from "./api";

export const alertService = {
    /**
     * Obtiene las alertas activas (ACTIVE y ACKNOWLEDGED)
     */
    getActiveAlerts: async () => {
        const response = await api.get('/alerts/active');
        return response.data;
    },

    /**
     * Obtiene el historial de alertas
     */
    getAlertHistory: async (limit = 50) => {
        const response = await api.get(`/alerts/history?limit=${limit}`);
        return response.data;
    },

    /**
     * Reconoce una alerta (ACK)
     * @param {number} alertId 
     */
    acknowledgeAlert: async (alertId) => {
        const response = await api.post('/alerts/ack', { alert_id: alertId });
        return response.data;
    },

    /**
     * Obtiene la configuración de umbrales/alertas por variable
     */
    getAlertConfig: async () => {
        const response = await api.get('/alerts/config');
        return response.data;
    }
};
