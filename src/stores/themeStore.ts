import { create } from 'zustand';

export type ThemeType = 'dark' | 'light';

interface ThemeStore {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',
  
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'dark' ? 'light' : 'dark',
  })),
  
  setTheme: (theme) => set({ theme }),
}));
