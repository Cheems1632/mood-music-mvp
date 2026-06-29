import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件对话框
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  
  // 文件操作
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  getFileInfo: (filePath) => ipcRenderer.invoke('file:getInfo', filePath),
  
  // 平台信息
  platform: process.platform,
  
  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

console.log('[Preload] Electron API exposed to renderer');
