import assert from 'node:assert/strict';

const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) throw new Error('Pass the frontend origin to verify.');
const routes = ['/', '/map', '/people', '/city', '/ledger', '/how-it-works', '/issue/demo-issue-007', '/pass/demo-issue-007', '/ward/w-central-1', '/projects/demo-project-001'];
for (const route of routes) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 200, route);
  assert.match(response.headers.get('content-type'), /text\/html/, route);
  assert.match(await response.text(), /Namma Civic/, route);
}
const data = await fetch(new URL('/data/wards.geojson', origin));
assert.equal(data.status, 200);
assert.equal((await data.json()).features.length, 369);
for (const route of ['/api', '/api/v1/community/capabilities', '/assets/missing-file.js']) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 404, route);
  await response.arrayBuffer();
}
for (const route of ['/favicon.svg', '/og.png', '/samples/photos/pothole-3-before.jpg', '/samples/audio/kn-pothole-mg-road.mp3']) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 200, route);
  await response.arrayBuffer();
}
console.log(`Frontend verified at ${origin}: 10 SPA routes, 369 wards, media and API/missing-file 404s.`);
