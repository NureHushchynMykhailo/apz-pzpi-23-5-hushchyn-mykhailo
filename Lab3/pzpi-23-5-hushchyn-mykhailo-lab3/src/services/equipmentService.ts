import api from '../config/axios';

// --- ІНТЕРФЕЙСИ СЕНСОРІВ ---
export interface Sensor {
  id: string;
  stationId: string;
  parameterId: string;
  name?: string;
  type: string;
  model: string | null;
  serialNumber: string | null;
  isActive: boolean;
}

export interface CreateSensorDTO {
  stationId: string;
  parameterId: string;
  name?: string;
  type: string;
  model?: string;
  serialNumber?: string;
  isActive?: boolean;
}

// --- ІНТЕРФЕЙСИ АКТУАТОРІВ ---
export interface ActuatorState {
  id: string;
  name: string;
  type: string;
  lastUpdate: string;
  activationPercentage: string; 
  statusMessage: string;
}

export interface Actuator {
  id: string;
  stationId: string;
  name: string;
  type: string;
  model: string | null;
  isActive: boolean;
}

export interface CreateActuatorDTO {
  stationId: string;
  name: string;
  type: 'aerator' | 'filter' | 'pump' | 'dispenser_acid' | 'dispenser_alkali' | 'dispenser_chlorine' | 'valve';
  isActive?: boolean;
}

export interface UpdateActuatorDTO {
  isActive?: boolean;
  activationPercentage?: number;
}

export interface ActuatorLog {
  id: string;
  controllerId: string;
  activationPercentage: string;
  statusMessage: string | null;
  timestamp: string;
}

// --- СЕРВІС ---
export const equipmentService = {
  // Сенсори
  getStationSensors: async (stationId: string): Promise<Sensor[]> => {
    const response = await api.get<Sensor[]>(`/sensors/station/${stationId}`);
    return response.data;
  },
  createSensor: async (data: CreateSensorDTO): Promise<Sensor> => {
    const response = await api.post<Sensor>('/sensors', data);
    return response.data;
  },
  updateSensor: async (id: string, data: Partial<Sensor>): Promise<Sensor> => {
    const response = await api.patch<Sensor>(`/sensors/${id}`, data);
    return response.data;
  },
  deleteSensor: async (id: string): Promise<void> => {
    await api.delete(`/sensors/${id}`);
  },

  // Актуатори
  getStationActuators: async (stationId: string): Promise<Actuator[]> => {
    const response = await api.get<Actuator[]>(`/actuators/station/${stationId}`);
    return response.data;
  },
  getActuatorsLiveState: async (stationId: string): Promise<ActuatorState[]> => {
    const response = await api.get<ActuatorState[]>(`/actuators/station/${stationId}/latest`);
    return response.data;
  },
  createActuator: async (data: CreateActuatorDTO): Promise<Actuator> => {
    const response = await api.post<Actuator>('/actuators', data);
    return response.data;
  },
  updateActuator: async (id: string, data: UpdateActuatorDTO): Promise<Actuator> => {
    const response = await api.patch<Actuator>(`/actuators/${id}`, data);
    return response.data;
  },
  deleteActuator: async (id: string): Promise<void> => {
    await api.delete(`/actuators/${id}`);
  },
  getActuatorHistory: async (id: string): Promise<ActuatorLog[]> => {
    const response = await api.get<ActuatorLog[]>(`/actuators/${id}/history`);
    return response.data;
  }
};