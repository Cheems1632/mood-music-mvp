export type MoodType = 'happy' | 'sad' | 'calm' | 'excited' | 'random';

// 内部情绪标记（用于歌曲分类，'none' 表示未分类，移入随便听听）
export type SongMood = MoodType | 'none';

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  tags: string[];
  playCount: number;
  skipCount: number;
  isExample: boolean;
  duration?: number;
  mood?: SongMood; // 歌曲的情绪分类
  cover?: string; // 专辑封面 URL（Blob URL 或默认占位）
  coverData?: Uint8Array; // 封面图片原始数据（用于持久化）
  coverMimeType?: string; // 封面图片 MIME 类型
}

export interface BehaviorLog {
  id: string;
  songId: string;
  action: 'play' | 'skip';
  timestamp: number;
  duration: number;
}

export interface MoodMapping {
  mood: MoodType;
  label: string;
  emoji: string;
  color: string;
  tags: string[];
}

export interface MoodConfig {
  name: string;
  emoji: string;
  color: string;
  glowColor: string;
  tags: string[];
}
