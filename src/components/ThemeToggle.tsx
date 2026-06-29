import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-300 cursor-pointer
        ${isDark 
          ? 'bg-slate-700 hover:bg-slate-600 text-white' 
          : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
        }`}
      title={isDark ? '点击切换到白天模式' : '点击切换到黑夜模式'}
    >
      <span className="text-xl">
        {isDark ? '🌙' : '☀️'}
      </span>
      <span className="text-sm font-medium">
        {isDark ? '黑夜模式' : '白天模式'}
      </span>
    </button>
  );
}
