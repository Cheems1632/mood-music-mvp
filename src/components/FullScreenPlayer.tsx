import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useMoodStore } from '@/stores/moodStore';
import { seekAudio } from '@/hooks/useAudioPlayer';

interface FullScreenPlayerProps {
  onClose: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MOOD_GRADIENTS: Record<string, { from: string; to: string }> = {
  happy: { from: 'from-yellow-500', to: 'to-orange-400' },
  sad: { from: 'from-blue-600', to: 'to-indigo-500' },
  calm: { from: 'from-green-500', to: 'to-teal-400' },
  excited: { from: 'from-red-600', to: 'to-pink-500' },
  random: { from: 'from-gray-600', to: 'to-gray-400' },
};

const PLAY_MODE_ICONS: Record<string, { icon: string; label: string }> = {
  order: { icon: '◀▶', label: '顺序播放' },
  loop: { icon: '🔄', label: '循环播放' },
  repeat: { icon: '↻', label: '单曲循环' },
  shuffle: { icon: '🔀', label: '随机播放' },
};

export function FullScreenPlayer({ onClose }: FullScreenPlayerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [displayVolume, setDisplayVolume] = useState(70);
  const progressRef = useRef<HTMLInputElement>(null);
  
  const { currentMood } = useMoodStore();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playMode,
    setIsPlaying,
    setVolume,
    togglePlayMode,
    playPrev,
    playNext,
  } = usePlayerStore();

  // 获取当前情绪的渐变色
  const songMood = currentSong?.mood && currentSong.mood !== 'none' && currentSong.mood !== 'random' 
    ? currentSong.mood 
    : currentMood;
  const moodGradient = MOOD_GRADIENTS[songMood || 'random'] || MOOD_GRADIENTS.random;
  
  // 进度条处理
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // 如果 duration 未知，使用估算值 180 秒
    const estimatedDuration = (isNaN(duration) || duration <= 0) ? 180 : duration;
    const time = percent * estimatedDuration;
    
    setDisplayTime(time);
    seekAudio(time);
  }, [duration]);

  const handleProgressMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleProgressMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time)) {
      setDisplayTime(time);
      seekAudio(time);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (!isNaN(vol)) {
      setVolume(Math.max(0, Math.min(1, vol)));
    }
  }, [setVolume]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [setIsPlaying, isPlaying]);

  const displayValue = isDragging ? displayTime : currentTime;
  const isDurationValid = duration > 0 && !isNaN(duration);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        playPrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        playNext();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        togglePlayMode();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, playPrev, playNext, togglePlayMode, onClose]);

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br ${moodGradient.from} ${moodGradient.to} flex flex-col animate-fadeIn`}>
      {/* 关闭按钮 */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white text-2xl flex items-center justify-center transition-all backdrop-blur-sm"
        >
          ✕
        </button>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-20">
        {/* 旋转的专辑封面 */}
        <div 
          className={`relative w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-2xl overflow-hidden mb-8
            ${isPlaying ? 'animate-spin-slow' : ''}`}
          style={{ animationDuration: '20s' }}
        >
          {/* 默认背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <span className="text-8xl">🎵</span>
          </div>
          {/* 封面图片 */}
          {currentSong?.cover && (
            <img
              src={currentSong.cover}
              alt={`${currentSong.title} cover`}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>

        {/* 歌曲信息 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {currentSong?.title || '未播放'}
          </h2>
          <p className="text-xl text-white/80 mb-2">
            {currentSong?.artist || '-'}
          </p>
          {/* 推荐理由 */}
          <p className="text-sm text-white/60">
            {currentSong?.tags?.slice(0, 2).join(' · ') || '根据心情推荐'}
          </p>
        </div>

        {/* 大尺寸进度条 */}
        <div className="w-full max-w-lg mb-8">
          <input
            ref={progressRef}
            type="range"
            min="0"
            max={isDurationValid ? duration : 1}
            value={isDurationValid ? displayValue : 0}
            disabled={!isDurationValid}
            aria-label="播放进度"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            onMouseUp={handleProgressMouseUp}
            onMouseLeave={handleProgressMouseUp}
            onTouchStart={handleProgressMouseDown}
            onTouchEnd={handleProgressMouseUp}
            onChange={handleProgressChange}
            className="w-full h-2 bg-white/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
              [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:scale-110
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-white/70 text-sm mt-2">
            <span>{formatTime(displayValue)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 播放控制按钮 */}
        <div className="flex items-center gap-6">
          <button
            onClick={playPrev}
            disabled={!currentSong}
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-all backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ◀◀
          </button>
          
          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-20 h-20 rounded-full bg-white text-gray-800 text-4xl flex items-center justify-center transition-transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <button
            onClick={playNext}
            disabled={!currentSong}
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-all backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶▶
          </button>
          
          {/* 播放模式切换按钮 */}
          <button
            onClick={togglePlayMode}
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center transition-all backdrop-blur-sm"
            title={PLAY_MODE_ICONS[playMode]?.label || '播放模式'}
          >
            {PLAY_MODE_ICONS[playMode]?.icon || '◀▶'}
          </button>
        </div>

        {/* 音量控制 */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={() => {
              const { toggleMute } = usePlayerStore.getState();
              toggleMute();
            }}
            className="text-white/70 hover:text-white transition-colors"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div className="relative">
            {(isVolumeHovered || isDragging) && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/50 text-white text-xs whitespace-nowrap">
                {Math.round(displayVolume)}%
              </div>
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              aria-label="音量控制"
              value={typeof volume === 'number' ? volume : 0.7}
              onChange={(e) => {
                handleVolumeChange(e);
                setDisplayVolume(Number(e.target.value) * 100);
              }}
              onMouseEnter={() => {
                setIsVolumeHovered(true);
                setDisplayVolume((typeof volume === 'number' ? volume : 0.7) * 100);
              }}
              onMouseLeave={() => setIsVolumeHovered(false)}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              className="w-32 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        </div>

        {/* 键盘提示 */}
        <p className="text-white/40 text-xs mt-8">
          空格键播放/暂停 · ← → 切换歌曲 · M 切换播放模式 · ESC 关闭
        </p>
      </div>
    </div>
  );
}
