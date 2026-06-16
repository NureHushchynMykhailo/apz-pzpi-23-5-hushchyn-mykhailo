import axiosClient from './axiosClient';

export interface SensorReading {
  sensorId: string;
  type: string;
  parameterName: string;
  unit: string;
  value: number;
  measuredAt: string;
}

export const telemetryApi = {
  // Виклик роуту для отримання останніх даних з усіх сенсорів станції
  getLatestByStation: async (stationId: string): Promise<SensorReading[]> => {
    const response = await axiosClient.get(`/telemetry/station/${stationId}/latest`);
    return response.data;
  },
};