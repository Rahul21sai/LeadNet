import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { HealthResponse } from '@leadnet/shared';
import { env } from './env.ts';

/**
 * Route modules (owned by the API agent) are mounted under /api/v1.
 * Firebase Hosting rewrites /api/** to this service, so paths keep the /api prefix.
 */
export function createApp() {
  const app = new Hono();

  app.use('*', secureHeaders());
  app.use('/api/*', cors({ origin: env.allowedOrigins, allowHeaders: ['Authorization', 'Content-Type'], allowMethods: ['GET', 'POST', 'OPTIONS'] }));

  app.get('/api/v1/health', (c) =>
    c.json<HealthResponse>({ ok: true, version: env.version, region: env.region, model: env.models.triage, time: Date.now() }),
  );

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));
  app.onError((err, c) => {
    console.error(JSON.stringify({ severity: 'ERROR', message: err.message, stack: err.stack, path: c.req.path }));
    return c.json({ error: { code: 'internal', message: 'Something went wrong' } }, 500);
  });

  return app;
}
