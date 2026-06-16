import axiosClient from './axiosClient';

// Інтерфейс для відповіді від бекенду (адаптуй під свій реальний бекенд)
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export const authApi = {
  // Виклик роуту /auth/login, який ми бачили у твоїх файлах
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Отримання профілю (для перевірки, чи токен ще дійсний)
  getProfile: async () => {
    const response = await axiosClient.get('/users/profile');
    return response.data;
  }
};