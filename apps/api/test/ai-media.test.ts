import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import type { AiRunDoc } from '@leadnet/shared';
import { runAi } from '../src/ai/runner.ts';
import { factSelectionChecks, zFactSelection } from '../src/ai/verify/index.ts';
import { isKnownSample, prepareAudio, preparePhoto } from '../src/services/media.ts';
import { MemoryStore } from './helpers.ts';

const fallback = { factKeys: ['issues'] as Array<'issues' | 'claimed'> };

describe('bounded AI runner', () => {
  it('records a failed-safe run even when a broken fallback is rejected', async () => {
    const store = new MemoryStore();
    await expect(runAi({ store, provider: { async generate() { throw new Error('Unavailable'); } }, task: 'brief', schema: zFactSelection, prompt: 'test', summary: 'Safe summary.', checks: factSelectionChecks, fallback: { factKeys: [] }, now: () => 1 })).rejects.toMatchObject({ code: 'fallback_unavailable' });
    expect(await store.list<AiRunDoc>('aiRuns')).toHaveLength(1);
    expect((await store.list<AiRunDoc>('aiRuns'))[0]?.output).toBeNull();
  });
  it('returns a safe fallback when a provider never settles', async () => {
    const store = new MemoryStore();
    const result = runAi({ store, provider: { generate: () => new Promise(() => {}) }, task: 'brief', schema: zFactSelection, prompt: 'test', summary: 'Safe summary.', checks: factSelectionChecks, fallback, now: () => 1, timeoutMs: 15 });
    const completed = await Promise.race([result.then((value) => value.run), new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), 400))]);
    expect(completed).toMatchObject({ attempts: 2, fallbackUsed: true });
  });
  it('verifies the fallback and keeps validated redacted output private even when linked to an issue', async () => {
    const store = new MemoryStore();
    const result = await runAi({ store, provider: { async generate() { return { value: { en: 'Contact demo@example.com: 99999 issues.', kn: 'ಒಟ್ಟು 99999 ಸಮಸ್ಯೆಗಳು ಇವೆ' } }; } }, task: 'brief', schema: zFactSelection, prompt: 'test', summary: 'Redacted summary.', checks: factSelectionChecks, fallback, now: () => 1, issueId: 'demo-issue' });
    expect(result.run).toMatchObject({ attempts: 2, fallbackUsed: true, public: false });
    expect(result.run.checks).toEqual(expect.arrayContaining([{ name: 'fallback_schema', passed: true }, { name: 'fallback_distinct_fact_ids', passed: true }]));
    const published = JSON.stringify(await store.get<AiRunDoc>(`aiRuns/${result.run.id}`));
    expect(published).not.toContain('demo@example.com'); expect(published).not.toContain('99999');
    expect(result.value).toEqual(fallback);
  });
  it('accepts a valid repair without replacing it with fallback text', async () => {
    const store = new MemoryStore(); let attempt = 0;
    const result = await runAi({ store, provider: { async generate() { attempt++; return { value: attempt === 1 ? { factKeys: ['invented-fact'] } : { factKeys: ['claimed'] } }; } }, task: 'brief', schema: zFactSelection, prompt: 'test', summary: 'Safe summary.', checks: factSelectionChecks, fallback, now: () => 1 });
    expect(result.run).toMatchObject({ attempts: 2, fallbackUsed: false });
    expect(result.value.factKeys).toEqual(['claimed']);
  });
});

function mp4(seconds: number) {
  function atom(name: string, bytes: Buffer) { const header = Buffer.alloc(8); header.writeUInt32BE(bytes.length + 8); header.write(name, 4); return Buffer.concat([header, bytes]); }
  const header = Buffer.alloc(24); header.writeUInt32BE(1000, 12); header.writeUInt32BE(seconds * 1000, 16);
  return Buffer.concat([atom('ftyp', Buffer.from('M4A \0\0\0\0M4A ')), atom('moov', atom('mvhd', header))]);
}

describe('upload privacy and limits', () => {
  it('recognizes a renamed supplied sample from original bytes', async () => {
    const bytes = readFileSync(new URL('../../web/public/samples/photos/pothole-1.jpg', import.meta.url));
    expect(await isKnownSample(new File([new Uint8Array(bytes)], 'my-renamed-photo.jpg', { type: 'image/jpeg' }))).toBe(true);
  });
  it('decodes and re-encodes a photo without retaining its EXIF metadata', async () => {
    const input = await sharp({ create: { width: 4, height: 3, channels: 3, background: 'white' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const result = await preparePhoto(new File([new Uint8Array(input)], 'before.jpg', { type: 'image/jpeg' }));
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.exif).toBeUndefined(); expect(metadata.orientation).toBeUndefined();
    expect(result.width).toBe(3); expect(result.height).toBe(4);
  });
  it('accepts a bounded Safari MP4 recording and rejects an overlong one', async () => {
    const valid = await prepareAudio(new File([new Uint8Array(mp4(15))], 'voice.m4a', { type: 'audio/mp4' }));
    expect(valid.mimeType).toBe('audio/mp4');
    await expect(prepareAudio(new File([new Uint8Array(mp4(31))], 'long.m4a', { type: 'audio/mp4' }))).rejects.toMatchObject({ code: 'audio_too_long' });
  });
  it('rejects unparseable audio instead of trusting its declared duration', async () => {
    await expect(prepareAudio(new File(['not audio'], 'voice.webm', { type: 'audio/webm' }))).rejects.toMatchObject({ code: 'audio_duration_unknown' });
  });
});
