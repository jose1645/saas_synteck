import api from './api';

export const historyService = {
    getHistory: async (deviceUid, timeRange, start = null, end = null) => {
        const params = { time_range: timeRange };
        if (start) params.start = (start instanceof Date ? start : new Date(start)).toISOString();
        if (end) params.end = (end instanceof Date ? end : new Date(end)).toISOString();

        const response = await api.get(`/historical/${deviceUid}`, { params });
        return response.data;
    },

    downloadHistory: async (deviceUid, timeRange, start = null, end = null, format = 'xlsx') => {
        const params = { time_range: timeRange, format: format };
        if (start) params.start = (start instanceof Date ? start : new Date(start)).toISOString();
        if (end) params.end = (end instanceof Date ? end : new Date(end)).toISOString();

        const response = await api.get(`/historical/${deviceUid}`, {
            params,
            responseType: 'blob'
        });

        const extension = format === 'xlsx' ? 'xlsx' : 'csv';
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `history_${deviceUid}_${timeRange}.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
};
