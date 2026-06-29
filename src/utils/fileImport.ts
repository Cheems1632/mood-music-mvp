import { Filesystem, Directory, type ReadFileResult } from '@capacitor/filesystem';

export interface SongFileData {
  name: string;
  arrayBuffer: ArrayBuffer;
}

export async function selectFilesWeb(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3';
    input.multiple = true;
    input.onchange = () => {
      resolve(Array.from(input.files || []));
    };
    input.click();
  });
}

export async function selectFilesCapacitor(): Promise<SongFileData[]> {
  const result = await Filesystem.readdir({
    path: '',
    directory: Directory.Documents,
  });

  const audioFiles: SongFileData[] = [];
  for (const file of result.files) {
    if (file.name.toLowerCase().endsWith('.mp3')) {
      try {
        const readResult = await Filesystem.readFile({
          path: file.name,
          directory: Directory.Documents,
        });
        
        const data = (readResult as ReadFileResult).data;
        const bytes = typeof data === 'string' ? base64ToArrayBuffer(data) : await blobToArrayBuffer(data as Blob);
        audioFiles.push({
          name: file.name,
          arrayBuffer: bytes
        });
      } catch (error) {
        console.error('Failed to read file:', file.name, error);
      }
    }
  }
  
  return audioFiles;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}