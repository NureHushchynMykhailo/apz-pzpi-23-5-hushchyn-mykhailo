import axiosClient from './axiosClient';

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'offline' | 'maintenance';
}

export const stationsApi = {
  // Отримати всі станції (для мапи/списку)
  getAll: async (): Promise<Station[]> => {
    const response = await axiosClient.get('/stations');
    return response.data;
  },

  // Отримати станції поточного користувача
  getMyStations: async (): Promise<Station[]> => {
    const response = await axiosClient.get('/stations/my');
    return response.data;
  },

  // Деталі конкретної станції
  getById: async (id: string): Promise<Station> => {
    const response = await axiosClient.get(`/stations/${id}`);
    return response.data;
  },

  // Отримати список підписок (на які станції юзер підписаний)
  getSubscriptions: async (): Promise<Station[]> => {
    const response = await axiosClient.get('/stations/subscriptions');
    return response.data;
  },

  // Підписатися
  subscribe: async (id: string): Promise<any> => {
    const response = await axiosClient.post(`/stations/${id}/subscribe`);
    return response.data;
  },

  // Відписатися
  unsubscribe: async (id: string): Promise<any> => {
    const response = await axiosClient.delete(`/stations/${id}/unsubscribe`);
    return response.data;
  }
};