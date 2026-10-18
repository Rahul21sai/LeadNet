import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { env } from './env.ts';

const app = createApp();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(JSON.stringify({ severity: 'INFO', message: `Namma Civic API listening on :${info.port}`, region: env.region }));
});
