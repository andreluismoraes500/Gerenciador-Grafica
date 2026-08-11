import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User { id: string; name: string; email: string; role: string; avatar?: string; }

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null, token: null, refreshToken: null,
      setAuth: (user, token, refreshToken) => set({ user, token, refreshToken }),
      setToken: token => set({ token }),
      logout: () => set({ user: null, token: null, refreshToken: null })
    }),
    { name: 'printflow-auth', storage: createJSONStorage(() => localStorage) }
  )
);
