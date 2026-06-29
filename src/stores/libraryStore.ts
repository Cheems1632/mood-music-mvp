import { create } from 'zustand';
import { Song, SongMood } from '@/types';
import { getAllSongs, addSong, updateSong, deleteSong } from '@/db';

interface LibraryStore {
  songs: Song[];
  isLoading: boolean;
  loadSongs: () => Promise<void>;
  addNewSong: (song: Song) => Promise<void>;
  updateSongPlayCount: (songId: string) => Promise<void>;
  updateSongSkipCount: (songId: string) => Promise<void>;
  updateSongMood: (songId: string, mood: SongMood) => Promise<void>;
  removeSong: (songId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  isLoading: false,
  
  loadSongs: async () => {
    set({ isLoading: true });
    const songs = await getAllSongs();
    
    // 为有封面数据的歌曲重新生成 Blob URL
    const songsWithCovers = songs.map(song => {
      if (song.coverData && song.coverMimeType) {
        try {
          const arrayBuffer = song.coverData.buffer.slice(
            song.coverData.byteOffset, 
            song.coverData.byteOffset + song.coverData.byteLength
          ) as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: song.coverMimeType });
          const coverUrl = URL.createObjectURL(blob);
          return { ...song, cover: coverUrl };
        } catch (error) {
          console.error('Failed to regenerate cover URL:', error);
          return song;
        }
      }
      return song;
    });
    
    set({ songs: songsWithCovers, isLoading: false });
  },
  
  addNewSong: async (song) => {
    await addSong(song);
    const { songs } = get();
    set({ songs: [...songs, song] });
  },
  
  updateSongPlayCount: async (songId) => {
    const { songs } = get();
    const songIndex = songs.findIndex(s => s.id === songId);
    if (songIndex === -1) return;
    
    const updatedSong = { ...songs[songIndex], playCount: songs[songIndex].playCount + 1 };
    await updateSong(updatedSong);
    
    const newSongs = [...songs];
    newSongs[songIndex] = updatedSong;
    set({ songs: newSongs });
  },
  
  updateSongSkipCount: async (songId) => {
    const { songs } = get();
    const songIndex = songs.findIndex(s => s.id === songId);
    if (songIndex === -1) return;
    
    const updatedSong = { ...songs[songIndex], skipCount: songs[songIndex].skipCount + 1 };
    await updateSong(updatedSong);
    
    const newSongs = [...songs];
    newSongs[songIndex] = updatedSong;
    set({ songs: newSongs });
  },
  
  updateSongMood: async (songId, mood) => {
    const { songs } = get();
    const songIndex = songs.findIndex(s => s.id === songId);
    if (songIndex === -1) return;
    
    const updatedSong = { ...songs[songIndex], mood };
    await updateSong(updatedSong);
    
    const newSongs = [...songs];
    newSongs[songIndex] = updatedSong;
    set({ songs: newSongs });
  },
  
  removeSong: async (songId) => {
    await deleteSong(songId);
    const { songs } = get();
    set({ songs: songs.filter(s => s.id !== songId) });
  },
}));
