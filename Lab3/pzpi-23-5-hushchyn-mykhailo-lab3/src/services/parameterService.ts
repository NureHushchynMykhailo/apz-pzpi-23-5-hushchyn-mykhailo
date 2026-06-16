import api from '../config/axios';

export interface Parameter {
  id: string;
  code: string;
  name: string;
  unit: string;
}

export const parameterService = {
  // Отримати всі доступні параметри (pH, Температура, тощо)
  getAll: async (): Promise<Parameter[]> => {
    const response = await api.get<Parameter[]>('/parameters');
    return response.data;
  }
};