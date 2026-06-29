import { useMemo } from 'react';
import { useMoodStore } from '@/stores/moodStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { MOOD_MAPPINGS } from '@/constants/moodMapping';
import { Song, MoodType } from '@/types';

export function useRecommend() {
  const { currentMood, customMoods } = useMoodStore();
  const { songs } = useLibraryStore();

  const recommendations = useMemo(() => {
    if (songs.length === 0) return [];

    // 各栏目播放列表不互通
    // happy/sad/calm/excited 只显示对应情绪的歌曲
    // random 显示 mood 为 'none' 或未分类的歌曲
    
    if (currentMood === 'random') {
      // 随便听听：显示 mood 为 'none' 或未设置的歌曲
      const randomSongs = songs.filter(song => 
        song.mood === 'none' || song.mood === undefined
      );
      return [...randomSongs].sort((a, b) => b.playCount - a.playCount);
    }

    // 检查是否是自定义情绪
    const customMood = customMoods.find(m => m.id === currentMood);
    
    if (customMood) {
      // 自定义情绪：根据标签匹配歌曲（使用自定义情绪的名称作为标签）
      const customLabel = customMood.label.toLowerCase();
      const customMoodSongs = songs.filter(song => 
        song.mood === 'none' || 
        song.mood === undefined ||
        song.tags.some((tag: string) => tag.toLowerCase().includes(customLabel))
      );
      
      if (customMoodSongs.length === 0) return customMoodSongs;
      
      // 按标签匹配度排序
      return [...customMoodSongs].sort((a, b) => {
        const aMatch = a.tags.filter((tag: string) => tag.toLowerCase().includes(customLabel)).length;
        const bMatch = b.tags.filter((tag: string) => tag.toLowerCase().includes(customLabel)).length;
        if (bMatch !== aMatch) return bMatch - aMatch;
        return b.playCount - a.playCount;
      });
    }

    // 预定义情绪：只显示对应情绪的歌曲
    const moodSongs = songs.filter(song => song.mood === currentMood);
    
    if (moodSongs.length === 0) return [];

    const moodTags = MOOD_MAPPINGS[currentMood as keyof typeof MOOD_MAPPINGS]?.tags || [];

    return [...moodSongs].map((song) => {
      const tagMatchCount = song.tags.filter((tag: string) => moodTags.includes(tag)).length;
      return { song, score: tagMatchCount };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return b.song.playCount - a.song.playCount;
    })
    .map(item => item.song);
  }, [songs, currentMood, customMoods]);

  return recommendations;
}

export function recommendSong(songs: Song[], currentMood: MoodType | string, customMoods?: { id: string; label: string }[]): Song | null {
  if (songs.length === 0) return null;

  // 过滤对应情绪的歌曲
  let filteredSongs: Song[];
  
  if (currentMood === 'random') {
    filteredSongs = songs.filter(song => 
      song.mood === 'none' || song.mood === undefined
    );
  } else {
    filteredSongs = songs.filter(song => song.mood === currentMood);
  }

  if (filteredSongs.length === 0) return null;

  if (currentMood === 'random') {
    const sorted = [...filteredSongs].sort((a, b) => b.playCount - a.playCount);
    const totalWeight = sorted.reduce((sum, s) => sum + (s.playCount + 1), 0);
    let random = Math.random() * totalWeight;
    for (const song of sorted) {
      random -= (song.playCount + 1);
      if (random <= 0) return song;
    }
    return sorted[0];
  }

  // 检查是否是自定义情绪（id 是时间戳字符串，不是预定义情绪类型）
  const isCustomMood = !['happy', 'sad', 'calm', 'excited', 'energetic', 'romantic', 'melancholic', 'relaxed', 'focused', 'random'].includes(currentMood);
  
  if (isCustomMood && customMoods) {
    // 自定义情绪：根据标签匹配
    const customMood = customMoods.find(m => m.id === currentMood);
    if (!customMood) return null;
    
    const customLabel = customMood.label.toLowerCase();
    const customMoodSongs = songs.filter(song => 
      song.mood === 'none' || 
      song.mood === undefined ||
      song.tags.some((tag: string) => tag.toLowerCase().includes(customLabel))
    );
    
    if (customMoodSongs.length === 0) return null;
    
    // 按标签匹配度排序
    const scored = customMoodSongs.map(song => ({
      song,
      score: song.tags.filter((tag: string) => tag.toLowerCase().includes(customLabel)).length,
    }));
    
    scored.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return b.song.playCount - a.song.playCount;
    });
    
    return scored[0].song;
  }

  const moodTags = MOOD_MAPPINGS[currentMood as keyof typeof MOOD_MAPPINGS]?.tags || [];
  
  const scored = filteredSongs
    .map(song => ({
      song,
      score: song.tags.filter((tag: string) => moodTags.includes(tag)).length,
    }));

  if (scored.length === 0) return null;

  scored.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return b.song.playCount - a.song.playCount;
  });

  return scored[0].song;
}