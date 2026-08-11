import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create<{ theme: 'light'|'dark'; toggle: () => void }>()(
  persist(set => ({
    theme: (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') as any,
    toggle: () => set(s => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      return { theme: next };
    })
  }), { name: 'printflow-theme' })
);