import api from '../config/axios';

export interface SensorStats {
  sensorId: string;
  parameterName?: string;
  unit?: string;
  minValue: number;
  maxValue: number;
  avgValue: number;
}

export interface AlertStats {
  type: string;
  status: string;
  count: number;
}

export interface ActuatorStats {
  controllerId: string;
  name?: string;
  type?: string;
  avgLoad: number;
  maxLoad: number;
  totalLogs: number;
}

// Загальний інтерфейс для відповідей, загорнутих у { period, data }
export interface StatsResponse<T> {
  period?: {
    from: string;
    to: string;
  };
  data: T[];
}

export const statisticsService = {
  getSensorStats: async (stationId: string, from?: string, to?: string): Promise<SensorStats[]> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await api.get<StatsResponse<SensorStats> | SensorStats[]>(`/statistics/station/${stationId}/sensors`, { params });
    // Розгортаємо data, якщо бекенд повертає об'єкт з period та data
    return (response.data as StatsResponse<SensorStats>).data || response.data;
  },

  getAlertStats: async (stationId: string, from?: string, to?: string): Promise<AlertStats[]> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await api.get<StatsResponse<AlertStats> | AlertStats[]>(`/statistics/station/${stationId}/alerts`, { params });
    return (response.data as StatsResponse<AlertStats>).data || response.data;
  },

  getActuatorStats: async (stationId: string, from?: string, to?: string): Promise<ActuatorStats[]> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await api.get<StatsResponse<ActuatorStats> | ActuatorStats[]>(`/statistics/station/${stationId}/actuators`, { params });
    return (response.data as StatsResponse<ActuatorStats>).data || response.data;
  }
};