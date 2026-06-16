import api from '../config/axios';

export interface Subscription {
  id: string; // Це ID станції в даному контексті (залежить від того, що повертає бекенд)
  name: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  assignedAt: string; // Коли підписався
}

export const subscriptionService = {
  /**
   * Отримати список підписок користувача
   * Шлях: GET /stations/subscriptions
   */
  getSubscriptions: async (): Promise<any[]> => {
    const response = await api.get('/stations/subscriptions');
    // Якщо бекенд повертає { data: [...] } або { subscriptions: [...] }, розгортаємо:
    if (response.data && Array.isArray(response.data.data)) return response.data.data;
    if (response.data && Array.isArray(response.data.subscriptions)) return response.data.subscriptions;
    // Інакше повертаємо як є (якщо це одразу масив)
    return response.data || [];
  },

  /**
   * Підписатися на станцію
   * Шлях: POST /stations/{id}/subscribe
   */
  subscribe: async (stationId: string): Promise<any> => {
    const response = await api.post(`/stations/${stationId}/subscribe`);
    return response.data;
  },

  /**
   * Відписатися від станції
   * Шлях: DELETE /stations/{id}/unsubscribe
   */
  unsubscribe: async (stationId: string): Promise<void> => {
    await api.delete(`/stations/${stationId}/unsubscribe`);
  }
};