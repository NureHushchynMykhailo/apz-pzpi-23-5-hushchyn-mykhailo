import { create } from 'zustand';
import i18n from 'i18next'; // Використовуємо глобальний інстанс i18next
import { userService, type User, type CreateUserDTO, type UpdateUserDTO } from '../services/userService';

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (data: CreateUserDTO) => Promise<void>;
  updateUser: (id: string, data: UpdateUserDTO) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await userService.getUsers();
      set({ users, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || i18n.t('users.errors.fetchFailed', 'Не вдалося завантажити користувачів'), 
        isLoading: false 
      });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newUser = await userService.createUser(data);
      set(state => ({ users: [...state.users, newUser], isLoading: false }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || i18n.t('users.errors.createFailed', 'Не вдалося створити користувача'), 
        isLoading: false 
      });
      throw error;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await userService.updateUser(id, data);
      set(state => ({ 
        users: state.users.map(u => (u.id === id ? { ...u, ...data, ...(updatedUser || {}) } : u)), 
        isLoading: false 
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || i18n.t('users.errors.updateFailed', 'Не вдалося оновити користувача'), 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await userService.deleteUser(id);
      set(state => ({ 
        users: state.users.filter(u => u.id !== id), 
        isLoading: false 
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || i18n.t('users.errors.deleteFailed', 'Не вдалося видалити користувача'), 
        isLoading: false 
      });
      throw error;
    }
  }
}));