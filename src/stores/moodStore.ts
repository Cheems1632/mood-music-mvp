import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MoodType } from '@/types';

export interface CustomMood {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

interface MoodStore {
  currentMood: MoodType | string;
  customMoods: CustomMood[];
  setMood: (mood: MoodType | string) => void;
  addCustomMood: (mood: Omit<CustomMood, 'id'>) => void;
  removeCustomMood: (id: string) => void;
}

const STORAGE_KEY = 'mood-music-mood-store';

const loadFromStorage = (): Partial<MoodStore> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load mood store from localStorage:', e);
  }
  return {};
};

const savedData = loadFromStorage();

export const useMoodStore = create<MoodStore>()(
  persist(
    (set) => ({
      currentMood: savedData.currentMood || 'happy',
      customMoods: savedData.customMoods || [],
      setMood: (mood) => set({ currentMood: mood }),
      addCustomMood: (mood) => set((state) => ({
        customMoods: [...state.customMoods, { ...mood, id: Date.now().toString() }],
      })),
      removeCustomMood: (id) => set((state) => ({
        customMoods: state.customMoods.filter(m => m.id !== id),
      })),
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
