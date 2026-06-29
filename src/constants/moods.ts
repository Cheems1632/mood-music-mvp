import { MoodConfig, MoodType } from '@/types';

export const MOODS: Record<MoodType, MoodConfig> = {
  happy: {
    name: '欢快',
    emoji: '😊',
    color: 'bg-yellow-500',
    glowColor: 'shadow-yellow-500/50',
    tags: ['轻快', '欢乐', '高能量', '流行'],
  },
  sad: {
    name: '悲伤',
    emoji: '😢',
    color: 'bg-blue-500',
    glowColor: 'shadow-blue-500/50',
    tags: ['舒缓', '忧伤', '慢节奏', '民谣'],
  },
  calm: {
    name: '平静',
    emoji: '😌',
    color: 'bg-green-500',
    glowColor: 'shadow-green-500/50',
    tags: ['安静', '冥想', '氛围', '钢琴'],
  },
  excited: {
    name: '激昂',
    emoji: '🔥',
    color: 'bg-red-500',
    glowColor: 'shadow-red-500/50',
    tags: ['震撼', '摇滚', '电子', '史诗'],
  },
  random: {
    name: '随便听听',
    emoji: '🎲',
    color: 'bg-gray-500',
    glowColor: 'shadow-gray-500/50',
    tags: [],
  },
};

export const MOOD_LIST: MoodType[] = ['happy', 'sad', 'calm', 'excited', 'random'];
