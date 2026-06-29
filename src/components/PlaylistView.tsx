import { useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useThemeStore } from '@/stores/themeStore';
import { useMoodStore } from '@/stores/moodStore';
import { SongMood } from '@/types';
import { MOOD_MAPPINGS } from '@/constants/moodMapping';

const EMOTIONS = ['😊', '😢', '😌', '🔥', '🎯', '💪', '🌟', '💖', '🎶', '🌙'];
const COLORS = ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];

export function PlaylistView() {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    songId: string;
    songTitle: string;
  } | null>(null);
  const [showMoodDialog, setShowMoodDialog] = useState<{
    songId: string;
    songTitle: string;
  } | null>(null);
  const [showNewMoodDialog, setShowNewMoodDialog] = useState<{
    songId: string;
    songTitle: string;
  } | null>(null);
  const [newMoodName, setNewMoodName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  const { theme } = useThemeStore();
  const { playlist, currentSong, setCurrentSong, setIsPlaying, setPlaylist } = usePlayerStore();
  const { removeSong, updateSongMood } = useLibraryStore();
  const { addCustomMood } = useMoodStore();

  const handleSongClick = (song: typeof playlist[0]) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setContextMenu(null);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, song: typeof playlist[0]) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      songId: song.id,
      songTitle: song.title,
    });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;
    
    const { songId } = contextMenu;
    
    if (currentSong?.id === songId) {
      setIsPlaying(false);
      setCurrentSong(null);
    }
    
    await removeSong(songId);
    
    const newPlaylist = playlist.filter(s => s.id !== songId);
    setPlaylist(newPlaylist);
    
    setContextMenu(null);
  }, [contextMenu, currentSong, setIsPlaying, setCurrentSong, removeSong, playlist, setPlaylist]);

  const handleChangeMood = useCallback(() => {
    if (!contextMenu) return;
    
    setShowMoodDialog({
      songId: contextMenu.songId,
      songTitle: contextMenu.songTitle,
    });
    setContextMenu(null);
  }, [contextMenu]);

  const handleMoodSelect = useCallback(async (mood: SongMood) => {
    if (!showMoodDialog) return;
    
    await updateSongMood(showMoodDialog.songId, mood);
    setShowMoodDialog(null);
  }, [showMoodDialog, updateSongMood]);

  const handleOpenNewMoodDialog = useCallback(() => {
    if (!showMoodDialog) return;
    
    setShowNewMoodDialog({
      songId: showMoodDialog.songId,
      songTitle: showMoodDialog.songTitle,
    });
    setShowMoodDialog(null);
  }, [showMoodDialog]);

  const handleCreateNewMood = useCallback(async () => {
    if (!showNewMoodDialog || !newMoodName.trim()) return;
    
    const newMoodId = Date.now().toString();
    
    await addCustomMood({
      label: newMoodName.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
    });
    
    await updateSongMood(showNewMoodDialog.songId, newMoodId as SongMood);
    
    setShowNewMoodDialog(null);
    setNewMoodName('');
    setSelectedEmoji(EMOTIONS[0]);
    setSelectedColor(COLORS[0]);
  }, [showNewMoodDialog, newMoodName, selectedEmoji, selectedColor, addCustomMood, updateSongMood]);

  const handleCloseContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.context-menu')) {
      setContextMenu(null);
    }
  }, []);

  if (contextMenu) {
    document.addEventListener('click', handleCloseContextMenu, { once: true });
  }

  const moodOptions: SongMood[] = ['happy', 'sad', 'calm', 'excited', 'none'];

  return (
    <>
      <div className={`w-80 h-full backdrop-blur-md border-l flex flex-col ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-gray-900/90 border-gray-700'}`}>
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-700'}`}>
          <h2 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-white'}`}>播放列表</h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>{playlist.length} 首歌曲</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {playlist.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              <span className="text-4xl mb-2">🎶</span>
              <p>暂无歌曲</p>
              <p className="text-sm">选择情绪或导入音乐</p>
            </div>
          ) : (
            <div className="p-2">
              {playlist.map((song, index) => {
                const isCurrent = currentSong?.id === song.id;
                
                return (
                  <button
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    onContextMenu={(e) => handleContextMenu(e, song)}
                    className={`
                      w-full p-3 rounded-xl text-left transition-all duration-200
                      ${isCurrent 
                        ? 'bg-blue-500/30 border border-blue-500/50' 
                        : theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-gray-800/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-sm
                        ${isCurrent ? theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-white text-black' : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-gray-700 text-gray-300'}
                      `}>
                        {isCurrent && '🎵'}
                        {!isCurrent && (index + 1)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isCurrent || theme === 'dark' ? 'text-white' : 'text-white'}`}>
                          {song.title}
                        </p>
                        <p className={`text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>{song.artist}</p>
                      </div>
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                        播放 {song.playCount} 次
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {contextMenu && (
        <div
          className={`fixed context-menu border rounded-xl shadow-xl p-2 z-50 min-w-[180px] ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-slate-300'}`}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <p className={`text-sm px-3 py-2 border-b truncate ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'}`}>
            {contextMenu.songTitle}
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
      
      {showMoodDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`backdrop-blur-md rounded-2xl p-6 w-80 ${theme === 'dark' ? 'bg-slate-800/90' : 'bg-slate-100'}`}>
            <div className="text-center mb-4">
              <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>更改歌曲情绪</span>
            </div>
            
            <div className={`rounded-lg p-4 mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
              <div className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{showMoodDialog.songTitle}</div>
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
              onClick={() => setShowMoodDialog(null)}
              className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
      
      {showNewMoodDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`backdrop-blur-md rounded-2xl p-6 w-full max-w-md mx-4 ${theme === 'dark' ? 'bg-slate-800/90' : 'bg-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              创建新情绪
            </h3>

            <div className={`rounded-lg p-3 mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>将歌曲</p>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{showNewMoodDialog.songTitle}</p>
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
                  setShowNewMoodDialog(null);
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
