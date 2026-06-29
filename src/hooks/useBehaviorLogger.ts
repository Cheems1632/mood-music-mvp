import { useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { addBehaviorLog, generateId } from '@/db';
import { BehaviorLog } from '@/types';

const PLAY_THRESHOLD = 30;

export function useBehaviorLogger() {
  const { currentSong, isPlaying, currentTime } = usePlayerStore();
  const { updateSongPlayCount, updateSongSkipCount } = useLibraryStore();
  
  const playStartTimeRef = useRef<number | null>(null);
  const previousSongIdRef = useRef<string | null>(null);

  const logPlay = useCallback(async (songId: string, duration: number) => {
    const log: BehaviorLog = {
      id: generateId(),
      songId,
      action: 'play',
      timestamp: Date.now(),
      duration,
    };
    await addBehaviorLog(log);
    await updateSongPlayCount(songId);
  }, [updateSongPlayCount]);

  const logSkip = useCallback(async (songId: string, duration: number) => {
    const log: BehaviorLog = {
      id: generateId(),
      songId,
      action: 'skip',
      timestamp: Date.now(),
      duration,
    };
    await addBehaviorLog(log);
    await updateSongSkipCount(songId);
  }, [updateSongSkipCount]);

  useEffect(() => {
    if (isPlaying && currentSong) {
      if (previousSongIdRef.current !== currentSong.id) {
        if (previousSongIdRef.current && playStartTimeRef.current) {
          const elapsed = (Date.now() - playStartTimeRef.current) / 1000;
          if (elapsed < PLAY_THRESHOLD) {
            logSkip(previousSongIdRef.current, elapsed);
          }
        }
        previousSongIdRef.current = currentSong.id;
        playStartTimeRef.current = Date.now();
      }
    } else if (!isPlaying && playStartTimeRef.current && previousSongIdRef.current) {
      const elapsed = (Date.now() - playStartTimeRef.current) / 1000;
      if (elapsed >= PLAY_THRESHOLD) {
        logPlay(previousSongIdRef.current, elapsed);
      }
      playStartTimeRef.current = null;
    }
  }, [isPlaying, currentSong, logPlay, logSkip, currentTime]);

  useEffect(() => {
    return () => {
      if (playStartTimeRef.current && previousSongIdRef.current) {
        const elapsed = (Date.now() - playStartTimeRef.current) / 1000;
        if (elapsed >= PLAY_THRESHOLD) {
          logPlay(previousSongIdRef.current, elapsed);
        }
      }
    };
  }, [logPlay]);
}
