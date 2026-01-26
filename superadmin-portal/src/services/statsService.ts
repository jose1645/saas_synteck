import api from '../api';

export interface DeviceSummary {
  id: number;
  name: string;
  protocol: string;
  is_active: boolean;
  created_at: string;
}

export interface DashboardData {
  partners_count: number;
  clients_count: number;
  devices_online: number;
  recent_devices: DeviceSummary[];
}

export const statsService = {
  getSummary: async (): Promise<DashboardData> => {
    const response = await api.get('/stats/summary');
    return response.data;
  }
};