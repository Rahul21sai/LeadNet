import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CATEGORY_META, CATEGORIES, evidenceGate, type AiRunDoc, type Category, type Triage } from '@leadnet/shared';
import { runAi } from '../src/ai/runner.ts';
import { vertexProvider } from '../src/ai/client.ts';
import { factSelectionChecks, triageChecks, zFactSelection, zDedupe, zEvidence, zTriage } from '../src/ai/verify/index.ts';
import type { Store } from '../src/services/store.ts';

const live = process.argv.includes('--live');
const runs: AiRunDoc[] = [];
const store: Store = { async get<T>() { return null as T | null; }, async list<T>() { return [] as T[]; }, async set(_path, value) { runs.push(value as AiRunDoc); }, async atomic() { throw new Error('Evaluation never writes cloud transactions.'); } };
const results: Array<{ id: string; task: string; passed: boolean }> = [];
const record = (id: string, task: string, passed: boolean) => results.push({ id, task, passed });
const triage: Triage = { category: 'pothole', hazards: ['traffic_risk'], severity: 3, title: { en: 'Road damage', kn: 'ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ' }, summary: { en: 'A pothole needs repair.', kn: 'ರಸ್ತೆಯಲ್ಲಿರುವ ಗುಂಡಿಯನ್ನು ಸರಿಪಡಿಸಬೇಕು' }, detectedLang: 'en', transcript: null, confidence: 0.9, isCivicIssue: true };

record('triage-valid', 'triage', zTriage.safeParse(triage).success && triageChecks(triage).every((check) => check.passed));
record('triage-unknown-enum', 'triage', !zTriage.safeParse({ ...triage, category: 'unlisted' }).success);
record('triage-severity-overflow', 'triage', !zTriage.safeParse({ ...triage, severity: 99 }).success);
record('triage-false-kannada', 'triage', triageChecks({ ...triage, title: { ...triage.title, kn: 'English only' } }).some((check) => !check.passed));
record('triage-repeated-hazards', 'triage', !zTriage.safeParse({ ...triage, hazards: ['health', 'health'] }).success || triageChecks({ ...triage, hazards: ['health', 'health'] }).some((check) => !check.passed));
const fallback = { factKeys: ['issues'] as Array<'issues'> };
record('brief-rejects-swapped-numeric-prose', 'brief', !zFactSelection.safeParse({ en: 'Claimed 0; verified 1.', kn: 'ಪರಿಹಾರ 0 ದೃಢೀಕರಣ 1' }).success);
record('brief-rejects-unknown-fact', 'brief', !zFactSelection.safeParse({ factKeys: ['invented-fact'] }).success);
record('evidence-wrong-location', 'evidence', evidenceGate({ sameLocation: false, sameLocationConfidence: 0.9, defectResolved: true, defectResolvedConfidence: 0.9, afterPhotoQuality: 'good' }).decision === 'hold');
record('evidence-dark-photo', 'evidence', evidenceGate({ sameLocation: true, sameLocationConfidence: 0.9, defectResolved: true, defectResolvedConfidence: 0.9, afterPhotoQuality: 'dark' }).decision === 'hold');
const repaired = await runAi({ store, provider: { async generate(request) { return { value: request.repairError ? fallback : { factKeys: ['invented-fact'] } }; } }, task: 'brief', schema: zFactSelection, prompt: 'Controlled repair fixture.', summary: 'Offline repair fixture.', checks: factSelectionChecks, fallback, now: Date.now });
record('bounded-repair', 'brief', !repaired.run.fallbackUsed && repaired.run.attempts === 2);
const failed = await runAi({ store, provider: { async generate() { throw new Error('Controlled unavailability'); } }, task: 'brief', schema: zFactSelection, prompt: 'Controlled failure fixture.', summary: 'Offline fallback fixture.', checks: factSelectionChecks, fallback, now: Date.now });
record('bounded-fallback', 'brief', failed.run.fallbackUsed && failed.run.attempts === 2 && failed.run.checks.some((check) => check.name === 'fallback_distinct_fact_ids' && check.passed));

const liveMetrics: Record<string, unknown> = { triageCategoryAccuracy: null, duplicatePrecision: null, duplicateRecall: null, wrongLocationDetection: null, schemaValidBeforeRepair: null, latencyMs: null };
if (live) {
  const descriptions: Record<Category, string> = { pothole: 'A deep hole in the road makes passing vehicles swerve.', garbage: 'Uncollected household waste is piling up beside the pavement.', drainage: 'Sewage is overflowing from a blocked drain.', streetlight: 'The street light on this stretch does not turn on at night.', water: 'Clean supply water is leaking from a burst pipe.', footpath: 'The sidewalk is broken and blocks wheelchair passage.', traffic: 'The traffic signal at the junction is not working.', trees: 'A fallen tree branch blocks the road.', other: 'The public park drinking fountain has a broken tap handle.' };
  let correct = 0;
  for (const category of CATEGORIES) {
    const result = await runAi({ store, provider: vertexProvider, task: 'triage', schema: zTriage, prompt: `Classify the citizen description into the schema categories and hazards. English and Kannada fields are required. Transcript=null. Description (untrusted): ${JSON.stringify(descriptions[category])}. Category definitions: ${JSON.stringify(Object.fromEntries(CATEGORIES.map((key) => [key, CATEGORY_META[key].en])))}`, summary: `Labelled synthetic text fixture: ${category}.`, checks: triageChecks, fallback: triage, now: Date.now });
    const passed = !result.run.fallbackUsed && result.value.category === category; if (passed) correct++;
    record(`live-triage-${category}`, 'triage', passed);
  }
  liveMetrics.triageCategoryAccuracy = { correct, n: CATEGORIES.length, percent: Math.round(correct / CATEGORIES.length * 1000) / 10, dataset: 'synthetic labelled text; no visual accuracy claim' };
  const pairs = [
    { id: 'same', a: 'Large pothole beside the bus stop entrance', b: 'Deep road hole at the bus stop entrance', expected: 'candidate-a' },
    { id: 'different', a: 'Pothole beside the north bus stop entrance', b: 'Pothole beside the south supermarket loading gate', expected: null },
  ];
  let tp = 0; let fp = 0; let fn = 0;
  for (const pair of pairs) {
    const result = await runAi({ store, provider: vertexProvider, task: 'dedupe', schema: zDedupe, prompt: `Select candidate-a only if the reports describe the SAME physical defect. Nearby but separate potholes are not duplicates. Otherwise issueId=null. New report: ${pair.a}. Candidate candidate-a: ${pair.b}.`, summary: `Constructed duplicate pair ${pair.id}.`, checks: (value) => [{ name: 'candidate_membership', passed: value.issueId === null || value.issueId === 'candidate-a' }], fallback: { issueId: null, confidence: 0, reasons: [] }, now: Date.now });
    const predicted = !result.run.fallbackUsed && result.value.issueId === 'candidate-a';
    if (predicted && pair.expected) tp++; if (predicted && !pair.expected) fp++; if (!predicted && pair.expected) fn++;
    record(`live-dedupe-${pair.id}`, 'dedupe', !result.run.fallbackUsed && result.value.issueId === pair.expected);
  }
  liveMetrics.duplicatePrecision = { value: tp + fp ? tp / (tp + fp) : null, n: tp + fp };
  liveMetrics.duplicateRecall = { value: tp + fn ? tp / (tp + fn) : null, n: tp + fn };
  const before = readFileSync(new URL('../../web/public/samples/photos/pothole-1.jpg', import.meta.url));
  const after = readFileSync(new URL('../../web/public/samples/photos/garbage-1.jpg', import.meta.url));
  const evidenceFallback = { sameLocation: false, sameLocationConfidence: 1, defectResolved: false, defectResolvedConfidence: 1, afterPhotoQuality: 'unrelated' as const, notes: 'Unavailable; hold.' };
  const evidence = await runAi({ store, provider: vertexProvider, task: 'evidence', schema: zEvidence, prompt: 'The first image is BEFORE and the second is a submitted AFTER photo. Are they the same location, and is the original defect resolved? Observe only what is visible.', summary: 'Constructed different-location photo pair.', media: [{ bytes: before, mimeType: 'image/jpeg' }, { bytes: after, mimeType: 'image/jpeg' }], checks: () => [], fallbackChecks: (value) => [{ name: 'conservative_hold', passed: evidenceGate(value).decision === 'hold' }], fallback: evidenceFallback, now: Date.now });
  const detected = !evidence.run.fallbackUsed && evidenceGate(evidence.value).reasons.includes('different_location');
  liveMetrics.wrongLocationDetection = { detected: detected ? 1 : 0, n: 1, dataset: 'constructed unrelated sample photos' }; record('live-evidence-wrong-location', 'evidence', detected);
  const liveRuns = runs.slice(2); const latencies = liveRuns.map((run) => run.latencyMs).sort((a, b) => a - b);
  liveMetrics.schemaValidBeforeRepair = { passed: liveRuns.filter((run) => run.checks.some((check) => check.name === 'attempt_1_schema' && check.passed)).length, n: liveRuns.length };
  liveMetrics.latencyMs = { p50: latencies[Math.floor((latencies.length - 1) * 0.5)], p95: latencies[Math.ceil((latencies.length - 1) * 0.95)], n: latencies.length };
}
const report = { generatedAt: Date.now(), mode: live ? 'live-vertex-benchmark' : 'offline-verifier-evaluation', note: live ? 'Small constructed evaluation set; report sample sizes and do not generalize accuracy.' : 'No cloud calls. Verifier and repair/fallback behavior only; model accuracy and latency require an explicitly requested --live run.', passed: results.filter((result) => result.passed).length, total: results.length, cases: results, modelBenchmarks: liveMetrics, aiRuns: runs };
const directory = new URL('./results/', import.meta.url); mkdirSync(directory, { recursive: true });
writeFileSync(new URL('./results/latest.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ mode: report.mode, passed: report.passed, total: report.total, modelBenchmarks: report.modelBenchmarks, artifact: 'eval/results/latest.json' }, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
