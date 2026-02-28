import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  userId: string;
  role: 'student' | 'alumni' | 'admin';
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'decp-auth' }
  )
);
