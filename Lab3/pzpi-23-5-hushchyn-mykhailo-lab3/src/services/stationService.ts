import api from '../config/axios';
import type { Station, CreateStationDTO } from '../types/station';
import type { User } from './userService';

export const stationService = {
  // Для адміністраторів та менеджерів (всі станції)
  getAll: async (): Promise<Station[]> => {
    const response = await api.get<Station[]>('/stations');
    return response.data;
  },

  // Для звичайних користувачів (тільки їхні станції)
  getMy: async (): Promise<Station[]> => {
    const response = await api.get<Station[]>('/stations/my');
    return response.data;
  },

  // Отримати конкретну станцію за ID
  getById: async (id: string): Promise<Station> => {
    const response = await api.get<Station>(`/stations/${id}`);
    return response.data;
  },

  // Створити нову станцію
  create: async (data: CreateStationDTO): Promise<Station> => {
    const response = await api.post<Station>('/stations', data);
    return response.data;
  },

  // Оновити дані станції
  update: async (id: string, data: Partial<CreateStationDTO>): Promise<Station> => {
    const response = await api.patch<Station>(`/stations/${id}`, data);
    return response.data;
  },

  // Видалити станцію
  delete: async (id: string): Promise<void> => {
    await api.delete(`/stations/${id}`);
  },

  getAssignedUsers: async (stationId: string): Promise<User[]> => {
    const response = await api.get<User[]>(`/stations/${stationId}/users`);
    return response.data;
  },

  assignUser: async (stationId: string, userId: string): Promise<void> => {
    await api.post('/stations/assign', { stationId, userId });
  },

  unassignUser: async (stationId: string, userId: string): Promise<void> => {
    await api.post('/stations/unassign', { stationId, userId });
  },

  getStations: async (): Promise<Station[]> => {
    const response = await api.get<Station[]>('/stations');
    return response.data;
  }



};