import api from '../api';

export interface Client {
  id: number;
  name: string;
  location: string;
  is_active: boolean;
  partner_id: number;
  created_at: string;
}

export interface ClientCreate {
  name: string;
  location: string;
}

// --- Nuevas Interfaces para Usuarios ---
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  client_id: number;
  created_at: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password?: string; // Opcional si el admin la genera
}

export const clientService = {
  getAll: async (): Promise<Client[]> => {
    try {
      const response = await api.get<Client[]>('/clients/');
      return response.data;
    } catch (error: any) {
      console.error("❌ Error en GET /clients/:", error.response?.data);
      throw error;
    }
  },

  create: async (data: ClientCreate): Promise<Client> => {
    try {
      const response = await api.post<Client>('/clients/', data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error en POST /clients/:", error.response?.data);
      throw error;
    }
  },

  // --- NUEVOS MÉTODOS PARA GESTIÓN DE USUARIOS ---

  /**
   * Obtiene la lista de usuarios/operadores vinculados a un cliente específico
   */
  getUsers: async (clientId: number): Promise<User[]> => {
    console.log(`📡 Intentando GET /clients/${clientId}/users`);
    try {
      const response = await api.get<User[]>(`/clients/${clientId}/users`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error obteniendo usuarios del cliente ${clientId}:`, error.response?.data);
      throw error;
    }
  },

  /**
   * Crea un nuevo acceso (usuario) para el portal de un cliente
   */
  createUser: async (clientId: number, userData: UserCreate): Promise<User> => {
    console.log(`🚀 Intentando POST /clients/${clientId}/users con data:`, userData);
    try {
      const response = await api.post<User>(`/clients/${clientId}/users`, userData);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error creando usuario de cliente:", error.response?.data);
      throw error;
    }
  },

  toggleStatus: async (id: number): Promise<Client> => {
    const response = await api.patch<Client>(`/clients/${id}/toggle`);
    return response.data;
  },

  // --- GESTIÓN DE MÓDULOS (Client Modules) ---
  updateModule: async (clientId: number, moduleCode: string, isActive: boolean): Promise<any> => {
    console.log(`📡 [ClientService] Actualizando módulo ${moduleCode} para Cliente ${clientId} a ${isActive}`);
    const payload = {
      module_code: moduleCode,
      is_active: isActive,
      config: {}
    };
    return await api.post(`/clients/${clientId}/modules`, payload);
  }
};