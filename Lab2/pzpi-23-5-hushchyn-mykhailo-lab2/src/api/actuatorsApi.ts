import axiosClient from './axiosClient';

export interface Actuator {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export const actuatorsApi = {
  // Отримати всі актуатори для конкретної станції
  getByStation: async (stationId: string): Promise<Actuator[]> => {
    const response = await axiosClient.get(`/actuators/station/${stationId}`);
    return response.data;
  },

  // Оновити стан (увімкнути/вимкнути)
  toggleActuator: async (id: string, isActive: boolean): Promise<any> => {
    const response = await axiosClient.patch(`/actuators/${id}`, { isActive });
    return response.data;
  }
};