/** Runtime configuration. Everything has a safe default so local dev needs no .env. */
export const env = {
  port: Number(process.env.PORT ?? 8080),
  projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'leadnet-blr',
  /** Vertex AI location for Gemini calls ('global' gives the widest model availability). */
  vertexLocation: process.env.VERTEX_LOCATION ?? 'global',
  storageBucket: process.env.STORAGE_BUCKET ?? 'leadnet-blr.firebasestorage.app',
  region: process.env.K_SERVICE ? (process.env.REGION ?? 'asia-south1') : 'local',
  version: process.env.K_REVISION ?? 'dev',
  /** Model ids are configurable so a retired model never needs a code change. */
  models: {
    triage: process.env.MODEL_TRIAGE ?? 'gemini-2.5-flash',
    dedupe: process.env.MODEL_DEDUPE ?? 'gemini-2.5-flash',
    evidence: process.env.MODEL_EVIDENCE ?? 'gemini-2.5-flash',
    brief: process.env.MODEL_BRIEF ?? 'gemini-2.5-flash',
  },
  /** When true, AI calls return deterministic fixtures (offline dev / tests). */
  aiMock: process.env.AI_MOCK === '1',
  /** Allows the demo role switcher (officer persona). On for the hackathon deployment. */
  demoMode: process.env.DEMO_MODE !== '0',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,https://leadnet-blr.web.app,https://leadnet-blr.firebaseapp.com').split(','),
};
