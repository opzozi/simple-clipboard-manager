import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releasesDir = path.join(rootDir, 'releases');

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

function listFiles(dir, prefix = '') {
  const entries = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      entries.push(...listFiles(full, rel));
    } else {
      entries.push({ full, rel: rel.replace(/\\/g, '/') });
    }
  }
  return entries;
}

function writeZip(files, outPath) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const data = fs.readFileSync(file.full);
    const name = Buffer.from(file.rel, 'utf8');
    const crc = crc32(data);
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      compressed,
    ]);
    chunks.push(local);
    central.push(Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]));
    offset += local.length;
  }

  const centralDir = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  fs.writeFileSync(outPath, Buffer.concat([...chunks, centralDir, end]));
}

if (!fs.existsSync(distDir)) {
  console.error('dist/ is missing. Run npm run build first.');
  process.exit(1);
}

const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('dist/manifest.json is missing.');
  process.exit(1);
}

const { version } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const files = listFiles(distDir);
if (files.length === 0) {
  console.error('dist/ is empty.');
  process.exit(1);
}

fs.mkdirSync(releasesDir, { recursive: true });
const outName = `simple-clipboard-manager-${version}.zip`;
const outPath = path.join(releasesDir, outName);
if (fs.existsSync(outPath)) {
  fs.unlinkSync(outPath);
}

writeZip(files, outPath);
console.log(`Wrote ${path.relative(rootDir, outPath)} (${fs.statSync(outPath).size} bytes, ${files.length} files)`);
