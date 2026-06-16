import api from '../config/axios';

// Згідно з userRoutes.ts
export type UserRole = 'admin' | 'manager' | 'technician' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string; // Замінено firstName/lastName згідно з бекендом
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDTO {
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
}

export interface UpdateUserDTO {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/profile');
    return response.data;
  },

  createUser: async (data: CreateUserDTO): Promise<User> => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  // Згідно з userRoutes.ts використовується PUT для оновлення
  updateUser: async (id: string, data: UpdateUserDTO): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};