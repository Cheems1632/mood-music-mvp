import { Song, BehaviorLog } from '@/types';

// 内存存储作为备用方案
const memoryStore = {
  songs: new Map<string, Song>(),
  audioFiles: new Map<string, Uint8Array>(),
  behaviorLogs: new Map<string, BehaviorLog>(),
};

let useMemoryStore = false;
let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mood-music-app-v5', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audioFiles')) {
        db.createObjectStore('audioFiles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('behaviorLogs')) {
        const store = db.createObjectStore('behaviorLogs', { keyPath: 'id' });
        store.createIndex('songId', 'songId');
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = await openDB();
    useMemoryStore = false;
    return dbInstance;
  } catch (error) {
    console.error('IndexedDB init failed, switching to memory store:', error);
    useMemoryStore = true;
    throw error;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getAllSongs(): Promise<Song[]> {
  if (useMemoryStore) {
    return Array.from(memoryStore.songs.values());
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('getAllSongs failed:', error);
    return Array.from(memoryStore.songs.values());
  }
}

export async function getSongById(id: string): Promise<Song | undefined> {
  if (useMemoryStore) {
    return memoryStore.songs.get(id);
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('getSongById failed:', error);
    return memoryStore.songs.get(id);
  }
}

export async function addSong(song: Song): Promise<void> {
  if (useMemoryStore) {
    memoryStore.songs.set(song.id, song);
    return;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const request = store.put(song);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('addSong failed, using memory store:', error);
    useMemoryStore = true;
    memoryStore.songs.set(song.id, song);
  }
}

export async function updateSong(song: Song): Promise<void> {
  return addSong(song);
}

export async function deleteSong(id: string): Promise<void> {
  if (useMemoryStore) {
    memoryStore.songs.delete(id);
    memoryStore.audioFiles.delete(id);
    return;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['songs', 'audioFiles'], 'readwrite');
      tx.objectStore('songs').delete(id);
      tx.objectStore('audioFiles').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('deleteSong failed, using memory store:', error);
    useMemoryStore = true;
    memoryStore.songs.delete(id);
    memoryStore.audioFiles.delete(id);
  }
}

export async function saveAudioFile(id: string, data: Uint8Array): Promise<void> {
  if (useMemoryStore) {
    console.log('saveAudioFile: using memory store, size:', data.length);
    memoryStore.audioFiles.set(id, data);
    return;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audioFiles', 'readwrite');
      const store = tx.objectStore('audioFiles');
      const request = store.put({ id, data: data.buffer });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('saveAudioFile failed, using memory store:', error);
    useMemoryStore = true;
    memoryStore.audioFiles.set(id, data);
  }
}

export async function getAudioFile(id: string): Promise<Uint8Array | undefined> {
  if (useMemoryStore) {
    return memoryStore.audioFiles.get(id);
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audioFiles', 'readonly');
      const store = tx.objectStore('audioFiles');
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? new Uint8Array(result.data) : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('getAudioFile failed, using memory store:', error);
    return memoryStore.audioFiles.get(id);
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  if (useMemoryStore) {
    memoryStore.audioFiles.delete(id);
    return;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audioFiles', 'readwrite');
      const store = tx.objectStore('audioFiles');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('deleteAudioFile failed, using memory store:', error);
    useMemoryStore = true;
    memoryStore.audioFiles.delete(id);
  }
}

export async function addBehaviorLog(log: BehaviorLog): Promise<void> {
  if (useMemoryStore) {
    memoryStore.behaviorLogs.set(log.id, log);
    return;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('behaviorLogs', 'readwrite');
      const store = tx.objectStore('behaviorLogs');
      const request = store.add(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('addBehaviorLog failed, using memory store:', error);
    useMemoryStore = true;
    memoryStore.behaviorLogs.set(log.id, log);
  }
}

export async function getBehaviorLogs(): Promise<BehaviorLog[]> {
  if (useMemoryStore) {
    return Array.from(memoryStore.behaviorLogs.values());
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('behaviorLogs', 'readonly');
      const store = tx.objectStore('behaviorLogs');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('getBehaviorLogs failed, using memory store:', error);
    return Array.from(memoryStore.behaviorLogs.values());
  }
}