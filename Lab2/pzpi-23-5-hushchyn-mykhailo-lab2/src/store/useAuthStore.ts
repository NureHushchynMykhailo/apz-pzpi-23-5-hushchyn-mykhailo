import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { authApi } from '../api/authApi';

interface AuthState {
  token: string | null;
  user: any | null; // Тут можна типізувати роль, id тощо
  isLoading: boolean; // Стан перевірки токена при запуску
  isLoggingIn: boolean; // Стан процесу логіну (для спінера на кнопці)
  error: string | null;
  
  // Дії (Actions)
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true, // При старті додатку спочатку перевіряємо сховище
  isLoggingIn: false,
  error: null,

  login: async (email, password) => {
    set({ isLoggingIn: true, error: null });
    try {
      // Робимо запит на сервер
      const data = await authApi.login(email, password);
      
      // Зберігаємо токен у захищене сховище
      // Keychain використовує username та password. Ми зберігаємо 'jwt' як username, а сам токен як password
      await Keychain.setGenericPassword('jwt', data.token);
      
      set({ token: data.token, user: data.user, isLoggingIn: false });
    } catch (error: any) {
      // Якщо помилка (наприклад 401), записуємо її в стейт
      set({ error: error?.response?.data?.message || 'Login failed', isLoggingIn: false });
      throw error;
    }
  },

  logout: async () => {
    // Видаляємо токен зі сховища
    await Keychain.resetGenericPassword();
    set({ token: null, user: null });
  },

  checkAuth: async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password) {
        // Опціонально: тут можна викликати authApi.getProfile() щоб впевнитись, що токен не прострочений
        set({ token: credentials.password, isLoading: false });
      } else {
        set({ token: null, isLoading: false });
      }
    } catch (error) {
      set({ token: null, isLoading: false });
    }
  }
}));