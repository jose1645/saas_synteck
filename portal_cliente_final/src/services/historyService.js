import api from './api';

export const historyService = {
    getHistory: async (deviceUid, timeRange, start = null, end = null) => {
        const params = { time_range: timeRange };
        if (start) params.start = start.toISOString();
        if (end) params.end = end.toISOString();

        const response = await api.get(`/historical/${deviceUid}`, { params });
        return response.data;
    },

    downloadHistory: async (deviceUid, timeRange, start = null, end = null) => {
        const params = { time_range: timeRange, format: 'csv' };
        if (start) params.start = start.toISOString();
        if (end) params.end = end.toISOString();

        const response = await api.get(`/historical/${deviceUid}`, {
            params,
            responseType: 'blob' // Importante para descarga de binarios
        });

        // Crear enlace invisible para descargar
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `history_${deviceUid}_${timeRange}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
};
