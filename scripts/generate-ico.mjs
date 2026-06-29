import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');

function createICO(pngFiles) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngFiles.length, 4);

  const dirEntries = [];
  const imageData = [];
  let offset = 6 + pngFiles.length * 16;

  for (const pngBuffer of pngFiles) {
    const png = PNG.sync.read(pngBuffer);
    const width = png.width;
    const height = png.height;
    const bpp = 32;
    const imageSize = pngBuffer.length;

    const dirEntry = Buffer.alloc(16);
    dirEntry.writeUInt8(width >= 256 ? 0 : width, 0);
    dirEntry.writeUInt8(height >= 256 ? 0 : height, 1);
    dirEntry.writeUInt8(0, 2);
    dirEntry.writeUInt8(0, 3);
    dirEntry.writeUInt16LE(1, 4);
    dirEntry.writeUInt16LE(bpp, 6);
    dirEntry.writeUInt32LE(imageSize, 8);
    dirEntry.writeUInt32LE(offset, 12);
    dirEntries.push(dirEntry);

    imageData.push(pngBuffer);
    offset += imageSize;
  }

  return Buffer.concat([header, ...dirEntries, ...imageData]);
}

function generateICO() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngPath = resolve(publicDir, `icon-${size}.png`);
    const buffer = readFileSync(pngPath);
    pngBuffers.push(buffer);
    console.log(`Loaded icon-${size}.png`);
  }

  const icoBuffer = createICO(pngBuffers);
  const icoPath = resolve(publicDir, 'icon.ico');
  writeFileSync(icoPath, icoBuffer);
  console.log(`Generated icon.ico at ${icoPath}`);
}

generateICO();