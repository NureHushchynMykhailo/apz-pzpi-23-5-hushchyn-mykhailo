import api from '../config/axios';

export interface WqiParameter {
  type: string;
  value: number;
  qi: number;
  weight: number;
}

export interface WqiResponse {
  status: string;
  wqi: number;
  category: string;
  description: string;
  parametersUsed: WqiParameter[];
}

export const wqiService = {
  /**
   * Отримати розрахований Індекс Якості Води (WQI) для станції
   */
  getForStation: async (stationId: string): Promise<WqiResponse> => {
    const response = await api.get<WqiResponse>(`/wqi/station/${stationId}`);
    return response.data;
  }
};