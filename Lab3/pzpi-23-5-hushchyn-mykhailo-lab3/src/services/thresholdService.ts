import api from '../config/axios';

export interface Threshold {
  id: string;
  stationId: string;
  parameterId: string;
  minWarning: number | null;
  maxWarning: number | null;
  minCritical: number | null;
  maxCritical: number | null;
}

export interface CreateThresholdDTO {
  stationId: string;
  parameterId: string;
  minWarning?: number;
  maxWarning?: number;
  minCritical?: number;
  maxCritical?: number;
}

export interface UpdateThresholdDTO {
  minWarning?: number;
  maxWarning?: number;
  minCritical?: number;
  maxCritical?: number;
}

export const thresholdService = {
  getByStation: async (stationId: string): Promise<Threshold[]> => {
    const response = await api.get<Threshold[]>(`/thresholds/station/${stationId}`);
    return response.data;
  },

  create: async (data: CreateThresholdDTO): Promise<Threshold> => {
    const response = await api.post<Threshold>('/thresholds', data);
    return response.data;
  },

  update: async (id: string, data: UpdateThresholdDTO): Promise<Threshold> => {
    const response = await api.patch<Threshold>(`/thresholds/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/thresholds/${id}`);
  }
};