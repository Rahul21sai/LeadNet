import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setDefaultResultOrder } from 'node:dns';

const projectDir = dirname(fileURLToPath(import.meta.url));
process.env.HYPERFRAMES_NO_TELEMETRY = '1';
process.env.DO_NOT_TRACK = '1';
setDefaultResultOrder('ipv4first');
const runtimeDir = join(projectDir, 'runtime');
if (existsSync(runtimeDir)) {
  const ffmpegDir = readdirSync(runtimeDir).find((name) =>
    existsSync(join(runtimeDir, name, 'bin', 'ffmpeg.exe')),
  );
  if (ffmpegDir) {
    process.env.PATH = [join(runtimeDir, ffmpegDir, 'bin'), process.env.PATH ?? ''].join(delimiter);
  }
}
await import('./node_modules/hyperframes/bin/hyperframes.mjs');
