import { useEffect, useState, useCallback } from 'react';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useMoodStore } from '@/stores/moodStore';
import { useThemeStore } from '@/stores/themeStore';
import { MoodSelector } from '@/components/MoodSelector';
import { PlayerControls } from '@/components/PlayerControls';
import { SongCard } from '@/components/SongCard';
import { SongListItem } from '@/components/SongListItem';
import { PlaylistQueue } from '@/components/PlaylistQueue';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FullScreenPlayer } from '@/components/FullScreenPlayer';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useRecommend } from '@/hooks/useRecommend';
import { useBehaviorLogger } from '@/hooks/useBehaviorLogger';
import { MOOD_MAPPINGS } from '@/constants/moodMapping';
import { generateId, saveAudioFile } from '@/db';
import { Song, SongMood } from '@/types';

function App() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPendingSongs, setImportPendingSongs] = useState<{
    id: string;
    title: string;
    artist: string;
    arrayBuffer: ArrayBuffer;
    pictureData?: Uint8Array;
    pictureMimeType?: string;
  }[]>([]);
  const [importCurrentIndex, setImportCurrentIndex] = useState(0);
  
  const { loadSongs, songs, addNewSong } = useLibraryStore();
  const { setPlaylist } = usePlayerStore();
  const { currentMood } = useMoodStore();
  const { theme } = useThemeStore();
  const recommendations = useRecommend();

  // 导入歌曲相关方法
  const parseID3v2 = (arrayBuffer: ArrayBuffer): { title?: string; artist?: string; pictureData?: Uint8Array; pictureMimeType?: string } => {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 10) return {};
    const id = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (id !== 'ID3') return {};
    
    const majorVersion = view.getUint8(3);
    const flags = view.getUint8(5);
    
    let headerSize = 10;
    if ((flags & 0x40) !== 0) {
      const extendedHeaderSize = view.getUint32(10);
      headerSize += extendedHeaderSize;
    }
    
    const tagSize = decodeSyncSafeInteger(view, 6);
    let offset = headerSize;
    const endOffset = Math.min(offset + tagSize, view.byteLength);
    
    let title: string | undefined;
    let artist: string | undefined;
    let pictureData: Uint8Array | undefined;
    let pictureMimeType: string | undefined;
    
    while (offset + 10 <= endOffset) {
      const frameId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      
      if (frameId === '\x00\x00\x00\x00' || frameId.trim() === '') break;
      
      let frameSize: number;
      if (majorVersion >= 4) {
        frameSize = decodeSyncSafeInteger(view, offset + 4);
      } else {
        frameSize = view.getUint32(offset + 4);
      }
      
      const frameFlags = view.getUint16(offset + 8);
      const hasDataLengthIndicator = (frameFlags & 0x0008) !== 0;
      
      let contentOffset = offset + 10;
      let contentSize = frameSize;
      
      if (hasDataLengthIndicator) {
        contentOffset += 4;
        contentSize -= 4;
      }
      
      if (contentOffset + contentSize > view.byteLength) break;
      
      const frameContent = new Uint8Array(view.buffer, contentOffset, contentSize);
      if (frameId === 'TIT2' && contentSize > 0) {
        title = readFrameContent(frameContent);
      } else if (frameId === 'TPE1' && contentSize > 0) {
        artist = readFrameContent(frameContent);
      } else if (frameId === 'APIC' && contentSize > 0) {
        const apicResult = parseAPICFrame(frameContent);
        if (apicResult) {
          pictureData = apicResult.data;
          pictureMimeType = apicResult.mimeType;
        }
      }
      
      offset += 10 + frameSize;
    }
    
    return { title, artist, pictureData, pictureMimeType };
  };

  const decodeSyncSafeInteger = (view: DataView, offset: number): number => {
    const b1 = view.getUint8(offset);
    const b2 = view.getUint8(offset + 1);
    const b3 = view.getUint8(offset + 2);
    const b4 = view.getUint8(offset + 3);
    return ((b1 & 0x7F) << 21) | ((b2 & 0x7F) << 14) | ((b3 & 0x7F) << 7) | (b4 & 0x7F);
  };

  const readFrameContent = (bytes: Uint8Array): string | undefined => {
    if (bytes.length < 1) return undefined;
    
    const encoding = bytes[0];
    const contentBytes = bytes.slice(1);
    
    let decoder: string;
    switch (encoding) {
      case 0: decoder = 'iso-8859-1'; break;
      case 1: decoder = 'utf-16'; break;
      case 2: decoder = 'utf-16le'; break;
      case 3: decoder = 'utf-8'; break;
      default: decoder = 'utf-8';
    }
    
    let text = new TextDecoder(decoder).decode(contentBytes);
    const nullIndex = text.indexOf('\0');
    if (nullIndex !== -1) text = text.substring(0, nullIndex);
    
    return text.trim() || undefined;
  };

  const parseAPICFrame = (bytes: Uint8Array): { data: Uint8Array; mimeType: string } | null => {
    if (bytes.length < 2) return null;
    
    let pos = 1;
    let mimeType = '';
    while (pos < bytes.length && bytes[pos] !== 0) {
      mimeType += String.fromCharCode(bytes[pos++]);
    }
    pos++;
    
    if (pos >= bytes.length) return null;
    
    const pictureType = bytes[pos++];
    if (pictureType !== 3) return null;
    
    while (pos < bytes.length && bytes[pos] !== 0) {
      pos++;
    }
    pos++;
    
    if (pos >= bytes.length) return null;
    
    const pictureData = bytes.slice(pos);
    return { data: pictureData, mimeType };
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log('handleFileChange: files selected:', files.length);

    const newPendingSongs: typeof importPendingSongs = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue;

      try {
        const arrayBuffer = await file.arrayBuffer();
        
        let title = file.name.replace(/\.[^/.]+$/, '');
        let artist = '未知艺术家';
        let pictureData: Uint8Array | undefined;
        let pictureMimeType: string | undefined;

        try {
          const tags = parseID3v2(arrayBuffer);
          if (tags.title) title = tags.title;
          if (tags.artist) artist = tags.artist;
          pictureData = tags.pictureData;
          pictureMimeType = tags.pictureMimeType;
        } catch (e) {
          console.error('ID3 parsing failed:', e);
        }

        const songId = generateId();
        newPendingSongs.push({ 
          id: songId, 
          title, 
          artist, 
          arrayBuffer,
          pictureData,
          pictureMimeType
        });
        console.log('Added pending song:', title);
      } catch (error) {
        console.error('Failed to import file:', file.name, error);
      }
    }

    console.log('handleFileChange: total pending songs:', newPendingSongs.length);
    
    if (newPendingSongs.length > 0) {
      setImportPendingSongs(newPendingSongs);
      setImportCurrentIndex(0);
      setShowImportModal(true);
      console.log('handleFileChange: showImportModal set to true');
    }

    e.target.value = '';
  }, []);

  const handleImportMoodSelect = useCallback(async (mood: SongMood) => {
    console.log('handleImportMoodSelect called:', mood, 'currentIndex:', importCurrentIndex, 'pendingSongs length:', importPendingSongs.length);
    
    const pendingSong = importPendingSongs[importCurrentIndex];
    if (!pendingSong) {
      console.error('handleImportMoodSelect: pendingSong is undefined');
      return;
    }

    try {
      console.log('handleImportMoodSelect: saving audio file for:', pendingSong.title);
      await saveAudioFile(pendingSong.id, new Uint8Array(pendingSong.arrayBuffer));

      let cover: string | undefined;
      if (pendingSong.pictureData && pendingSong.pictureMimeType) {
        const arrayBuffer = pendingSong.pictureData.buffer.slice(
          pendingSong.pictureData.byteOffset, 
          pendingSong.pictureData.byteOffset + pendingSong.pictureData.byteLength
        ) as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: pendingSong.pictureMimeType });
        cover = URL.createObjectURL(blob);
      }

      const song: Song = {
        id: pendingSong.id,
        title: pendingSong.title,
        artist: pendingSong.artist,
        url: '',
        tags: mood !== 'none' && mood !== 'random' ? MOOD_MAPPINGS[mood].tags : [],
        playCount: 0,
        skipCount: 0,
        isExample: false,
        mood: mood,
        cover: cover,
        coverData: pendingSong.pictureData,
        coverMimeType: pendingSong.pictureMimeType,
      };

      console.log('handleImportMoodSelect: adding song with mood:', mood);
      await addNewSong(song);

      setImportPendingSongs(prev => {
        if (importCurrentIndex < prev.length - 1) {
          return prev;
        }
        return [];
      });
      
      setImportCurrentIndex(prev => {
        if (prev < importPendingSongs.length - 1) {
          return prev + 1;
        }
        return 0;
      });
      
      if (importCurrentIndex >= importPendingSongs.length - 1) {
        setShowImportModal(false);
        console.log('handleImportMoodSelect: all songs imported, closing modal');
      } else {
        console.log('handleImportMoodSelect: moving to next song, index:', importCurrentIndex + 1);
      }
    } catch (error) {
      console.error('handleImportMoodSelect failed:', error);
    }
  }, [importPendingSongs, importCurrentIndex, addNewSong]);

  useAudioPlayer();
  useBehaviorLogger();

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  useEffect(() => {
    setPlaylist(recommendations);
  }, [currentMood, recommendations, setPlaylist]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const currentMoodMapping = currentMood && currentMood !== 'none' && currentMood !== 'random'
    ? MOOD_MAPPINGS[currentMood as keyof typeof MOOD_MAPPINGS]
    : null;

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* 顶部：情绪选择器 */}
      <header className={`w-full border-b backdrop-blur-sm ${theme === 'dark' ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50/80 border-slate-200'}`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 py-4">
            <h1 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <span className={`text-2xl sm:text-3xl ${theme === 'dark' ? 'text-white' : 'text-black'}`}>🎵</span>
              Mood Music
            </h1>
            <div className="flex items-center gap-3">
              <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                库中 {songs.length} 首歌曲
              </span>
              <ThemeToggle />
            </div>
          </div>
          
          {/* 导入按钮 */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 hidden lg:block group">
            <label
              className="flex items-center justify-center w-[60px] h-[36px] rounded-full rounded-r-none bg-slate-700 hover:bg-slate-600 transition-colors duration-300 cursor-pointer shadow-lg relative"
            >
              <span className="text-sm">📁</span>
              <input
                type="file"
                accept="audio/mp3"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Tooltip */}
              <div className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                导入歌曲
              </div>
            </label>
          </div>
          
          {/* 移动端导入按钮 */}
          <div className="flex justify-center mb-4 lg:hidden">
            <label
              className="flex items-center justify-center px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors duration-300 cursor-pointer"
            >
              <span className="text-sm text-white">📁 导入歌曲</span>
              <input
                type="file"
                accept="audio/mp3"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          
          <MoodSelector />
        </div>
      </header>

      {/* 主内容区域：歌曲列表 */}
      <main className="flex-1 pb-24 lg:pb-32">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 区域标题 */}
          <div className="mb-6">
            <h2 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
              {currentMood === 'random' ? '🎲 随便听听' : currentMoodMapping ? `${currentMoodMapping.emoji} ${currentMoodMapping.label}` : '🎵 全部歌曲'}
            </h2>
            <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              {recommendations.length} 首推荐歌曲
            </p>
          </div>

          {/* 歌曲卡片网格 - 桌面端 */}
          <div className="hidden lg:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recommendations.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>

          {/* 歌曲列表 - 移动端 */}
          <div className="lg:hidden flex flex-col gap-2">
            {recommendations.map((song) => (
              <SongListItem key={song.id} song={song} />
            ))}
          </div>

          {/* 空状态 */}
          {recommendations.length === 0 && (
            <div className={`flex flex-col items-center justify-center h-64 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
              <span className="text-6xl mb-4">🎶</span>
              <p className="text-lg">暂无推荐歌曲</p>
              <p className="text-sm">选择情绪或导入音乐</p>
            </div>
          )}
        </div>
      </main>

      {/* 底部播放控制栏 */}
      <PlayerControls 
        onFullScreen={() => setIsFullScreen(true)}
        onQueueClick={() => setIsQueueOpen(!isQueueOpen)}
      />

      {/* 播放队列浮窗 */}
      <PlaylistQueue 
        isOpen={isQueueOpen} 
        onClose={() => setIsQueueOpen(false)} 
      />

      {/* 全屏播放器 */}
      {isFullScreen && (
        <div className="animate-fadeIn">
          <FullScreenPlayer onClose={() => setIsFullScreen(false)} />
        </div>
      )}

      {/* 导入歌曲模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl w-full max-w-md mx-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="text-center mb-4">
              <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>选择歌曲情绪</span>
              <div className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} text-sm mt-2`}>
                ({importCurrentIndex + 1} / {importPendingSongs.length})
              </div>
            </div>

            <div className={`rounded-lg p-4 mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <div className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {importPendingSongs[importCurrentIndex]?.title}
              </div>
              <div className={`text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                {importPendingSongs[importCurrentIndex]?.artist}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {(['happy', 'sad', 'calm', 'excited', 'none'] as SongMood[]).map((mood) => {
                const mapping = mood === 'none' 
                  ? { emoji: '❓', label: '暂无', color: 'bg-slate-400' }
                  : MOOD_MAPPINGS[mood];
                return (
                  <button
                    key={mood}
                    onClick={() => handleImportMoodSelect(mood)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl
                      ${mapping.color} hover:scale-105 transition-all duration-200`}
                  >
                    <span className="text-2xl">{mapping.emoji}</span>
                    <span className="text-xs text-white mt-1">{mapping.label}</span>
                  </button>
                );
              })}
            </div>

            <div className={`text-xs text-center ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
              选择"暂无"将歌曲移入随便听听
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
