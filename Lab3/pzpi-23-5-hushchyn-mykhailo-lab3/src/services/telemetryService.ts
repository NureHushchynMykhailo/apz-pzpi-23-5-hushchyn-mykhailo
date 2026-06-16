import api from '../config/axios';

export interface LatestTelemetry {
  sensorId: string;
  type: string;
  parameterName: string;
  unit: string;
  value: number;
  measuredAt: string;
}

// Тип для логу телеметрії
export interface TelemetryLog {
  id: string;
  sensorId: string;
  value: number;
  measuredAt: string;
}

export const telemetryService = {
  getStationSnapshot: async (stationId: string): Promise<LatestTelemetry[]> => {
    const response = await api.get<LatestTelemetry[]>(`/telemetry/station/${stationId}/latest`);
    return response.data;
  },

  // НОВЕ: Отримання історії показників конкретного сенсора
  getSensorHistory: async (sensorId: string): Promise<TelemetryLog[]> => {
    const response = await api.get<TelemetryLog[]>(`/telemetry/sensor/${sensorId}`);
    return response.data;
  },

  getLatestByStation: async (stationId: string): Promise<LatestTelemetry[]> => {
    const response = await api.get(`/telemetry/station/${stationId}/latest`);
    return response.data;
  }
};