import { create } from 'zustand';
import { stationService } from '../services/stationService';
import type { Station, CreateStationDTO } from '../types/station';

interface StationState {
  stations: Station[];
  isLoading: boolean;
  error: string | null;
  
  // Методи
  fetchStations: (isAdmin?: boolean) => Promise<void>;
  createStation: (data: CreateStationDTO) => Promise<void>;
  updateStation: (id: string, data: Partial<CreateStationDTO>) => Promise<void>;
  deleteStation: (id: string) => Promise<void>;
}

export const useStationStore = create<StationState>((set) => ({
  stations: [],
  isLoading: false,
  error: null,

  // Завантаження списку станцій
  fetchStations: async (isAdmin = false) => {
    set({ isLoading: true, error: null });
    try {
      // Якщо адміністратор/менеджер - отримуємо всі станції, інакше - тільки призначені
      const data = isAdmin ? await stationService.getAll() : await stationService.getMy();
      set({ stations: data, isLoading: false });
    } catch (error: any) {
      console.error('Помилка завантаження станцій:', error);
      set({ 
        error: error.response?.data?.message || 'Не вдалося завантажити список станцій', 
        isLoading: false 
      });
    }
  },

  // Створення нової станції
  createStation: async (data: CreateStationDTO) => {
    set({ isLoading: true, error: null });
    try {
      const newStation = await stationService.create(data);
      set((state) => ({ 
        stations: [...state.stations, newStation], 
        isLoading: false 
      }));
    } catch (error: any) {
      console.error('Помилка створення станції:', error);
      set({ 
        error: error.response?.data?.message || 'Не вдалося створити станцію', 
        isLoading: false 
      });
      throw error; // Прокидаємо помилку далі, щоб обробити її в компоненті
    }
  },

  // Оновлення станції
  updateStation: async (id: string, data: Partial<CreateStationDTO>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStation = await stationService.update(id, data);
      set((state) => ({
        // Оновлюємо конкретну станцію в масиві
        stations: state.stations.map((station) => 
          station.id === id ? { ...station, ...updatedStation } : station
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Помилка оновлення станції:', error);
      set({ 
        error: error.response?.data?.message || 'Не вдалося оновити станцію', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Видалення станції
  deleteStation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await stationService.delete(id);
      set((state) => ({
        // Видаляємо станцію з масиву
        stations: state.stations.filter((station) => station.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Помилка видалення станції:', error);
      set({ 
        error: error.response?.data?.message || 'Не вдалося видалити станцію', 
        isLoading: false 
      });
      throw error;
    }
  },
}));