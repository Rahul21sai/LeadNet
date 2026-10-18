import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

export async function createFrontendServer(directory) {
  const root = await realpath(directory);
  const index = resolve(root, 'index.html');
  if (!(await stat(index)).isFile()) throw new Error('Frontend index.html is missing.');

  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const json = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return json(405, { error: { code: 'method_not_allowed', message: 'This service serves a static frontend.' } });
    }
    let pathname;
    try { pathname = decodeURIComponent((request.url ?? '/').split('?')[0]); }
    catch { return json(400, { error: { code: 'invalid_path', message: 'Invalid request path.' } }); }
    if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\\\0]/.test(pathname) || pathname.split('/').some((segment) => segment.startsWith('.'))) {
      return json(404, { error: { code: 'not_found', message: 'Not found.' } });
    }
    if (pathname === '/healthz') return json(200, { status: 'ok', service: 'namma-civic-frontend', mode: 'device-demo' });
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return json(404, { error: { code: 'frontend_only', message: 'The connected API is not deployed on this frontend-only service.' } });
    }
    try {
      let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      let info;
      try { info = await stat(file); }
      catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
      if (!info && !extname(pathname) && !pathname.startsWith('/assets/') && !pathname.startsWith('/data/') && !pathname.startsWith('/samples/')) {
        file = index;
        info = await stat(index);
      }
      if (!info?.isFile()) return json(404, { error: { code: 'not_found', message: 'Not found.' } });
      file = await realpath(file);
      if (!file.startsWith(root + sep)) return json(404, { error: { code: 'not_found', message: 'Not found.' } });
      const extension = extname(file).toLowerCase();
      const cache = extension === '.html' ? 'no-store' : pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300';
      const accepted = request.headers['accept-encoding'] ?? '';
      const qualities = new Map(accepted.split(',').map((part) => {
        const [name, ...parameters] = part.trim().toLowerCase().split(';');
        const value = parameters.find((item) => item.trim().startsWith('q='));
        const quality = value ? Number(value.trim().slice(2)) : 1;
        return [name, Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0];
      }));
      let encoding;
      const encodings = [['br', '.br'], ['gzip', '.gz']]
        .map(([name, suffix]) => ({ name, suffix, quality: qualities.get(name) ?? qualities.get('*') ?? 0 }))
        .filter((item) => item.quality > 0).sort((a, b) => b.quality - a.quality);
      for (const { name, suffix } of encodings) {
        try {
          const packed = await realpath(file + suffix);
          if (!packed.startsWith(root + sep)) continue;
          const compressed = await stat(packed);
          if (compressed.isFile()) { file = packed; info = compressed; encoding = name; break; }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      response.writeHead(200, {
        'Content-Type': types[extension] ?? 'application/octet-stream',
        'Content-Length': info.size, 'Cache-Control': cache, Vary: 'Accept-Encoding',
        ...(encoding ? { 'Content-Encoding': encoding } : {}),
      });
      if (request.method === 'HEAD') return response.end();
      createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch {
      if (response.headersSent) return response.destroy();
      json(500, { error: { code: 'server_error', message: 'Unable to serve the frontend.' } });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.env.STATIC_DIR ?? fileURLToPath(new URL('./public', import.meta.url));
  const port = Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const server = await createFrontendServer(root);
  server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ message: 'Namma Civic frontend ready', port, mode: 'device-demo' })));
  process.on('SIGTERM', () => server.close());
}
