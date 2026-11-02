import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Copy pdf.worker.min.mjs to public
const workerSrc = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, path.join(publicDir, 'pdf.worker.min.mjs'));
  console.log('Copied pdf.worker.min.mjs to public/');
}

// 2. Write SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5252" />
      <stop offset="100%" stop-color="#E5322D" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <!-- Document Shape -->
  <g filter="url(#shadow)" transform="translate(106, 86)">
    <path d="M 0,24 C 0,10.7 10.7,0 24,0 L 200,0 L 300,100 L 300,316 C 300,329.3 289.3,340 276,340 L 24,340 C 10.7,340 0,329.3 0,316 Z" fill="#FFFFFF" />
    <path d="M 200,0 L 300,100 L 220,100 C 209,100 200,91 200,80 Z" fill="#E2E8F0" />
    
    <!-- Lock / Shield Privacy Badge -->
    <circle cx="150" cy="190" r="54" fill="#FEF2F2" />
    <path d="M 134,180 L 134,166 C 134,157.2 141.2,150 150,150 C 158.8,150 166,157.2 166,166 L 166,180 Z" fill="none" stroke="#E5322D" stroke-width="8" stroke-linecap="round" />
    <rect x="126" y="180" width="48" height="40" rx="8" fill="#E5322D" />
    <circle cx="150" cy="198" r="4" fill="#FFFFFF" />
    <path d="M 150,202 L 150,210" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
    
    <!-- PDF Text -->
    <text x="150" y="278" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#E5322D" text-anchor="middle" letter-spacing="2">PRIVATE</text>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
console.log('Wrote public/icon.svg');

// Minimal pure-Node uncompressed/deflate PNG generator
function createPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth: 8
  ihdr.writeUInt8(2, 9); // color type: 2 (truecolor RGB)
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  // Raw image data: for each scanline, 1 filter byte (0) + width * 3 bytes
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // create a coral red gradient to darker red with a white sheet in center
      const inBox = x > width * 0.22 && x < width * 0.78 && y > height * 0.2 && y < height * 0.8;
      if (inBox) {
        // Inner white document
        const inBadge = Math.hypot(x - width * 0.5, y - height * 0.5) < width * 0.12;
        if (inBadge) {
          rawData[pixelOffset] = 229;     // #E5322D
          rawData[pixelOffset + 1] = 50;
          rawData[pixelOffset + 2] = 45;
        } else {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
        }
      } else {
        // Background coral red
        rawData[pixelOffset] = 229;
        rawData[pixelOffset + 1] = 50;
        rawData[pixelOffset + 2] = 45;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  // Precomputed CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
    }
    return (c ^ 0xffffffff) | 0;
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// CRC table calculation
const table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

const pwa192 = createPNG(192, 192, 229, 50, 45);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

const pwa512 = createPNG(512, 512, 229, 50, 45);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwa512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, 229, 50, 45));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pwa192);

console.log('Generated all PWA png and ico assets successfully!');
