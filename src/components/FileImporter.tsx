import { useCallback, useState } from 'react';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMoodStore } from '@/stores/moodStore';
import { generateId, saveAudioFile } from '@/db';
import { Song, SongMood } from '@/types';
import { MOOD_MAPPINGS } from '@/constants/moodMapping';

interface PendingSong {
  id: string;
  title: string;
  artist: string;
  arrayBuffer: ArrayBuffer;
  pictureData?: Uint8Array;
  pictureMimeType?: string;
}

export function FileImporter() {
  const { currentMood } = useMoodStore();
  const { addNewSong } = useLibraryStore();
  const [pendingSongs, setPendingSongs] = useState<PendingSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log('FileImporter: files selected:', files.length);

    const newPendingSongs: PendingSong[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue;

      console.log('Processing file:', file.name, 'type:', file.type, 'size:', file.size);

      try {
        const arrayBuffer = await file.arrayBuffer();
        
        let title = file.name.replace(/\.[^/.]+$/, '');
        let artist = '未知艺术家';

        try {
          console.log('Calling parseID3 for:', file.name);
          const tags = await parseID3(arrayBuffer);
          console.log('parseID3 result:', tags);
          if (tags.title) title = tags.title;
          if (tags.artist) artist = tags.artist;
          
          const songId = generateId();
          newPendingSongs.push({ 
            id: songId, 
            title, 
            artist, 
            arrayBuffer,
            pictureData: tags.pictureData,
            pictureMimeType: tags.pictureMimeType
          });
        } catch {
          const songId = generateId();
          newPendingSongs.push({ id: songId, title, artist, arrayBuffer });
        }
      } catch (error) {
        console.error('Failed to import file:', file.name, error);
      }
    }

    if (newPendingSongs.length > 0) {
      setPendingSongs(newPendingSongs);
      setCurrentIndex(0);
    }

    e.target.value = '';
  }, []);

  const handleMoodSelect = useCallback(async (mood: SongMood) => {
    const pendingSong = pendingSongs[currentIndex];
    if (!pendingSong) return;

    const audioData = new Uint8Array(pendingSong.arrayBuffer);
    console.log('Importing song:', pendingSong.title, 'audio size:', audioData.length);
    await saveAudioFile(pendingSong.id, audioData);
    console.log('Audio saved for:', pendingSong.id);

    // 处理封面图片
    let cover: string | undefined;
    let coverDataCopy: Uint8Array | undefined;
    
    if (pendingSong.pictureData && pendingSong.pictureMimeType) {
      // 创建封面数据的副本，避免引用原始 buffer
      coverDataCopy = new Uint8Array(pendingSong.pictureData);
      const blob = new Blob([coverDataCopy.buffer.slice(coverDataCopy.byteOffset, coverDataCopy.byteOffset + coverDataCopy.byteLength) as ArrayBuffer], { type: pendingSong.pictureMimeType });
      cover = URL.createObjectURL(blob);
      console.log('Created cover blob URL:', cover, 'size:', coverDataCopy.length);
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
      coverData: coverDataCopy,
      coverMimeType: pendingSong.pictureMimeType,
    };

    await addNewSong(song);

    if (currentIndex < pendingSongs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPendingSongs([]);
      setCurrentIndex(0);
    }
  }, [pendingSongs, currentIndex, addNewSong]);

  const parseID3 = async (arrayBuffer: ArrayBuffer): Promise<{ title?: string; artist?: string; pictureData?: Uint8Array; pictureMimeType?: string }> => {
    const result = parseID3v2(arrayBuffer);
    return result;
  };

  const parseID3v2 = (arrayBuffer: ArrayBuffer): { title?: string; artist?: string; pictureData?: Uint8Array; pictureMimeType?: string } => {
    const view = new DataView(arrayBuffer);
    
    console.log('parseID3v2: buffer size=', view.byteLength);
    
    if (view.byteLength < 10) {
      console.log('Buffer too small for ID3');
      return {};
    }
    
    const id = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    console.log('ID3 header id:', id);
    if (id !== 'ID3') {
      console.log('No ID3 header found');
      return {};
    }
    
    const majorVersion = view.getUint8(3);
    const flags = view.getUint8(5);
    console.log('ID3 version:', majorVersion, 'flags:', flags);
    
    let headerSize = 10;
    if ((flags & 0x40) !== 0) {
      const extendedHeaderSize = view.getUint32(10);
      headerSize += extendedHeaderSize;
    }
    
    const tagSize = decodeSyncSafeInteger(view, 6);
    console.log('Tag size:', tagSize, 'header size:', headerSize);
    let offset = headerSize;
    const endOffset = Math.min(offset + tagSize, view.byteLength);
    
    let title: string | undefined;
    let artist: string | undefined;
    let pictureData: Uint8Array | undefined;
    let pictureMimeType: string | undefined;
    
    const foundFrames: string[] = [];
    
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
      
      foundFrames.push(`${frameId}:${frameSize}`);
      
      const frameFlags = view.getUint16(offset + 8);
      const hasDataLengthIndicator = (frameFlags & 0x0008) !== 0;
      
      let contentOffset = offset + 10;
      let contentSize = frameSize;
      
      if (hasDataLengthIndicator) {
        contentOffset += 4;
        contentSize -= 4;
      }
      
      if (contentOffset + contentSize > view.byteLength) break;
      
      if (frameId === 'TIT2' && contentSize > 0) {
          title = readFrameContent(view, contentOffset, contentSize);
        } else if (frameId === 'TPE1' && contentSize > 0) {
          artist = readFrameContent(view, contentOffset, contentSize);
        } else if (frameId === 'APIC' && contentSize > 0) {
          // 解析专辑封面 (APIC 帧)
          console.log('Found APIC frame, size:', contentSize);
          const apicResult = parseAPICFrame(view, contentOffset, contentSize);
          if (apicResult) {
            console.log('APIC parsed successfully, mimeType:', apicResult.mimeType, 'data size:', apicResult.data.length);
            pictureData = apicResult.data;
            pictureMimeType = apicResult.mimeType;
          } else {
            console.warn('APIC frame parsing failed');
          }
        }
      
      offset += 10 + frameSize;
    }
    
    console.log('Found frames:', foundFrames.join(', '));
    console.log('Result: title=', title, 'artist=', artist, 'hasPicture=', !!pictureData);
    
    return { title, artist, pictureData, pictureMimeType };
  };
  
  const parseAPICFrame = (view: DataView, offset: number, size: number): { data: Uint8Array; mimeType: string } | null => {
    if (size < 2) return null;
    
    console.log('parseAPICFrame: offset=', offset, 'size=', size, 'view.byteOffset=', view.byteOffset);
    
    // APIC 帧结构:
    // 1. 编码方式 (1字节)
    // 2. MIME 类型 (以 null 结尾的字符串)
    // 3. 图片类型 (1字节)
    // 4. 描述 (以 null 结尾的字符串，可选)
    // 5. 图片数据
    
    let pos = offset;
    
    // 读取编码方式（用于确定描述字段的编码）
    const encoding = view.getUint8(pos);
    console.log('Encoding:', encoding);
    pos++;
    
    // 读取 MIME 类型
    let mimeType = '';
    while (pos < offset + size && view.getUint8(pos) !== 0) {
      mimeType += String.fromCharCode(view.getUint8(pos++));
    }
    console.log('MIME type:', mimeType);
    pos++; // 跳过 null 终止符
    
    if (pos >= offset + size) {
      console.warn('Reached end after MIME type');
      return null;
    }
    
    // 读取图片类型
    const pictureType = view.getUint8(pos++);
    console.log('Picture type:', pictureType);
    
    // 接受封面(3)、背面(4)、内页(5)、媒体(6)等类型，也接受未知类型(0)
    const acceptableTypes = [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    if (!acceptableTypes.includes(pictureType)) {
      console.warn('Picture type not acceptable:', pictureType);
      return null;
    }
    
    // 读取描述 (以 null 结尾)
    // UTF-16 编码使用双字节 null 终止符 (0x00 0x00)
    const descStart = pos;
    while (pos < offset + size && view.getUint8(pos) !== 0) {
      pos++;
      // 对于 UTF-16，跳过额外的字节
      if (encoding === 1 || encoding === 2) { // UTF-16 和 UTF-16BE
        pos++;
      }
    }
    console.log('Description length:', pos - descStart);
    
    // 跳过 null 终止符
    pos++;
    if (encoding === 1 || encoding === 2) { // UTF-16 和 UTF-16BE
      pos++;
    }
    
    if (pos >= offset + size) {
      console.warn('Reached end after description');
      return null;
    }
    
    // 剩余部分是图片数据
    const pictureSize = offset + size - pos;
    console.log('Picture data size:', pictureSize);
    
    // 确保有足够的数据
    if (pictureSize < 10) {
      console.warn('Picture data too small');
      return null;
    }
    
    // 修复字节偏移问题：view.byteOffset 是 DataView 在 buffer 中的偏移
    const bufferOffset = view.byteOffset + pos;
    console.log('Buffer offset:', bufferOffset);
    const pictureData = new Uint8Array(view.buffer, bufferOffset, pictureSize);
    
    // 验证图片数据是否有效（检查常见图片格式的魔数）
    const magicNumber = (pictureData[0] << 8) | pictureData[1];
    console.log('Magic number:', magicNumber.toString(16), 'first bytes:', pictureData[0], pictureData[1]);
    const validMagicNumbers = [
      0x8950, // PNG
      0xFFD8, // JPEG
      0x4749, // GIF
      0x424D, // BMP
    ];
    
    if (!validMagicNumbers.includes(magicNumber)) {
      console.warn('Invalid image format in APIC frame, magic number:', magicNumber.toString(16));
      return null;
    }
    
    console.log('APIC frame parsed successfully!');
    return { data: pictureData, mimeType };
  };

  const decodeSyncSafeInteger = (view: DataView, offset: number): number => {
    const b1 = view.getUint8(offset);
    const b2 = view.getUint8(offset + 1);
    const b3 = view.getUint8(offset + 2);
    const b4 = view.getUint8(offset + 3);
    return ((b1 & 0x7F) << 21) | ((b2 & 0x7F) << 14) | ((b3 & 0x7F) << 7) | (b4 & 0x7F);
  };

  const readFrameContent = (view: DataView, offset: number, size: number): string | undefined => {
    if (size < 1) return undefined;
    
    const encoding = view.getUint8(offset);
    const contentOffset = offset + 1;
    const contentSize = size - 1;
    
    if (contentOffset + contentSize > view.byteLength) return undefined;
    
    let decoder: string;
    switch (encoding) {
      case 0: decoder = 'iso-8859-1'; break;
      case 1: decoder = 'utf-16'; break;
      case 2: decoder = 'utf-16le'; break;
      case 3: decoder = 'utf-8'; break;
      default: decoder = 'utf-8';
    }
    
    const bytes = new Uint8Array(view.buffer, contentOffset, contentSize);
    let text = new TextDecoder(decoder).decode(bytes);
    
    const nullIndex = text.indexOf('\0');
    if (nullIndex !== -1) text = text.substring(0, nullIndex);
    
    return text.trim() || undefined;
  };

  if (pendingSongs.length > 0) {
    const currentPending = pendingSongs[currentIndex];
    const moodOptions: SongMood[] = ['happy', 'sad', 'calm', 'excited', 'none'];

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-slate-100 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 w-80">
          <div className="text-center mb-4">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">选择歌曲情绪</span>
            <div className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              ({currentIndex + 1} / {pendingSongs.length})
            </div>
          </div>
          
          <div className="bg-slate-200 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
            <div className="text-slate-900 dark:text-white font-medium truncate">{currentPending.title}</div>
            <div className="text-slate-500 dark:text-slate-400 text-sm truncate">{currentPending.artist}</div>
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
          </div>
          
          <div className="text-slate-500 text-xs text-center">
            选择"暂无"将歌曲移入随便听听
          </div>
        </div>
      </div>
    );
  }

  if (currentMood !== 'random') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🎶</span>
          <span className="text-slate-500 dark:text-slate-400">选择情绪查看推荐</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <label className="flex flex-col items-center justify-center w-64 h-64 
        border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl
        hover:border-blue-500 hover:bg-slate-200/30 dark:hover:bg-slate-700/30
        transition-all duration-300 cursor-pointer">
        <span className="text-6xl mb-4">📁</span>
        <span className="text-slate-900 dark:text-white font-medium">导入本地音乐</span>
        <span className="text-slate-500 dark:text-slate-400 text-sm mt-1">支持 MP3 格式</span>
        <input
          type="file"
          accept="audio/mp3"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
