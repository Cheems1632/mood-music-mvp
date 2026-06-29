import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMoodStore } from '@/stores/moodStore';
import { MOOD_MAPPINGS } from '@/constants/moodMapping';
import { Song, SongMood } from '@/types';

const EMOTIONS = ['😊', '😢', '😌', '🔥', '🎯', '💪', '🌟', '💖', '🎶', '🌙'];
const COLORS = ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];

interface SongListItemProps {
  song: Song;
}

export function SongListItem({ song }: SongListItemProps) {
  const { theme } = useThemeStore();
  const { currentSong, setCurrentSong, setIsPlaying, setPlaylist, playlist } = usePlayerStore();
  const { removeSong, updateSongMood } = useLibraryStore();
  const { addCustomMood } = useMoodStore();
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [showNewMoodDialog, setShowNewMoodDialog] = useState(false);
  const [newMoodName, setNewMoodName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  const isPlaying = currentSong?.id === song.id;
  
  const moodMapping = song.mood && song.mood !== 'none' 
    ? MOOD_MAPPINGS[song.mood as keyof typeof MOOD_MAPPINGS]
    : null;

  const handleClick = () => {
    setCurrentSong(song);
    setIsPlaying(true);
    setContextMenu(null);
  };
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  
  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;
    
    if (currentSong?.id === song.id) {
      setIsPlaying(false);
      setCurrentSong(null);
    }
    
    await removeSong(song.id);
    
    const newPlaylist = playlist.filter(s => s.id !== song.id);
    setPlaylist(newPlaylist);
    
    setContextMenu(null);
  }, [contextMenu, currentSong, song.id, setIsPlaying, setCurrentSong, removeSong, playlist, setPlaylist]);
  
  const handleChangeMood = useCallback(() => {
    setShowMoodDialog(true);
    setContextMenu(null);
  }, []);
  
  const handleMoodSelect = useCallback(async (mood: SongMood) => {
    await updateSongMood(song.id, mood);
    setShowMoodDialog(false);
  }, [song.id, updateSongMood]);
  
  const handleOpenNewMoodDialog = useCallback(() => {
    setShowNewMoodDialog(true);
    setShowMoodDialog(false);
  }, []);
  
  const handleCreateNewMood = useCallback(async () => {
    if (!newMoodName.trim()) return;
    
    const newMoodId = Date.now().toString();
    
    await addCustomMood({
      label: newMoodName.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
    });
    
    await updateSongMood(song.id, newMoodId as SongMood);
    
    setShowNewMoodDialog(false);
    setNewMoodName('');
    setSelectedEmoji(EMOTIONS[0]);
    setSelectedColor(COLORS[0]);
  }, [newMoodName, selectedEmoji, selectedColor, addCustomMood, song.id, updateSongMood]);
  
  const handleCloseContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.context-menu')) {
      setContextMenu(null);
    }
  }, []);
  
  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', handleCloseContextMenu, { once: true });
    }
  }, [contextMenu, handleCloseContextMenu]);
  
  const moodOptions: SongMood[] = ['happy', 'sad', 'calm', 'excited', 'none'];

  return (
    <>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`
          w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
          ${theme === 'dark' 
            ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50' 
            : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50'
          }
          ${isPlaying ? 'border-blue-500/50 bg-blue-500/20' : ''}
        `}
      >
        {/* 封面 */}
        <div className={`
          relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0
          ${theme === 'dark' ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-gray-700 to-gray-800'}
        `}>
          {/* 默认图标 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl ${theme === 'dark' ? 'text-white' : 'text-gray-300'}`}>🎵</span>
          </div>
          {/* 封面图片 */}
          {song.cover && (
            <img
              src={song.cover}
              alt={`${song.title} cover`}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          
          {/* 播放状态指示 */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-lg bg-black/30 flex items-center justify-center">
              <span className="text-white animate-pulse">🎶</span>
            </div>
          )}
        </div>
        
        {/* 歌曲信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
              {song.title}
            </h3>
            {moodMapping && (
              <span className={`text-xs ${moodMapping.color} px-2 py-0.5 rounded-full text-white`}>
                {moodMapping.emoji}
              </span>
            )}
          </div>
          <p className={`text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
            {song.artist}
          </p>
        </div>
      </button>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className={`fixed context-menu border rounded-xl shadow-xl p-2 z-50 min-w-[180px] ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-slate-300'}`}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <p className={`text-sm px-3 py-2 border-b truncate ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'}`}>
            {song.title}
          </p>
          <button
            onClick={handleChangeMood}
            className={`w-full px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400 hover:bg-blue-500/20' : 'text-blue-500 hover:bg-blue-100'}`}
          >
            <span>🎭</span>
            <span>更改情绪</span>
          </button>
          <button
            onClick={handleDelete}
            className={`w-full px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-100'}`}
          >
            <span>🗑️</span>
            <span>删除歌曲</span>
          </button>
        </div>
      )}
      
      {/* 情绪选择弹窗 */}
      {showMoodDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`backdrop-blur-md rounded-2xl p-6 w-80 ${theme === 'dark' ? 'bg-slate-800/90' : 'bg-slate-100'}`}>
            <div className="text-center mb-4">
              <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>更改歌曲情绪</span>
            </div>
            
            <div className={`rounded-lg p-4 mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
              <div className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{song.title}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {moodOptions.map((mood) => {
                const mapping = mood === 'none' 
                  ? { emoji: '❓', label: '暂无', color: 'bg-slate-400' }
                  : MOOD_MAPPINGS[mood];
                return (
                  <button
                    key={mood}
                    onClick={() => handleMoodSelect(mood)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl
                      ${mapping.color} hover:scale-105 transition-all duration-200`}
                  >
                    <span className="text-2xl">{mapping.emoji}</span>
                    <span className="text-xs text-white mt-1">{mapping.label}</span>
                  </button>
                );
              })}
              
              <button
                onClick={handleOpenNewMoodDialog}
                className={`flex flex-col items-center justify-center p-3 rounded-xl
                  border-2 border-dashed border-blue-400 hover:border-blue-300 hover:bg-blue-500/10 transition-all duration-200`}
              >
                <span className="text-2xl">+</span>
                <span className="text-xs text-blue-400 mt-1">新情绪</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowMoodDialog(false)}
              className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
      
      {/* 创建新情绪弹窗 */}
      {showNewMoodDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`backdrop-blur-md rounded-2xl p-6 w-full max-w-md mx-4 ${theme === 'dark' ? 'bg-slate-800/90' : 'bg-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              创建新情绪
            </h3>

            <div className={`rounded-lg p-3 mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>将歌曲</p>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{song.title}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>添加到新情绪</p>
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                情绪名称
              </label>
              <input
                type="text"
                value={newMoodName}
                onChange={(e) => setNewMoodName(e.target.value)}
                placeholder="请输入情绪名称"
                className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                maxLength={10}
              />
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                选择表情
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${selectedEmoji === emoji ? 'bg-blue-500 scale-110' : theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                选择颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-lg transition-all ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''} ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewMoodDialog(false);
                  setNewMoodName('');
                  setSelectedEmoji(EMOTIONS[0]);
                  setSelectedColor(COLORS[0]);
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                取消
              </button>
              <button
                onClick={handleCreateNewMood}
                disabled={!newMoodName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}