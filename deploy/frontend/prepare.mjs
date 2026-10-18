import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['run', 'build', '-w', '@leadnet/web'], {
  cwd: root, env: { ...process.env, VITE_DEMO_MODE: '1' }, stdio: 'inherit',
  ...(process.platform === 'win32' ? { shell: true } : {}),
});
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(root, 'tmp', 'cloudrun-frontend', stamp);
await mkdir(target, { recursive: true });
await cp(join(root, 'apps/web/dist'), join(target, 'public'), { recursive: true });
for (const file of ['Dockerfile', 'server.mjs']) await cp(join(root, 'deploy/frontend', file), join(target, file));
await writeFile(join(target, '.gcloudignore'), '.gcloudignore\n');
let compressedFiles = 0;
async function compress(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, item.name);
    if (item.isDirectory()) { await compress(file); continue; }
    if (!['.html', '.js', '.css', '.json', '.geojson', '.svg', '.md', '.txt'].includes(extname(file))) continue;
    const bytes = await readFile(file);
    if (bytes.length < 1024) continue;
    await writeFile(file + '.gz', gzipSync(bytes, { level: 9 }));
    await writeFile(file + '.br', brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }));
    compressedFiles++;
  }
}
await compress(join(target, 'public'));
const prepared = { project: 'leadnet-blr', region: 'asia-south1', service: 'namma-civic-web', mode: 'device-demo', sourceDirectory: target, preparedAt: new Date().toISOString(), compressedFiles };
await writeFile(join(root, 'tmp/cloudrun-frontend/latest.json'), JSON.stringify(prepared, null, 2) + '\n');
console.log(JSON.stringify(prepared, null, 2));
