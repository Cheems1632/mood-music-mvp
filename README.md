# MoodMusic - 基于情绪的智能音乐播放器

## 项目简介

MoodMusic 是一个基于情绪的智能音乐播放器，支持根据用户当前情绪推荐音乐，同时支持自定义情绪创建、进度条自由跳转、明暗主题切换等功能。

## 运行环境

### 操作系统
- Windows 10/11 (x64)
- macOS (可选，需配置打包)
- Linux (可选，需配置打包)

### 依赖包与版本

| 依赖 | 版本 | 说明 |
|------|------|------|
| React | ^18.2.0 | 前端框架 |
| React DOM | ^18.2.0 | DOM 渲染 |
| Zustand | ^4.5.2 | 状态管理 |
| Electron | ^42.5.0 | 桌面应用框架 |
| Electron Builder | ^26.15.3 | 打包工具 |
| Vite | ^5.1.4 | 构建工具 |
| TypeScript | ^5.3.3 | 类型语言 |
| TailwindCSS | ^3.4.1 | CSS 框架 |
| IDB | ^8.0.0 | IndexedDB 封装 |
| Capacitor | ^8.4.1 | 移动端支持 |

## 安装与启动步骤

### 开发模式

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 或启动 Electron 开发模式
npm run electron:dev
```

### 生产构建

```bash
# 构建前端资源
npm run build

# 打包为 Windows 应用
npm run electron:build
```

### 启动打包后的应用

打包完成后，可在以下目录找到应用程序：

- **解压版**: `dist-electron/win-unpacked/MoodMusic.exe`
- **便携版**: `dist-electron/MoodMusic-1.0.0-Portable.exe`

## 关键模块文件索引

### 核心组件

| 文件路径 | 说明 |
|----------|------|
| `src/App.tsx` | 主应用组件，整合所有模块 |
| `src/components/MoodSelector.tsx` | 情绪选择器组件，支持自定义情绪 |
| `src/components/PlayerControls.tsx` | 播放控制栏组件，包含进度条 |
| `src/components/FullScreenPlayer.tsx` | 全屏播放器组件 |
| `src/components/PlaylistView.tsx` | 播放列表视图组件 |
| `src/components/SongCard.tsx` | 歌曲卡片组件 |
| `src/components/SongListItem.tsx` | 歌曲列表项组件 |
| `src/components/ThemeToggle.tsx` | 主题切换按钮组件 |
| `src/components/FileImporter.tsx` | 文件导入组件 |
| `src/components/PlaylistQueue.tsx` | 播放队列组件 |

### 状态管理

| 文件路径 | 说明 |
|----------|------|
| `src/stores/moodStore.ts` | 情绪状态管理（自定义情绪、当前情绪） |
| `src/stores/playerStore.ts` | 播放器状态管理（播放状态、进度等） |
| `src/stores/libraryStore.ts` | 音乐库状态管理（歌曲列表） |
| `src/stores/themeStore.ts` | 主题状态管理（明暗主题） |

### 工具函数与钩子

| 文件路径 | 说明 |
|----------|------|
| `src/hooks/useAudioPlayer.ts` | 音频播放器核心钩子，管理全局音频对象 |
| `src/hooks/useRecommend.ts` | 音乐推荐钩子，根据情绪推荐歌曲 |
| `src/hooks/useBehaviorLogger.ts` | 行为日志钩子 |
| `src/utils/fileImport.ts` | 文件导入工具，解析音频文件信息 |
| `src/db/index.ts` | 数据库操作，支持 IndexedDB 和内存存储 |

### 常量与类型

| 文件路径 | 说明 |
|----------|------|
| `src/types/index.ts` | TypeScript 类型定义 |
| `src/constants/moodMapping.ts` | 情绪映射配置（预定义情绪、标签） |
| `src/constants/moods.ts` | 情绪常量定义 |
| `src/constants/sampleSongs.ts` | 示例歌曲数据 |

## 功能特性

1. **情绪推荐**: 根据用户选择的情绪（快乐、悲伤、平静、兴奋等）推荐对应歌曲
2. **自定义情绪**: 支持创建自定义情绪名称、选择表情和颜色
3. **进度控制**: 支持自由跳转歌曲进度，拖动进度条精确调整
4. **主题切换**: 支持白天/黑夜主题切换，按钮显示当前主题状态
5. **响应式布局**: 适配桌面端和移动端设备
6. **封面展示**: 读取并展示歌曲封面信息
7. **播放队列**: 支持管理播放队列

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: TailwindCSS 3
- **状态管理**: Zustand
- **数据库**: IndexedDB (IDB) + 内存存储降级
- **桌面端**: Electron
- **移动端**: Capacitor (Android)

## 项目结构

```
mood-music-mvp/
├── src/
│   ├── components/       # React 组件
│   ├── constants/        # 常量配置
│   ├── db/               # 数据库操作
│   ├── hooks/            # 自定义钩子
│   ├── stores/           # Zustand 状态管理
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   ├── App.tsx           # 主应用组件
│   ├── index.css         # 全局样式
│   └── main.tsx          # 应用入口
├── electron/             # Electron 主进程
├── public/               # 静态资源
├── dist/                 # 构建输出
├── dist-electron/        # Electron 打包输出
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 配置
└── tailwind.config.js    # TailwindCSS 配置
```
