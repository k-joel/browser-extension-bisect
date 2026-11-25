import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const METHOD_STORED = 0;

/** MS-DOS date/time, which is the only timestamp a ZIP entry can carry. */
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function collectFiles(root) {
  const files = [];
  const walk = (directory, prefix) => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(absolute, relative);
      else if (entry.isFile()) files.push({ absolute, relative });
    }
  };
  walk(root, '');
  return files;
}

/**
 * Writes a ZIP with stored (uncompressed) entries. Firefox only needs a valid
 * archive whose root holds `manifest.json`; compression would save a few hundred
 * kilobytes and cost a dependency, so stored entries are the right trade here.
 */
export function writeZip(entries, destination) {
  const parts = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const data = fs.readFileSync(entry.absolute);
    const name = Buffer.from(entry.relative.replace(/\\/g, '/'), 'utf8');
    const checksum = zlib.crc32(data);
    const { time, day } = dosDateTime(entry.mtime ?? new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_HEADER_SIGNATURE, 0);
    local.writeUInt16LE(ZIP_VERSION, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(METHOD_STORED, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    parts.push(local, name, data);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(CENTRAL_HEADER_SIGNATURE, 0);
    header.writeUInt16LE(ZIP_VERSION, 4);
    header.writeUInt16LE(ZIP_VERSION, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(METHOD_STORED, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(day, 14);
    header.writeUInt32LE(checksum, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    offset += local.length + name.length + data.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.concat([...parts, centralBuffer, end]));
  return destination;
}

/** Packs a built extension directory into an `.xpi`, which is a plain ZIP. */
export function buildXpi(buildDir, destination) {
  if (!fs.existsSync(path.join(buildDir, 'manifest.json'))) {
    throw new Error(`No manifest.json in ${buildDir}; build the Firefox target first`);
  }
  const files = collectFiles(buildDir).map((entry) => ({
    ...entry,
    mtime: fs.statSync(entry.absolute).mtime,
  }));
  return writeZip(files, destination);
}
