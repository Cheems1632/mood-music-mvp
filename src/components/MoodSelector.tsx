import { useState } from 'react';
import { useMoodStore } from '@/stores/moodStore';
import { useThemeStore } from '@/stores/themeStore';
import { MOOD_MAPPINGS, MOOD_LIST } from '@/constants/moodMapping';

const EMOTIONS = ['😊', '😢', '😌', '🔥', '🎯', '💪', '🌟', '💖', '🎶', '🌙'];
const COLORS = ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];

export function MoodSelector() {
  const { currentMood, setMood, customMoods, addCustomMood } = useMoodStore();
  const { theme } = useThemeStore();
  const [showModal, setShowModal] = useState(false);
  const [newMoodName, setNewMoodName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleAddMood = () => {
    if (!newMoodName.trim()) return;
    addCustomMood({
      label: newMoodName.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
    });
    setShowModal(false);
    setNewMoodName('');
    setSelectedEmoji(EMOTIONS[0]);
    setSelectedColor(COLORS[0]);
  };

  // 获取所有情绪列表（自定义情绪 + 原始情绪）
  const allMoods = [
    ...MOOD_LIST.filter(m => m !== 'random'), // 排除随便听听
    ...customMoods.map(m => ({ type: 'custom', ...m })),
    'random', // 随便听听放在最后
  ];

  return (
    <>
      <div className="flex justify-center gap-2 sm:gap-3 lg:gap-4 flex-wrap">
        {allMoods.map((mood) => {
          if (typeof mood === 'string') {
            // 原始情绪
            const mapping = MOOD_MAPPINGS[mood as keyof typeof MOOD_MAPPINGS];
            const isSelected = currentMood === mood;

            return (
              <button
                key={mood}
                onClick={() => setMood(mood)}
                className={`
                  flex flex-col items-center justify-center
                  w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-xl lg:rounded-2xl
                  transition-all duration-300 ease-out
                  ${isSelected 
                    ? `${mapping.color} scale-110 shadow-lg shadow-black/30 brightness-110` 
                    : theme === 'dark' ? 'bg-slate-700 opacity-50 hover:opacity-70' : 'bg-gray-600 opacity-50 hover:opacity-70'
                  }
                `}
              >
                <span className="text-2xl sm:text-3xl">{mapping.emoji}</span>
                <span className="text-xs font-medium text-white lg:block hidden">{mapping.label}</span>
              </button>
            );
          } else {
            // 自定义情绪
            const isSelected = currentMood === mood.id;

            return (
              <button
                key={mood.id}
                onClick={() => setMood(mood.id)}
                className={`
                  flex flex-col items-center justify-center
                  w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-xl lg:rounded-2xl
                  transition-all duration-300 ease-out
                  ${isSelected 
                    ? `${mood.color} scale-110 shadow-lg shadow-black/30 brightness-110` 
                    : theme === 'dark' ? 'bg-slate-700 opacity-50 hover:opacity-70' : 'bg-gray-600 opacity-50 hover:opacity-70'
                  }
                `}
              >
                <span className="text-2xl sm:text-3xl">{mood.emoji}</span>
                <span className="text-xs font-medium text-white lg:block hidden">{mood.label}</span>
              </button>
            );
          }
        })}

        {/* 添加情绪按钮 */}
        <button
          onClick={() => setShowModal(true)}
          className={`
            flex flex-col items-center justify-center
            w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-xl lg:rounded-2xl
            transition-all duration-300 ease-out
            border-2 border-dashed
            ${theme === 'dark' ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300' : 'border-gray-500 text-gray-400 hover:border-gray-400 hover:text-gray-300'}
          `}
        >
          <span className="text-2xl sm:text-3xl">+</span>
          <span className="text-xs font-medium lg:block hidden">添加</span>
        </button>
      </div>

      {/* 添加情绪模态框 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl w-full max-w-md mx-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              添加新情绪
            </h3>

            {/* 输入情绪名称 */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                情绪名称
              </label>
              <input
                type="text"
                value={newMoodName}
                onChange={(e) => setNewMoodName(e.target.value)}
                placeholder="请输入情绪名称"
                className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-100 border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                maxLength={10}
              />
            </div>

            {/* 选择表情 */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                选择表情
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${selectedEmoji === emoji ? 'bg-blue-500 scale-110' : theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* 选择颜色 */}
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

            {/* 预览 */}
            <div className="mb-6 p-4 rounded-xl bg-gray-100 dark:bg-slate-700">
              <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>预览效果</p>
              <div className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center ${selectedColor}`}>
                <span className="text-2xl">{selectedEmoji}</span>
                <span className="text-xs font-medium text-white">{newMoodName || '新情绪'}</span>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                取消
              </button>
              <button
                onClick={handleAddMood}
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
