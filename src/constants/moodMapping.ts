import { MoodMapping, MoodType } from '@/types';

export const MOOD_MAPPINGS: Record<MoodType, MoodMapping> = {
  happy: {
    mood: 'happy',
    label: '欢快',
    emoji: '😊',
    color: 'bg-yellow-500',
    tags: ['轻快', '欢乐', '高能量', '流行'],
  },
  sad: {
    mood: 'sad',
    label: '悲伤',
    emoji: '😢',
    color: 'bg-blue-500',
    tags: ['舒缓', '忧伤', '慢节奏', '民谣'],
  },
  calm: {
    mood: 'calm',
    label: '平静',
    emoji: '😌',
    color: 'bg-green-500',
    tags: ['安静', '冥想', '氛围', '钢琴'],
  },
  excited: {
    mood: 'excited',
    label: '激昂',
    emoji: '🔥',
    color: 'bg-red-500',
    tags: ['震撼', '摇滚', '电子', '史诗'],
  },
  random: {
    mood: 'random',
    label: '随便听听',
    emoji: '🎲',
    color: 'bg-gray-500',
    tags: [],
  },
};

export const MOOD_LIST: MoodType[] = ['happy', 'sad', 'calm', 'excited', 'random'];
