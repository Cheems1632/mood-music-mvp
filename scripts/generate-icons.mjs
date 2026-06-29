import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

async function generateIcons() {
  const svgPath = resolve(projectRoot, 'public', 'icon.svg');
  const publicDir = resolve(projectRoot, 'public');

  console.log('Generating icons from:', svgPath);

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
  
  for (const size of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(resolve(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  await sharp(svgPath)
    .resize(256, 256)
    .png()
    .toFile(resolve(publicDir, 'icon.png'));
  console.log('Generated icon.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);