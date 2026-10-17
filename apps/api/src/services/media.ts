import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { bucket } from './firebase.ts';
import { ApiFault } from './errors.ts';

export interface Upload { bytes: Buffer; mimeType: string; width?: number; height?: number }
export interface MediaStore {
  save(path: string, upload: Upload): Promise<{ path: string; url: string }>;
  read(path: string): Promise<Upload>;
  publish(path: string): Promise<void>;
}

let sampleHashes: Set<string> | undefined;
export async function isKnownSample(file: File | undefined): Promise<boolean> {
  if (!file) return false;
  if (!sampleHashes) {
    const paths = [new URL('../../data/sample-media.json', import.meta.url), new URL('../data/sample-media.json', import.meta.url)];
    const path = paths.find((candidate) => existsSync(candidate));
    const manifest = path ? JSON.parse(readFileSync(path, 'utf8')) as { samples: Array<{ sha256: string }> } : { samples: [] };
    sampleHashes = new Set(manifest.samples.map((sample) => sample.sha256));
  }
  return sampleHashes.has(createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'));
}

export const storageMedia: MediaStore = {
  async save(path, upload) {
    const target = bucket();
    await target.file(path).save(upload.bytes, { resumable: false, contentType: upload.mimeType, metadata: { cacheControl: path.startsWith('evidence/') ? 'public,max-age=31536000,immutable' : 'private,no-store', metadata: { published: 'false' } } });
    return { path, url: `https://firebasestorage.googleapis.com/v0/b/${target.name}/o/${encodeURIComponent(path)}?alt=media` };
  },
  async read(path) {
    if (!/^(drafts|evidence)\/[^/]+\/[^/]+$/.test(path)) throw new ApiFault(400, 'invalid_media_path', 'Invalid evidence path');
    const file = bucket().file(path);
    const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
    return { bytes, mimeType: metadata.contentType ?? 'image/jpeg' };
  },
  async publish(path) {
    if (!/^evidence\/[^/]+\/[^/]+\.jpg$/.test(path)) throw new ApiFault(400, 'invalid_media_path', 'Only committed photo evidence can be published.');
    await bucket().file(path).setMetadata({ metadata: { published: 'true' } });
  },
};

export async function preparePhoto(file: File): Promise<Upload> {
  if (file.size > 8 * 1024 * 1024) throw new ApiFault(413, 'photo_too_large', 'Photos must be 8 MB or smaller.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)) throw new ApiFault(415, 'unsupported_photo', 'Use a JPEG, PNG, WebP, or HEIC photo.');
  try {
    const result = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, animated: false }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer({ resolveWithObject: true });
    return { bytes: result.data, mimeType: 'image/jpeg', width: result.info.width, height: result.info.height };
  } catch {
    throw new ApiFault(422, 'invalid_photo', 'This photo could not be decoded. Try another image.');
  }
}

export async function prepareAudio(file: File): Promise<Upload> {
  if (file.size > 2 * 1024 * 1024) throw new ApiFault(413, 'audio_too_large', 'Voice notes must be 2 MB or smaller.');
  const mimeType = file.type.split(';')[0]!;
  if (!['audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4'].includes(mimeType)) throw new ApiFault(415, 'unsupported_audio', 'Use a supported audio recording.');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) throw new ApiFault(422, 'invalid_audio', 'The voice recording is empty.');
  const duration = audioDuration(bytes, mimeType);
  if (duration === null || !Number.isFinite(duration)) throw new ApiFault(422, 'audio_duration_unknown', 'Could not verify the recording length. Record a voice note in the app or use a WAV file.');
  if (duration > 30.25 || duration <= 0) throw new ApiFault(422, 'audio_too_long', 'Voice notes must be 30 seconds or shorter.');
  return { bytes, mimeType: mimeType === 'audio/x-wav' ? 'audio/wav' : mimeType };
}

function audioDuration(bytes: Buffer, mimeType: string): number | null {
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') {
    let rate = 0; let data = 0;
    for (let i = 12; i + 8 <= bytes.length;) {
      const size = bytes.readUInt32LE(i + 4); const tag = bytes.toString('ascii', i, i + 4);
      if (i + 8 + size > bytes.length) return null;
      if (tag === 'fmt ' && size >= 16) rate = bytes.readUInt32LE(i + 16);
      if (tag === 'data') data += size;
      i += 8 + size + (size % 2);
    }
    return rate ? data / rate : null;
  }
  if (mimeType === 'audio/ogg' && bytes.toString('ascii', 0, 4) === 'OggS') {
    const opus = bytes.indexOf('OpusHead'); const vorbis = bytes.indexOf('vorbis');
    const rate = opus >= 0 ? 48_000 : vorbis >= 0 && vorbis + 15 <= bytes.length ? bytes.readUInt32LE(vorbis + 11) : 0;
    let granule = 0;
    for (let i = 0; i + 27 <= bytes.length;) {
      if (bytes.toString('ascii', i, i + 4) !== 'OggS') return null;
      const segments = bytes[i + 26]!; if (i + 27 + segments > bytes.length) return null;
      const position = bytes.readBigInt64LE(i + 6); if (position >= 0) granule = Math.max(granule, Number(position));
      let length = 0; for (let j = 0; j < segments; j++) length += bytes[i + 27 + j]!;
      i += 27 + segments + length;
    }
    return rate ? granule / rate : null;
  }
  if (mimeType === 'audio/webm') return webmDuration(bytes);
  if (mimeType === 'audio/mp4') return mp4Duration(bytes);
  if (mimeType === 'audio/mpeg') {
    let seconds = 0; let frames = 0; let i = bytes.toString('ascii', 0, 3) === 'ID3' && bytes.length >= 10 ? 10 + ((bytes[6]! & 127) << 21 | (bytes[7]! & 127) << 14 | (bytes[8]! & 127) << 7 | bytes[9]! & 127) : 0;
    for (; i + 4 < bytes.length;) {
      const header = bytes.readUInt32BE(i); if ((header & 0xffe00000) >>> 0 !== 0xffe00000) { i++; continue; }
      const version = (header >>> 19) & 3; const layer = (header >>> 17) & 3; const bitrateIndex = (header >>> 12) & 15; const sampleIndex = (header >>> 10) & 3;
      if (version === 1 || layer !== 1 || bitrateIndex < 1 || bitrateIndex > 14 || sampleIndex === 3) { i++; continue; }
      const rate = [44100, 48000, 32000][sampleIndex]! / (version === 3 ? 1 : version === 2 ? 2 : 4);
      const bitrate = (version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex]! * 1000;
      const length = Math.floor((version === 3 ? 144 : 72) * bitrate / rate) + ((header >>> 9) & 1);
      if (i + length > bytes.length) break;
      seconds += (version === 3 ? 1152 : 576) / rate; frames++; i += length;
    }
    return frames ? seconds : null;
  }
  return null;
}

function mp4Duration(bytes: Buffer): number | null {
  if (bytes.length < 12 || bytes.toString('ascii', 4, 8) !== 'ftyp') return null;
  let duration: number | null = null;
  function scan(start: number, end: number, depth: number) {
    if (depth > 8) return;
    for (let at = start; at + 8 <= end;) {
      let size = bytes.readUInt32BE(at); let headerSize = 8;
      if (size === 1) { if (at + 16 > end) return; size = Number(bytes.readBigUInt64BE(at + 8)); headerSize = 16; }
      if (size === 0) size = end - at;
      if (!Number.isSafeInteger(size) || size < headerSize || at + size > end) return;
      const tag = bytes.toString('ascii', at + 4, at + 8); const begin = at + headerSize; const finish = at + size;
      if (['moov', 'trak', 'mdia'].includes(tag)) scan(begin, finish, depth + 1);
      if (tag === 'mvhd' || tag === 'mdhd') {
        const version = bytes[begin]; const scaleAt = begin + (version === 1 ? 20 : 12); const durationAt = scaleAt + 4;
        if ((version === 0 || version === 1) && durationAt + (version === 1 ? 8 : 4) <= finish) {
          const scale = bytes.readUInt32BE(scaleAt); const units = version === 1 ? Number(bytes.readBigUInt64BE(durationAt)) : bytes.readUInt32BE(durationAt);
          if (scale && units && units !== 0xffffffff && Number.isSafeInteger(units)) duration = Math.max(duration ?? 0, units / scale);
        }
      }
      at = finish;
    }
  }
  scan(0, bytes.length, 0);
  return duration;
}

function webmDuration(bytes: Buffer): number | null {
  let scale = 1_000_000; let last = 0; let cluster = 0; let found = false;
  const containers = new Set([0x1a45dfa3, 0x18538067, 0x1549a966, 0x1f43b675]);
  function readVint(at: number, keep: boolean) {
    const first = bytes[at]; if (!first) return null;
    let length = 1; while (length <= 8 && !(first & (1 << (8 - length)))) length++;
    if (length > 8 || at + length > bytes.length) return null;
    let value = keep ? first : first & ((1 << (8 - length)) - 1);
    for (let j = 1; j < length; j++) value = value * 256 + bytes[at + j]!;
    return { value, length, unknown: !keep && value === 2 ** (7 * length) - 1 };
  }
  function scan(start: number, end: number, depth: number) {
    if (depth > 8) return;
    for (let offset = start; offset < end;) {
      const id = readVint(offset, true); if (!id) return; const size = readVint(offset + id.length, false); if (!size) return;
      const begin = offset + id.length + size.length; const finish = size.unknown ? end : Math.min(end, begin + size.value);
      if (finish <= begin) { offset = begin; continue; }
      if (containers.has(id.value)) scan(begin, finish, depth + 1);
      else if (id.value === 0x2ad7b1 && finish - begin <= 6) { scale = bytes.readUIntBE(begin, finish - begin); }
      else if (id.value === 0xe7 && finish - begin <= 6) { cluster = bytes.readUIntBE(begin, finish - begin); }
      else if (id.value === 0xa3 && finish - begin >= 4) { const track = readVint(begin, false); if (track && begin + track.length + 2 <= finish) { last = Math.max(last, cluster + bytes.readInt16BE(begin + track.length)); found = true; } }
      offset = finish;
    }
  }
  scan(0, bytes.length, 0);
  return found ? (last * scale / 1e9) + 0.02 : null;
}
