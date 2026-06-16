import api from '../config/axios';

export type AlertType = 'warning' | 'critical';
export type TargetRole = 'technician' | 'manager' | 'admin';

export interface Alert {
  id: string;
  stationId: string;
  stationName?: string; // З'єднується на бекенді або фронтенді
  type: AlertType;
  targetRole: TargetRole;
  message: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateAlertDTO {
  stationId: string;
  type: AlertType;
  targetRole: TargetRole;
  message: string;
}

export const alertService = {
  // GET /alerts/active - Отримати всі активні тривоги
  getActiveAlerts: async (): Promise<Alert[]> => {
    const response = await api.get<Alert[]>('/alerts/active');
    return response.data;
  },

  // GET /alerts/station/{stationId} - Отримати історію тривог станції
  getStationAlerts: async (stationId: string): Promise<Alert[]> => {
    const response = await api.get<Alert[]>(`/alerts/station/${stationId}`);
    return response.data;
  },

  // POST /alerts - Створити нову тривогу (зазвичай робить система, але роут є)
  createAlert: async (data: CreateAlertDTO): Promise<Alert> => {
    const response = await api.post<Alert>('/alerts', data);
    return response.data;
  },

  // PATCH /alerts/{id}/resolve - Позначити як вирішену
  resolveAlert: async (id: string): Promise<Alert> => {
    const response = await api.patch<Alert>(`/alerts/${id}/resolve`);
    return response.data;
  },

  // DELETE /alerts/{id} - Видалити (Тільки Admin)
  deleteAlert: async (id: string): Promise<void> => {
    await api.delete(`/alerts/${id}`);
  },

    getByStation: async (stationId: string): Promise<Alert[]> => {
    const response = await api.get<Alert[]>(`/alerts/station/${stationId}`);
    return response.data;
  },
  getAll: async (): Promise<Alert[]> => {
    const response = await api.get<Alert[]>('/alerts');
    return response.data;
  }
};