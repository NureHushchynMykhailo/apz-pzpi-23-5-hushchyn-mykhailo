import axios from 'axios';
import * as Keychain from 'react-native-keychain';

// Базова URL-адреса твого бекенду. 
// 10.0.2.2 - це localhost комп'ютера з точки зору Android емулятора.
const BASE_URL = 'http://10.0.2.2:3000/api/v1'; 

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Таймаут 10 секунд
});

// Інтерцептор запитів (відпрацьовує ПЕРЕД кожним запитом на сервер)
axiosClient.interceptors.request.use(
  async (config) => {
    // Намагаємося дістати токен із захищеного сховища
    const credentials = await Keychain.getGenericPassword();
    
    if (credentials && credentials.password) {
      // Якщо токен є, додаємо його в заголовок Authorization
      config.headers.Authorization = `Bearer ${credentials.password}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;