import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { zAsk, zDemoRole, zFollow, zLatLng, zSubmitReport, zTransition, zCaptureLocation, zCommunityPost, zCommunityComment, zCommunityReaction, zCommunityEmail, zConnectionProfile, zSendConnection, zConnectionAction, type HealthResponse } from '@leadnet/shared';
import { env } from './env.ts';
import type { Identity } from './services/firebase.ts';
import { ApiFault } from './services/errors.ts';
import { runtime, type Runtime } from './services/context.ts';
import { draftReport, submitReport } from './services/reports.ts';
import { askLeadNet, demoRole, followIssue, officerQueue, resolveIssue, supportIssue, transitionIssue, verifyIssue } from './services/workflow.ts';
import { commentCommunityPost, communityCapabilities, composeCommunity, createCommunityPost, emailCommunityPost, reactCommunityPost } from './services/community.ts';
import { representativeLookup, representativeWardLookup } from './services/representatives.ts';
import { regionCreators } from './services/creators.ts';
import { actOnConnection, communityConnections, communityPeople, saveConnectionProfile, sendConnection } from './services/connections.ts';

function validated<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiFault(400, 'invalid_body', 'Check the submitted fields and try again.');
  return result.data;
}

function text(form: FormData, field: string): string | undefined {
  const value = form.get(field);
  if (value === null) return undefined;
  if (typeof value !== 'string' || form.getAll(field).length !== 1) throw new ApiFault(400, 'invalid_body', `Invalid ${field} field.`);
  return value;
}

function file(form: FormData, field: string): File | undefined {
  const value = form.get(field);
  if (value === null) return undefined;
  if (!(value instanceof File) || !value.size || form.getAll(field).length !== 1) throw new ApiFault(400, 'invalid_file', `Choose a valid ${field} file.`);
  return value;
}

/**
 * Route modules (owned by the API agent) are mounted under /api/v1.
 * Firebase Hosting rewrites /api/** to this service, so paths keep the /api prefix.
 */
export function createApp(options: Partial<Runtime> = {}) {
  const app = new Hono<{ Variables: { identity: Identity } }>();
  const r = runtime(options);

  app.use('*', secureHeaders());
  app.use('/api/*', cors({ origin: env.allowedOrigins, allowHeaders: ['Authorization', 'Content-Type'], allowMethods: ['GET', 'POST', 'OPTIONS'] }));

  app.get('/api/v1/health', (c) =>
    c.json<HealthResponse>({ ok: true, version: env.version, region: env.region, model: env.models.triage, time: Date.now() }),
  );
  app.get('/api/v1/community/capabilities', (c) => c.json(communityCapabilities(r)));
  app.get('/api/v1/community/people', async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(await communityPeople(r, c.req.query('wardId')));
  });
  app.get('/api/v1/community/representatives', (c) => {
    const wardId = c.req.query('wardId');
    if (wardId !== undefined) return c.json(representativeWardLookup(r.wards, validated(z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/), wardId)));
    const point = validated(zCaptureLocation.pick({ lat: true, lng: true }), { lat: Number(c.req.query('lat') ?? NaN), lng: Number(c.req.query('lng') ?? NaN) });
    return c.json(representativeLookup(r.wards, point.lat, point.lng));
  });

  app.use('/api/v1/community/connections', async (c, next) => { c.header('Cache-Control', 'private, no-store'); return next(); });
  app.use('/api/v1/community/connections/*', async (c, next) => { c.header('Cache-Control', 'private, no-store'); return next(); });
  app.use('/api/v1/*', async (c, next) => {
    if (c.req.method === 'OPTIONS') return next();
    const token = c.req.header('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) throw new ApiFault(401, 'unauthenticated', 'Sign in to continue.');
    c.set('identity', await r.auth.verify(token));
    return next();
  });
  app.use('/api/v1/*', async (c, next) => bodyLimit({ maxSize: (c.req.path === '/api/v1/community/posts' ? 22 : 11) * 1024 * 1024, onError: (ctx) => ctx.json({ error: { code: 'body_too_large', message: 'This upload exceeds the permitted size.' } }, 413) })(c, next));

  app.get('/api/v1/community/connections', async (c) => c.json(await communityConnections(r, c.get('identity'))));
  app.post('/api/v1/community/connections/profile', async (c) => c.json(await saveConnectionProfile(r, c.get('identity'), validated(zConnectionProfile, await c.req.json()))));
  app.post('/api/v1/community/connections', async (c) => c.json(await sendConnection(r, c.get('identity'), validated(zSendConnection, await c.req.json()).peerId)));
  app.post('/api/v1/community/connections/:id/action', async (c) => {
    const body = validated(zConnectionAction, await c.req.json());
    return c.json(await actOnConnection(r, c.get('identity'), c.req.param('id'), body.action, body.revision));
  });

  app.post('/api/v1/community/compose', async (c) => {
    const form = await c.req.formData();
    const location = text(form, 'location');
    return c.json(await composeCommunity(r, c.get('identity'), { text: text(form, 'text') ?? '', audio: file(form, 'audio'), photo: file(form, 'photo'), ...(location ? { location: validated(zCaptureLocation, JSON.parse(location)) } : {}), lang: validated(z.enum(['en', 'kn', 'hi']), text(form, 'lang') ?? 'en'), target: validated(z.enum(['post', 'comment']), text(form, 'target') ?? 'post') }));
  });
  app.post('/api/v1/community/posts', async (c) => {
    const form = await c.req.formData();
    const metadata = text(form, 'metadata');
    if (!metadata) throw new ApiFault(400, 'invalid_body', 'Post details are required.');
    return c.json(await createCommunityPost(r, c.get('identity'), validated(zCommunityPost, JSON.parse(metadata)), file(form, 'photo'), file(form, 'video')));
  });
  app.post('/api/v1/community/posts/:id/reaction', async (c) => c.json(await reactCommunityPost(r, c.get('identity'), c.req.param('id'), validated(zCommunityReaction, await c.req.json()).liked)));
  app.post('/api/v1/community/posts/:id/comments', async (c) => c.json(await commentCommunityPost(r, c.get('identity'), c.req.param('id'), validated(zCommunityComment, await c.req.json()))));
  app.post('/api/v1/community/email', async (c) => c.json(await emailCommunityPost(r, c.get('identity'), validated(zCommunityEmail, await c.req.json()))));

  app.post('/api/v1/reports/draft', async (c) => {
    const form = await c.req.formData();
    const coordinates = validated(zLatLng, { lat: Number(text(form, 'lat') ?? NaN), lng: Number(text(form, 'lng') ?? NaN) });
    const demo = text(form, 'demo');
    if (demo !== undefined && !['true', 'false'].includes(demo)) throw new ApiFault(400, 'invalid_demo', 'Invalid demo marker.');
    return c.json(await draftReport(r, c.get('identity'), { ...coordinates, text: text(form, 'text') ?? '', photo: file(form, 'photo'), audio: file(form, 'audio'), demo: demo === 'true' }));
  });
  app.post('/api/v1/reports', async (c) => c.json(await submitReport(r, c.get('identity'), validated(zSubmitReport, await c.req.json()))));
  app.post('/api/v1/issues/:id/support', async (c) => c.json(await supportIssue(r, c.get('identity'), c.req.param('id'))));
  app.post('/api/v1/issues/:id/follow', async (c) => c.json(await followIssue(r, c.get('identity'), c.req.param('id'), validated(zFollow, await c.req.json()).following)));
  app.post('/api/v1/issues/:id/transition', async (c) => {
    const body = validated(zTransition, await c.req.json());
    return c.json(await transitionIssue(r, c.get('identity'), c.req.param('id'), body.to, body.note));
  });
  app.post('/api/v1/issues/:id/resolution', async (c) => {
    const form = await c.req.formData(); const photo = file(form, 'photo');
    if (!photo) throw new ApiFault(400, 'photo_required', 'A resolution photo is required.');
    const override = text(form, 'override');
    if (override !== undefined && !['true', 'false'].includes(override)) throw new ApiFault(400, 'invalid_override', 'Invalid override choice.');
    return c.json(await resolveIssue(r, c.get('identity'), c.req.param('id'), { photo, note: text(form, 'note'), override: override === 'true', overrideReason: text(form, 'overrideReason') }));
  });
  app.post('/api/v1/issues/:id/verify', async (c) => {
    const form = await c.req.formData(); const vote = validated(z.enum(['confirm', 'dispute']), text(form, 'vote'));
    return c.json(await verifyIssue(r, c.get('identity'), c.req.param('id'), { vote, note: text(form, 'note'), photo: file(form, 'photo') }));
  });
  app.post('/api/v1/demo/role', async (c) => {
    const body = validated(zDemoRole, await c.req.json());
    return c.json(await demoRole(r, c.get('identity'), body.role, body.wardId));
  });
  app.get('/api/v1/officer/queue', async (c) => c.json(await officerQueue(r, c.get('identity'), c.req.query('wardId'))));
  app.get('/api/v1/officer/creators', async (c) => c.json(await regionCreators(r, c.get('identity'), c.req.query('wardId'))));
  app.post('/api/v1/ask', async (c) => {
    const body = validated(zAsk, await c.req.json());
    return c.json(await askLeadNet(r, body.question, body.wardId));
  });

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));
  app.onError((err, c) => {
    if (err instanceof ApiFault) return c.json({ error: { code: err.code, message: err.message } }, err.status);
    if (err instanceof SyntaxError || (err instanceof TypeError && /formdata|multipart|content-type/i.test(err.message))) return c.json({ error: { code: 'invalid_body', message: 'The request body could not be read.' } }, 400);
    console.error(JSON.stringify({ severity: 'ERROR', message: err.message, stack: err.stack, path: c.req.path }));
    return c.json({ error: { code: 'internal', message: 'Something went wrong' } }, 500);
  });

  return app;
}
