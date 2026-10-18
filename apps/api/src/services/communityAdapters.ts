import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '../env.ts';
import { ApiFault } from './errors.ts';
import type { Upload } from './media.ts';

export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
export interface EmailDelivery { to: string; subject: string; text: string; idempotencyKey: string; attachment?: { bytes: Buffer; mimeType: string } }
export interface EmailProvider { available(): boolean; send(input: EmailDelivery): Promise<string> }
export interface VideoUpload extends Upload { durationSeconds: number }
export interface VideoProcessor { available(): boolean; prepare(file: File): Promise<VideoUpload> }

export function validateVideoContainer(bytes: Buffer): void {
  const mp4 = bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp';
  const webm = bytes.length >= 4 && bytes.readUInt32BE(0) === 0x1a45dfa3;
  if (!mp4 && !webm) throw new ApiFault(422, 'invalid_video', 'The upload is not a supported video container.');
}

export const emailProvider: EmailProvider = {
  available: () => !!env.resendApiKey && /^[^\r\n]+@[^\r\n]+$/.test(env.emailFrom) && /^https:\/\//.test(env.publicAppUrl),
  async send(input) {
    if (!this.available()) throw new ApiFault(503, 'email_unavailable', 'Direct email needs a configured mail provider and verified sending domain. You can still copy your reviewed draft.');
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(12_000), headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': input.idempotencyKey }, body: JSON.stringify({ from: env.emailFrom, to: [input.to], subject: input.subject, text: input.text, ...(input.attachment ? { attachments: [{ filename: 'namma-civic-issue.jpg', content: input.attachment.bytes.toString('base64'), content_type: input.attachment.mimeType }] } : {}) }) });
    } catch { throw new ApiFault(503, 'email_delivery_pending', 'The mail provider did not confirm delivery. Retry this same request to check it safely.'); }
    if (!response.ok) throw new ApiFault(503, 'email_delivery_pending', 'The mail provider did not confirm delivery. Retry this same request to check it safely.');
    const value = await response.json() as { id?: unknown };
    if (typeof value.id !== 'string' || !value.id) throw new ApiFault(503, 'email_delivery_pending', 'A mail receipt was not returned. Retry this same request.');
    return value.id;
  },
};

let ffmpegAvailable: boolean | undefined;
function ffmpegExists() {
  if (ffmpegAvailable === undefined) {
    const result = spawnSync(env.ffmpegPath, ['-version'], { windowsHide: true, timeout: 2000, maxBuffer: 16_384 });
    ffmpegAvailable = !result.error && result.status === 0;
  }
  return ffmpegAvailable;
}

async function ffmpeg(args: string[], input?: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.ffmpegPath, args, { windowsHide: true, stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let diagnostic = ''; let done = false; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 45_000);
    function finish(error?: Error) { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(diagnostic); }
    child.stderr?.on('data', (chunk: Buffer) => { diagnostic = (diagnostic + chunk.toString()).slice(-32_768); });
    child.stdin?.on('error', () => {});
    if (input) child.stdin?.end(input);
    child.on('error', () => finish(new ApiFault(503, 'video_unavailable', 'Video processing is unavailable. Attach a photo instead.')));
    child.on('close', (code) => finish(timedOut ? new ApiFault(503, 'video_processing_timeout', 'This video took too long to process. Try a shorter recording.') : code === 0 ? undefined : new ApiFault(422, 'invalid_video', 'This video could not be decoded. Use a short MP4, WebM, or MOV recording.')));
  });
}

export const videoProcessor: VideoProcessor = {
  available: ffmpegExists,
  async prepare(file) {
    if (!this.available()) throw new ApiFault(503, 'video_unavailable', 'Video requires the server video processor. Attach a photo instead.');
    if (file.size > MAX_VIDEO_BYTES) throw new ApiFault(413, 'video_too_large', 'Videos must be 20 MB or smaller.');
    if (!['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'].includes(file.type.split(';')[0]!)) throw new ApiFault(415, 'unsupported_video', 'Use an MP4, WebM, or MOV video.');
    const bytes = Buffer.from(await file.arrayBuffer());
    validateVideoContainer(bytes);
    const directory = await mkdtemp(join(tmpdir(), 'leadnet-video-'));
    try {
      const output = join(directory, 'output.webm');
      await ffmpeg(['-hide_banner', '-nostdin', '-v', 'error', '-protocol_whitelist', 'pipe', '-i', 'pipe:0', '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_chapters', '-1', '-vf', 'scale=720:720:force_original_aspect_ratio=decrease,fps=24', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '1200k', '-c:a', 'libopus', '-b:a', '64k', '-t', '31', '-fs', String(MAX_VIDEO_BYTES), '-y', output], bytes);
      const info = await stat(output);
      if (!info.size || info.size >= MAX_VIDEO_BYTES - 4096) throw new ApiFault(413, 'video_too_large', 'The processed video is too large. Try a shorter recording.');
      const diagnostic = await ffmpeg(['-hide_banner', '-nostdin', '-i', output, '-f', 'null', '-']);
      const match = diagnostic.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      const durationSeconds = match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
      if (!(durationSeconds > 0 && durationSeconds <= MAX_VIDEO_SECONDS + 0.25)) throw new ApiFault(422, 'video_too_long', 'Videos must be 30 seconds or shorter.');
      return { bytes: await readFile(output), mimeType: 'video/webm', durationSeconds };
    } finally { await rm(directory, { recursive: true, force: true }); }
  },
};
