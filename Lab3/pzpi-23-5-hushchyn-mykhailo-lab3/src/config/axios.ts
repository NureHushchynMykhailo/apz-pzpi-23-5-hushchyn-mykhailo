import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Оновлено: додано /api/v1 згідно з вашим бекендом
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для додавання токену
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor для помилок (наприклад, 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized access - logging out');
      useAuthStore.getState().logout();
      window.location.href = '/login'; // Жорсткий редирект для очищення стану
    }
    return Promise.reject(error);
  }
);

export default api;