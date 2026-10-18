import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { createFrontendServer } from './server.mjs';

let directory, server, port;
const html = '<!doctype html><title>Namma Civic</title>';
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'namma-cloudrun-server-'));
  await mkdir(join(directory, 'assets'));
  await mkdir(join(directory, 'data'));
  await writeFile(join(directory, 'index.html'), html);
  await writeFile(join(directory, 'assets', 'app-hash.js'), 'window.demo = true;');
  await writeFile(join(directory, 'assets', 'app-hash.js.gz'), gzipSync('window.demo = true;'));
  await writeFile(join(directory, 'data', 'wards.geojson'), '{"type":"FeatureCollection","features":[]}');
  await writeFile(join(directory, '.env'), 'private fixture');
  server = await createFrontendServer(directory);
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  port = server.address().port;
});
after(async () => {
  await new Promise((done) => server.close(done));
  assert.ok(resolve(directory).startsWith(join(tmpdir(), 'namma-cloudrun-server-')));
  await rm(directory, { recursive: true, force: true });
});
function get(path, headers = {}, method = 'GET') {
  return new Promise((done, reject) => {
    request({ host: '127.0.0.1', port, path, method, headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => done({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject).end();
  });
}
test('serves HTML and deep links without stale HTML caching', async () => {
  for (const path of ['/', '/map', '/people', '/issue/demo-issue-007']) {
    const result = await get(path);
    assert.equal(result.status, 200); assert.equal(result.body.toString(), html);
    assert.equal(result.headers['cache-control'], 'no-store');
  }
});
test('does not turn API or missing asset requests into successful HTML', async () => {
  for (const path of ['/api', '/api/v1/community/capabilities', '/assets/missing.js', '/data/missing', '/samples/missing']) {
    const result = await get(path);
    assert.equal(result.status, 404); assert.match(result.headers['content-type'], /application\/json/);
  }
});
test('serves asset types and immutable bundle cache headers', async () => {
  const js = await get('/assets/app-hash.js');
  assert.match(js.headers['content-type'], /text\/javascript/);
  assert.match(js.headers['cache-control'], /immutable/);
  assert.match((await get('/data/wards.geojson')).headers['content-type'], /application\/geo\+json/);
});
test('serves precompressed files with the original MIME type', async () => {
  const result = await get('/assets/app-hash.js', { 'Accept-Encoding': 'gzip' });
  assert.equal(result.headers['content-encoding'], 'gzip');
  assert.match(result.headers['content-type'], /text\/javascript/);
  assert.equal(result.headers.vary, 'Accept-Encoding');
});
test('respects explicitly disabled compression encodings', async () => {
  const result = await get('/assets/app-hash.js', { 'Accept-Encoding': 'br;q=0, gzip;q=0' });
  assert.equal(result.headers['content-encoding'], undefined);
  assert.equal(result.body.toString(), 'window.demo = true;');
});
test('rejects traversal, encoded separators, dotfiles and malformed paths', async () => {
  for (const path of ['/%2e%2e/server.mjs', '/%2eenv', '/%2e%2e%5cserver.mjs', '/%00', '/%FF', '//server/share']) {
    assert.ok([400, 404].includes((await get(path)).status), path);
  }
});
test('HEAD returns headers without transferring a body', async () => {
  const result = await get('/', {}, 'HEAD');
  assert.equal(result.status, 200); assert.equal(result.body.length, 0);
  assert.equal(Number(result.headers['content-length']), Buffer.byteLength(html));
});
test('rejects mutations and provides a frontend-only health endpoint', async () => {
  assert.equal((await get('/', {}, 'POST')).status, 405);
  const result = await get('/healthz');
  assert.equal(result.status, 200); assert.equal(JSON.parse(result.body).mode, 'device-demo');
});
test('never lists an existing static directory', async () => {
  assert.equal((await get('/assets/')).status, 404);
});
