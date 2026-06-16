import axiosClient from './axiosClient';

export interface AlertItem {
  id: string;
  stationId: string;
  type: 'warning' | 'critical';
  targetRole: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

export const alertsApi = {
  // Отримати всі активні алерти
  getActive: async (): Promise<AlertItem[]> => {
    const response = await axiosClient.get('/alerts/active');
    return response.data;
  },

  // Позначити алерт як вирішений (доступно admin, manager, technician)
  resolve: async (id: string): Promise<any> => {
    const response = await axiosClient.patch(`/alerts/${id}/resolve`);
    return response.data;
  }
};