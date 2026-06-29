import { useState, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useThemeStore } from '@/stores/themeStore';
import { MOOD_MAPPINGS } from '@/constants/moodMapping';
import { seekAudio } from '@/hooks/useAudioPlayer';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface PlayerControlsProps {
  onFullScreen?: () => void;
  onQueueClick?: () => void;
}

export function PlayerControls({ onFullScreen, onQueueClick }: PlayerControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [displayVolume, setDisplayVolume] = useState(70);
  const progressRef = useRef<HTMLInputElement>(null);
  
  const { theme } = useThemeStore();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    setIsPlaying,
    setVolume,
    toggleMute,
    playPrev,
    playNext,
  } = usePlayerStore();
  
  const moodInfo = currentSong?.mood && currentSong.mood !== 'none' && currentSong.mood !== 'random' 
    ? MOOD_MAPPINGS[currentSong.mood] 
    : null;

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
    // 鼠标释放时，不执行跳转，只停止拖动状态
  }, []);

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time)) {
      setDisplayTime(time);
      // 拖动时实时更新播放进度
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

  return (
    <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-md border-t ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
      {/* 移动端布局 - 两行 */}
      <div className="lg:hidden px-4 py-3">
        {/* 第一行：进度条 */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs w-10 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
            {formatTime(displayValue)}
          </span>
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
            className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:scale-110
              disabled:opacity-50 disabled:cursor-not-allowed
              ${theme === 'dark' ? 'bg-slate-600 [&::-webkit-slider-thumb]:bg-blue-400' : 'bg-slate-300 [&::-webkit-slider-thumb]:bg-blue-500'}`
            }
          />
          <span className={`text-xs w-10 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
            {formatTime(duration)}
          </span>
        </div>
        
        {/* 第二行：封面 + 歌名 + 播放控制 */}
        <div className="flex items-center gap-3">
          {/* 封面 */}
          <button
            onClick={onFullScreen}
            className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0
              ${theme === 'dark' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`
            }
          >
            {currentSong?.cover ? (
              <img
                src={currentSong.cover}
                alt="cover"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>🎵</span>
              </div>
            )}
          </button>
          
          {/* 歌曲信息 */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
              {currentSong?.title || '未播放'}
            </h3>
            <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              {currentSong?.artist || '-'}
            </p>
          </div>
          
          {/* 播放控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={playPrev}
              disabled={!currentSong}
              className={`w-8 h-8 rounded-full flex items-center justify-center
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
            >
              ◀
            </button>
            
            <button
              onClick={togglePlay}
              disabled={!currentSong}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed
                ${theme === 'dark' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' : 'bg-gradient-to-br from-blue-400 to-blue-500 text-white'}`}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <button
              onClick={playNext}
              disabled={!currentSong}
              className={`w-8 h-8 rounded-full flex items-center justify-center
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
            >
              ▶
            </button>
          </div>
          
          {/* 队列按钮 */}
          <button
            onClick={onQueueClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
            title="播放队列"
          >
            📋
          </button>
        </div>
      </div>
      
      {/* 桌面端布局 - 单行 */}
      <div className="hidden lg:flex items-center gap-4 px-6 py-4">
        {/* 封面 */}
        <button 
          onClick={onFullScreen}
          className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 transition-transform hover:scale-105
            ${theme === 'dark' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-white'}`}
        >
          {currentSong?.cover ? (
            <img
              src={currentSong.cover}
              alt="cover"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>🎵</span>
            </div>
          )}
        </button>
        
        {/* 歌曲信息 */}
        <div className="w-48 min-w-0">
          <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
            {currentSong?.title || '未播放'}
          </h3>
          <p className={`text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
            {currentSong?.artist || '-'}
          </p>
          {moodInfo && (
            <span className={`text-xs ${moodInfo.color} px-2 py-0.5 rounded-full text-white`}>
              {moodInfo.emoji} {moodInfo.label}
            </span>
          )}
        </div>
        
        {/* 进度条 */}
        <div className="flex-1 flex items-center gap-3">
          <span className={`text-sm w-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
            {formatTime(displayValue)}
          </span>
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
            className={`flex-1 h-2 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:scale-110
              disabled:opacity-50 disabled:cursor-not-allowed
              ${theme === 'dark' ? 'bg-slate-600 [&::-webkit-slider-thumb]:bg-blue-400' : 'bg-slate-300 [&::-webkit-slider-thumb]:bg-blue-500'}`
            }
          />
          <span className={`text-sm w-12 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
            {formatTime(duration)}
          </span>
        </div>
        
        {/* 播放控制 */}
        <div className="flex items-center gap-3">
          <button
            onClick={playPrev}
            disabled={!currentSong}
            className={`w-10 h-10 rounded-full flex items-center justify-center
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          >
            ◀◀
          </button>
          
          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed
              ${theme === 'dark' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' : 'bg-gradient-to-br from-blue-400 to-blue-500 text-white'}`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <button
            onClick={playNext}
            disabled={!currentSong}
            className={`w-10 h-10 rounded-full flex items-center justify-center
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          >
            ▶▶
          </button>
        </div>
        
        {/* 音量控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`text-sm transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div className="relative">
            {(isVolumeHovered || isDragging) && (
              <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap
                ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-700 text-white'}`}>
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
              onMouseMove={(e) => {
                if (isDragging) {
                  setDisplayVolume(Number((e.target as HTMLInputElement).value) * 100);
                }
              }}
              className={`w-20 h-1.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                ${theme === 'dark' ? 'bg-slate-600 [&::-webkit-slider-thumb]:bg-blue-400' : 'bg-slate-300 [&::-webkit-slider-thumb]:bg-blue-500'}`}
            />
          </div>
        </div>
        
        {/* 队列按钮 */}
        <button
          onClick={onQueueClick}
          className={`w-10 h-10 rounded-full flex items-center justify-center
            transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          title="播放队列"
        >
          📋
        </button>
      </div>
    </div>
  );
}