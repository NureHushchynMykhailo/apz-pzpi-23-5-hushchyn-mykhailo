import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Ролі, які відповідають вашому бекенду (з authRoutes.ts)
export type UserRole = 'admin' | 'manager' | 'technician' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Початковий стан — порожній, жодних фейкових даних
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // Ключ, під яким дані зберігатимуться у localStorage
    }
  )
);