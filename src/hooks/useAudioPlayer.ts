import { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { getAudioFile } from '@/db';

let globalAudioRef: HTMLAudioElement | null = null;
let globalBlobUrl: string | null = null;
let isSeekInProgress = false;
let isSeeking = false;
let seekTimeout: ReturnType<typeof setTimeout> | null = null;

// 独立的 seek 函数，可以在不使用 hook 的情况下调用
export function seekAudio(time: number) {
  const audio = globalAudioRef;
  if (!audio || typeof time !== 'number' || isNaN(time)) {
    console.warn('Seek failed: invalid audio or time', { audio: !!audio, time });
    return;
  }
  
  const audioDuration = audio.duration;
  const clampedTime = (isNaN(audioDuration) || audioDuration <= 0) 
    ? Math.max(0, time)
    : Math.max(0, Math.min(audioDuration, time));
  
  if (seekTimeout) {
    clearTimeout(seekTimeout);
  }
  
  isSeeking = true;
  isSeekInProgress = true;
  
  audio.currentTime = clampedTime;
  usePlayerStore.getState().setCurrentTime(clampedTime);
  console.debug('Seek to:', clampedTime, 'duration:', audioDuration);
  
  seekTimeout = setTimeout(() => {
    isSeeking = false;
    isSeekInProgress = false;
    seekTimeout = null;
  }, 500);
}

export function useAudioPlayer() {
  const lastUpdateRef = useRef<number>(0);
  const currentSongIdRef = useRef<string | null>(null);
  
  const {
    currentSong,
    isPlaying,
    volume,
    playMode,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    playNext,
  } = usePlayerStore();

  useEffect(() => {
    if (!globalAudioRef) {
      globalAudioRef = new Audio();
    }
    
    const audio = globalAudioRef;
    
    const handleTimeUpdate = () => {
      if (isSeeking) return;
      
      const now = Date.now();
      if (now - lastUpdateRef.current >= 100) {
        lastUpdateRef.current = now;
        const currentTime = audio.currentTime;
        setCurrentTime(Math.round(currentTime * 100) / 100);
      }
    };

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      if (!isNaN(duration) && duration > 0) {
        setDuration(Math.round(duration * 100) / 100);
      }
    };

    const handleEnded = () => {
      if (isSeekInProgress) {
        console.debug('Ended event ignored during seek');
        return;
      }
      
      if (playMode === 'repeat' && globalAudioRef) {
        globalAudioRef.currentTime = 0;
        globalAudioRef.play().catch(() => {});
      } else {
        setIsPlaying(false);
        setTimeout(() => playNext(), 100);
      }
    };

    const handleSeeked = () => {
      isSeeking = false;
      isSeekInProgress = false;
      if (seekTimeout) {
        clearTimeout(seekTimeout);
        seekTimeout = null;
      }
      setCurrentTime(Math.round(audio.currentTime * 100) / 100);
    };

    const handleError = () => {
      const error = audio.error;
      if (!error || error.code === error.MEDIA_ERR_ABORTED) {
        console.debug('Audio load aborted (expected during song switch)');
        return;
      }
      
      let errorMessage = 'Audio playback error';
      switch (error.code) {
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Audio decoding failed (invalid format)';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Audio source not supported';
          break;
        default:
          errorMessage = `Unknown error: ${error.message}`;
      }
      
      console.error(`Audio playback error for ${currentSong?.title || 'unknown'}:`, errorMessage);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('error', handleError);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, playNext, currentSong?.title, playMode]);

  useEffect(() => {
    const loadAndPlaySong = async () => {
      if (!currentSong || !globalAudioRef) {
        return;
      }
      
      const songId = currentSong.id;
      
      // 检查是否是同一首歌
      // 对于示例歌曲（有 url），检查 ID 和 url
      // 对于导入歌曲（没有 url），检查 ID（因为 blob URL 可能已失效）
      const isSameSong = currentSong.url 
        ? (songId === currentSongIdRef.current && globalAudioRef.src === currentSong.url)
        : (songId === currentSongIdRef.current && globalAudioRef.src && !globalAudioRef.src.startsWith('blob:'));
      
      // 如果是同一首歌且是示例歌曲，保持当前播放状态
      // 对于导入歌曲，即使ID相同也重新加载，因为 blob URL 可能已失效
      if (isSameSong && currentSong.url) {
        return;
      }

      // 保存当前歌曲ID（在加载之前）
      currentSongIdRef.current = songId;

      // 清理旧的 Blob URL
      if (globalBlobUrl) {
        URL.revokeObjectURL(globalBlobUrl);
        globalBlobUrl = null;
      }

      setCurrentTime(0);
      setDuration(0);
      lastUpdateRef.current = 0;

      try {
        let audioSrc = currentSong.url;

        // 如果是导入的歌曲（没有 url），从存储加载
        if (!currentSong.url && !currentSong.isExample) {
          console.log('Loading imported song:', songId, currentSong.title);
          const arrayBuffer = await getAudioFile(songId);
          console.log('getAudioFile result:', arrayBuffer ? `data length=${arrayBuffer.length}` : 'undefined/null');
          if (arrayBuffer) {
            const blob = new Blob([arrayBuffer.buffer as ArrayBuffer], { type: 'audio/mpeg' });
            console.log('Created blob, size:', blob.size);
            audioSrc = URL.createObjectURL(blob);
            globalBlobUrl = audioSrc;
            console.log('Created blob URL:', audioSrc);
          } else {
            console.error('Audio file not found in database');
            return;
          }
        }

        if (!audioSrc) {
          console.error('No audio source available');
          return;
        }

        // 检查是否在加载过程中已经切换到其他歌曲
        if (currentSongIdRef.current !== songId) {
          if (globalBlobUrl) {
            URL.revokeObjectURL(globalBlobUrl);
            globalBlobUrl = null;
          }
          return;
        }

        globalAudioRef.src = audioSrc;
        globalAudioRef.load();
        
        // 加载完成后，如果应该播放，立即尝试播放
        if (isPlaying) {
          const playPromise = globalAudioRef.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              // 忽略 AbortError，因为可能在加载过程中已经切换到其他歌曲
              if (err.name !== 'AbortError') {
                console.warn('Playback failed on load:', err);
              }
            });
          }
        }

      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    };

    loadAndPlaySong();

    return () => {
      // 组件卸载时清理 Blob URL
      if (globalBlobUrl) {
        URL.revokeObjectURL(globalBlobUrl);
        globalBlobUrl = null;
      }
    };
  }, [currentSong, setCurrentTime, setDuration]);

  // 单独的 effect 处理 isPlaying 状态变化时的播放控制
  useEffect(() => {
    if (!globalAudioRef || !currentSong) {
      return;
    }
    
    if (isPlaying) {
      // 如果音频已加载，直接播放
      if (globalAudioRef.src) {
        globalAudioRef.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Playback failed:', err);
          }
        });
      }
    } else {
      globalAudioRef.pause();
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (globalAudioRef && typeof volume === 'number') {
      globalAudioRef.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  const seek = useCallback((time: number) => {
    const audio = globalAudioRef;
    if (!audio || typeof time !== 'number' || isNaN(time)) {
      console.warn('Seek failed: invalid audio or time', { audio: !!audio, time });
      return;
    }
    
    const audioDuration = audio.duration;
    if (isNaN(audioDuration) || audioDuration <= 0) {
      console.warn('Seek failed: invalid duration', { duration: audioDuration });
      return;
    }
    
    const clampedTime = Math.max(0, Math.min(audioDuration, time));
    
    if (seekTimeout) {
      clearTimeout(seekTimeout);
    }
    
    isSeeking = true;
    isSeekInProgress = true;
    
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    lastUpdateRef.current = Date.now();
    
    console.debug('Seek to:', clampedTime);
    
    seekTimeout = setTimeout(() => {
      isSeeking = false;
      isSeekInProgress = false;
      seekTimeout = null;
    }, 500);
  }, []);

  const getCurrentTime = useCallback(() => {
    return globalAudioRef?.currentTime || 0;
  }, []);

  const getDuration = useCallback(() => {
    return globalAudioRef?.duration || 0;
  }, []);

  return { seek, getCurrentTime, getDuration };
}
