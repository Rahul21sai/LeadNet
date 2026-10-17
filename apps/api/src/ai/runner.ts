import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { AiRunDoc, AiTask, VerifierCheck } from '@leadnet/shared';
import { env } from '../env.ts';
import type { Store } from '../services/store.ts';
import type { Upload } from '../services/media.ts';
import type { AiProvider } from './client.ts';
import { sanitize } from './verify/index.ts';
import { ApiFault } from '../services/errors.ts';

export interface AiResult<T> { value: T; run: AiRunDoc }

export async function runAi<T>(options: {
  store: Store; provider: AiProvider; task: AiTask; schema: z.ZodType<T>; prompt: string;
  summary: string; media?: Upload[]; checks: (value: T) => VerifierCheck[];
  fallback: T; fallbackChecks?: (value: T) => VerifierCheck[]; now: () => number; issueId?: string; mock?: boolean; timeoutMs?: number;
}): Promise<AiResult<T>> {
  const started = Date.now();
  const model = env.models[options.task];
  let attempts = 0; let value = sanitize(options.fallback); let fallbackUsed = true; let fallbackInvalid = false;
  let checks: VerifierCheck[] = []; let repairError = ''; const tokens = { input: null as number | null, output: null as number | null };
  const schema = z.toJSONSchema(options.schema); delete schema.$schema;
  if (!options.mock) for (let i = 0; i < 2; i++) {
    attempts++;
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const output = await Promise.race([
        options.provider.generate({ task: options.task, model, prompt: options.prompt, schema, media: options.media ?? [], ...(repairError ? { repairError } : {}) }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('AI deadline exceeded')), Math.min(9000, Math.max(1, options.timeoutMs ?? 9000))); }),
      ]).finally(() => { if (timer) clearTimeout(timer); });
      if (output.tokens) { tokens.input = (tokens.input ?? 0) + (output.tokens.input ?? 0); tokens.output = (tokens.output ?? 0) + (output.tokens.output ?? 0); }
      const result = options.schema.safeParse(output.value);
      if (!result.success) { checks.push({ name: `attempt_${attempts}_schema`, passed: false }); repairError = 'Output did not match the required schema.'; continue; }
      const clean = sanitize(result.data);
      const taskChecks = options.checks(clean);
      checks.push({ name: `attempt_${attempts}_schema`, passed: true }, ...taskChecks.map((check) => ({ ...check, name: `attempt_${attempts}_${check.name}` })));
      if (taskChecks.some((check) => !check.passed)) { repairError = taskChecks.filter((check) => !check.passed).map((check) => check.name).join(', '); continue; }
      value = clean; fallbackUsed = false; break;
    } catch {
      checks.push({ name: `attempt_${attempts}_available`, passed: false });
      repairError = 'No valid JSON response was available.';
    }
  }
  if (fallbackUsed) {
    const result = options.schema.safeParse(value);
    const taskChecks = result.success ? (options.fallbackChecks ?? options.checks)(result.data) : [];
    checks.push({ name: 'fallback_schema', passed: result.success }, ...taskChecks.map((check) => ({ ...check, name: `fallback_${check.name}` })), { name: options.mock ? 'offline_fallback' : 'deterministic_fallback', passed: true });
    fallbackInvalid = !result.success || taskChecks.some((check) => !check.passed);
  }
  const run: AiRunDoc = { id: nanoid(), task: options.task, model, promptVersion: 'leadnet-v1', inputSummary: options.summary, output: fallbackInvalid ? null : value, checks, attempts, fallbackUsed, latencyMs: Date.now() - started, tokens, createdAt: options.now(), issueId: options.issueId ?? null, public: false };
  await options.store.set(`aiRuns/${run.id}`, run);
  if (fallbackInvalid) throw new ApiFault(503, 'fallback_unavailable', 'A safe response could not be produced. Please try again.');
  return { value, run };
}
