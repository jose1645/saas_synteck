import api from '../api';

// 1. Definimos la interfaz del usuario vinculado
export interface PartnerUser {
  id: number;
  email: string;
  full_name: string;
  is_verified: boolean; // <--- Aquí está el parámetro que faltaba
  partner_id: number;
  created_at: string;
}

// 2. Actualizamos la definición del Socio
export interface Partner {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  extra_data: {
    country?: string;
    tax_id?: string;
    currency?: string;
    payment_method?: string;
    notes?: string;
    commercial_conditions?: string;
  };
  // 3. Añadimos el usuario como opcional (porque en el JSON viene anidado)
  user?: PartnerUser | null; 
}

export interface PartnerCreate {
  name: string;
  email: string;
  extra_data: Record<string, any>;
}

export const partnerService = {
  /**
   * Obtiene la lista completa de socios (GET /partners/)
   */
  getAll: async (): Promise<Partner[]> => {
    const response = await api.get<Partner[]>('/partners/');
    return response.data;
  },

  /**
   * Obtiene el detalle de un socio específico
   */
  getById: async (id: number): Promise<Partner> => {
    const response = await api.get<Partner>(`/partners/${id}`);
    return response.data;
  },

  /**
   * Crea un nuevo socio enviando la data flexible
   */
  create: async (data: PartnerCreate): Promise<Partner> => {
    const response = await api.post<Partner>('/partners/', data);
    return response.data;
  },

  /**
   * Actualiza datos de un socio existente (PUT)
   */
  update: async (id: number, data: Partial<PartnerCreate>): Promise<Partner> => {
    const response = await api.put<Partner>(`/partners/${id}`, data);
    return response.data;
  },

  /**
   * Borrado físico del socio
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/partners/${id}`);
  },

  /**
   * Envía la invitación por correo
   */
  sendInvitation: async (partnerId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/partners/${partnerId}/invite`);
    return response.data;
  }
};