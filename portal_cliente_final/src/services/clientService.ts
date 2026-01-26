import api from "./api";

export const clientService = {
  getDetails: async (clientId: number) => {
    // Este endpoint ya lo tenemos en el backend: GET /clients/{id}
    const response = await api.get(`/clients/${clientId}`);
    return response.data;
  }
};