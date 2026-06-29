import { create } from 'zustand';
import { Song } from '@/types';

export type PlayMode = 'order' | 'loop' | 'repeat' | 'shuffle';

interface PlayerStore {
  currentSong: Song | null;
  playlist: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  previousVolume: number;
  playMode: PlayMode;
  setCurrentSong: (song: Song | null) => void;
  setPlaylist: (playlist: Song[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  togglePlayMode: () => void;
  setPlayMode: (mode: PlayMode) => void;
  playNext: () => void;
  playPrev: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  playlist: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.5,
  isMuted: false,
  previousVolume: 0.5,
  playMode: 'order',
  
  setCurrentSong: (song) => set({ currentSong: song }),
  setPlaylist: (playlist) => set({ playlist }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => {
    const { isMuted, volume, previousVolume } = get();
    if (isMuted) {
      set({ isMuted: false, volume: previousVolume });
    } else {
      set({ isMuted: true, previousVolume: volume, volume: 0 });
    }
  },
  
  togglePlayMode: () => {
    const { playMode } = get();
    const modes: PlayMode[] = ['order', 'loop', 'repeat', 'shuffle'];
    const currentIndex = modes.indexOf(playMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    set({ playMode: modes[nextIndex] });
  },
  
  setPlayMode: (mode) => set({ playMode: mode }),
  
  playNext: () => {
    const { playlist, currentSong, playMode } = get();
    if (!currentSong || playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    let nextIndex: number;
    
    if (playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    set({ currentSong: playlist[nextIndex] });
  },
  
  playPrev: () => {
    const { playlist, currentSong, playMode } = get();
    if (!currentSong || playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    let prevIndex: number;
    
    if (playMode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    }
    
    set({ currentSong: playlist[prevIndex] });
  },
}));
