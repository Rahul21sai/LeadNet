import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geohashForLocation } from 'geofire-common';
import { CATEGORY_META, canTransition, computeLedger, computePriority, computeSla, evidenceGate, scrubPII, verificationOutcome, verificationQuorum } from '@leadnet/shared';
import type { ActorType, Bilingual, Category, EvidenceDoc, EventType, Hazard, IssueDoc, IssueEventDoc, LeaderDoc, LedgerDoc, ProjectDoc, ReportDoc, Role, Severity, Status, WardDoc } from '@leadnet/shared';
import { assertDemoPrefixes, assertSeedResetSafe } from './seedSafety.ts';

type Position = [number, number];
type Geometry = { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] };
interface WardFeature { type: 'Feature'; properties: { id: string; number: number; name_en: string; name_kn: string | null; zone: string | null; corporation: string | null; assembly: string | null; lx: number; ly: number }; geometry: Geometry }
interface Photo { id: string; kind: 'photo'; file: string; category: Category; role: string; width: number; height: number }
interface Support { issueId: string; uid: string; createdAt: number; isDemo: true }
interface Vote { issueId: string; uid: string; claimNo: number; vote: 'confirm' | 'dispute'; createdAt: number; isDemo: true }
type SeedReport = ReportDoc & { isDemo: true };
interface RecordRow { issue: IssueDoc; events: IssueEventDoc[]; evidence: EvidenceDoc[]; reports: SeedReport[]; supports: Support[]; votes: Vote[] }
interface SeedData { notice: string; generatedAt: number; seed: number; wards: WardDoc[]; issues: IssueDoc[]; histories: Record<string, { events: IssueEventDoc[]; evidence: EvidenceDoc[] }>; leaders: LeaderDoc[]; projects: ProjectDoc[]; ledger: LedgerDoc; reports: SeedReport[]; supports: Support[]; votes: Vote[] }

const root = fileURLToPath(new URL('../../../', import.meta.url));
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const fixedNow = Date.UTC(2026, 9, 17, 8);
const cli = process.argv.slice(2);
const option = (name: string) => { const index = cli.indexOf(name); return index < 0 ? undefined : cli[index + 1]; };
const now = option('--now') ? Date.parse(option('--now')!) : fixedNow;
assert.ok(Number.isFinite(now), '--now must be an ISO timestamp');
const apply = cli.includes('--apply');
const dryRun = cli.includes('--dry-run') || !apply;
if (apply && cli.includes('--dry-run')) throw new Error('Choose --dry-run or --apply');
if (cli.includes('--reset') && !apply) throw new Error('--reset requires explicit --apply');
const output = resolve(root, option('--out') ?? 'apps/api/data/demo-city.json');
const demoSeed = 20261017;
let state = demoSeed;
function random(): number {
  state |= 0; state = state + 0x6D2B79F5 | 0;
  let value = Math.imul(state ^ state >>> 15, 1 | state);
  value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}
const pad = (n: number) => String(n).padStart(3, '0');
const bilingual = (en: string, kn: string): Bilingual => ({ en: scrubPII(en).text, kn: scrubPII(kn).text });
const manifest = JSON.parse(await readFile(resolve(root, 'apps/web/public/samples/manifest.json'), 'utf8')) as { samples: Photo[] };
const photos = manifest.samples.filter((sample) => sample.kind === 'photo');
const exact = JSON.parse(await readFile(resolve(root, 'apps/api/data/wards.geojson'), 'utf8')) as { features: WardFeature[] };
const display = JSON.parse(await readFile(resolve(root, 'apps/web/public/data/wards.geojson'), 'utf8')) as { features: WardFeature[] };
const lookup = JSON.parse(await readFile(resolve(root, 'apps/api/data/validation.json'), 'utf8')) as { landmarks: { wardId: string }[] };
assert.equal(exact.features.length, 369, 'Build real wards before seeding');
const exactById = new Map(exact.features.map((ward) => [ward.properties.id, ward]));
const demoWardIds = [...new Set(lookup.landmarks.map((landmark) => landmark.wardId))];
assert.equal(demoWardIds.length, 12);
const selected = demoWardIds.map((id) => display.features.find((ward) => ward.properties.id === id)!);

function inRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!;
    if ((a[1] > lat) !== (b[1] > lat) && lng < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function contains(geometry: Geometry, point: Position): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => inRing(point[0], point[1], polygon[0]!) && !polygon.slice(1).some((hole) => inRing(point[0], point[1], hole)));
}
function demoPoint(feature: WardFeature): Position {
  const geometry = exactById.get(feature.properties.id)!.geometry;
  for (let attempt = 0; attempt < 100; attempt++) {
    const point: Position = [feature.properties.lx + (random() - .5) * .008, feature.properties.ly + (random() - .5) * .008];
    const rounded: Position = [Math.round(point[0] * 1e6) / 1e6, Math.round(point[1] * 1e6) / 1e6];
    if (contains(geometry, rounded)) return rounded;
  }
  return [feature.properties.lx, feature.properties.ly];
}

const locations: Bilingual[] = [bilingual('near the bus stop', 'ಬಸ್ ನಿಲ್ದಾಣದ ಬಳಿ'), bilingual('at the school crossing', 'ಶಾಲೆಯ ರಸ್ತೆ ದಾಟುವ ಸ್ಥಳದಲ್ಲಿ'), bilingual('beside the park entrance', 'ಉದ್ಯಾನವನದ ಪ್ರವೇಶದ್ವಾರದ ಬಳಿ'), bilingual('at the third cross junction', 'ಮೂರನೇ ಅಡ್ಡರಸ್ತೆಯ ಜಂಕ್ಷನ್‌ನಲ್ಲಿ'), bilingual('along the market approach', 'ಮಾರುಕಟ್ಟೆಗೆ ಹೋಗುವ ದಾರಿಯಲ್ಲಿ')];
const subjects: Record<Category, Bilingual[]> = {
  pothole: [bilingual('Deep pothole', 'ಆಳವಾದ ರಸ್ತೆ ಗುಂಡಿ'), bilingual('Broken road surface', 'ಹಾಳಾದ ರಸ್ತೆ ಮೇಲ್ಮೈ'), bilingual('Rain-filled road crater', 'ಮಳೆನೀರು ತುಂಬಿದ ರಸ್ತೆ ಗುಂಡಿ')],
  garbage: [bilingual('Uncollected waste pile', 'ತೆಗೆದಿಲ್ಲದ ಕಸದ ರಾಶಿ'), bilingual('Overflowing community bin', 'ತುಂಬಿ ಹರಿಯುತ್ತಿರುವ ಕಸದ ತೊಟ್ಟಿ'), bilingual('Recurring roadside dumping', 'ರಸ್ತೆಬದಿಯಲ್ಲಿ ಮತ್ತೆ ಮತ್ತೆ ಕಸ ಸುರಿಯಲಾಗುತ್ತಿದೆ')],
  drainage: [bilingual('Blocked storm drain', 'ಮುಚ್ಚಿದ ಮಳೆನೀರು ಚರಂಡಿ'), bilingual('Sewage overflowing onto the road', 'ರಸ್ತೆಯ ಮೇಲೆ ಉಕ್ಕುತ್ತಿರುವ ಕೊಳಚೆನೀರು'), bilingual('Waterlogging after rain', 'ಮಳೆಯ ನಂತರ ನಿಂತಿರುವ ನೀರು')],
  streetlight: [bilingual('Streetlight out after sunset', 'ಸೂರ್ಯಾಸ್ತದ ನಂತರ ಬೀದಿದೀಪ ಬೆಳಗುತ್ತಿಲ್ಲ'), bilingual('Damaged streetlight pole', 'ಹಾನಿಗೊಂಡ ಬೀದಿದೀಪದ ಕಂಬ'), bilingual('Unlit pedestrian stretch', 'ಬೆಳಕಿಲ್ಲದ ಪಾದಚಾರಿ ದಾರಿ')],
  water: [bilingual('Leaking water-supply pipe', 'ನೀರು ಸರಬರಾಜಿನ ಕೊಳವೆಯಿಂದ ಸೋರಿಕೆ'), bilingual('Water running across the pavement', 'ಪಾದಚಾರಿ ಮಾರ್ಗದ ಮೇಲೆ ಹರಿಯುತ್ತಿರುವ ನೀರು'), bilingual('Damaged public water connection', 'ಹಾಳಾದ ಸಾರ್ವಜನಿಕ ನೀರಿನ ಸಂಪರ್ಕ')],
  footpath: [bilingual('Broken paving blocks', 'ಒಡೆದ ಪಾದಚಾರಿ ಮಾರ್ಗದ ಕಲ್ಲುಗಳು'), bilingual('Blocked wheelchair access', 'ಗಾಲಿಕುರ್ಚಿಯ ದಾರಿಗೆ ಅಡ್ಡಿ'), bilingual('Uneven footpath edge', 'ಅಸಮವಾದ ಪಾದಚಾರಿ ಮಾರ್ಗದ ಅಂಚು')],
  traffic: [bilingual('Missing crossing sign', 'ಕಾಣೆಯಾದ ರಸ್ತೆ ದಾಟುವ ಸೂಚನಾ ಫಲಕ'), bilingual('Damaged traffic barrier', 'ಹಾಳಾದ ಸಂಚಾರ ತಡೆಗೋಡೆ'), bilingual('Obstructed junction sightline', 'ಜಂಕ್ಷನ್‌ನಲ್ಲಿ ದೃಷ್ಟಿಗೆ ಅಡ್ಡಿ')],
  trees: [bilingual('Fallen branch across the lane', 'ರಸ್ತೆಗೆ ಅಡ್ಡವಾಗಿ ಬಿದ್ದ ಕೊಂಬೆ'), bilingual('Storm-damaged roadside tree', 'ಬಿರುಗಾಳಿಯಿಂದ ಹಾನಿಯಾದ ರಸ್ತೆಬದಿಯ ಮರ'), bilingual('Low branch blocking the walkway', 'ಪಾದಚಾರಿ ದಾರಿಗೆ ಅಡ್ಡವಾದ ತಗ್ಗಿನ ಕೊಂಬೆ')],
  other: [bilingual('Damaged public amenity', 'ಹಾಳಾದ ಸಾರ್ವಜನಿಕ ಸೌಲಭ್ಯ'), bilingual('Unsafe open inspection cover', 'ಅಸುರಕ್ಷಿತ ತೆರೆದ ಪರಿಶೀಲನಾ ಮುಚ್ಚಳ'), bilingual('Community access obstruction', 'ಸಮುದಾಯದ ದಾರಿಗೆ ಅಡ್ಡಿ')],
};
const hazardSets: Record<Category, Hazard[]> = { pothole: ['traffic_risk', 'night_visibility'], garbage: ['health'], drainage: ['flooding', 'health'], streetlight: ['electrical', 'night_visibility'], water: ['pedestrian_risk'], footpath: ['accessibility', 'pedestrian_risk'], traffic: ['traffic_risk', 'pedestrian_risk'], trees: ['traffic_risk'], other: ['pedestrian_risk'] };
const categories = Object.entries({ pothole: 60, garbage: 50, drainage: 24, streetlight: 24, footpath: 16, water: 12, trees: 8, traffic: 6 }).flatMap(([category, count]) => Array<Category>(count).fill(category as Category));
// Shuffle a fixed category mix so chronological neighbours do not repeat one template.
for (let i = categories.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [categories[i], categories[j]] = [categories[j]!, categories[i]!]; }
type Scenario = Status | 'flagged' | 'overridden';
const scenarios: Scenario[] = [
  ...Array<Scenario>(30).fill('reported'), ...Array<Scenario>(30).fill('acknowledged'), ...Array<Scenario>(30).fill('in_progress'),
  ...Array<Scenario>(30).fill('resolved_pending_verification'), ...Array<Scenario>(50).fill('verified'), ...Array<Scenario>(16).fill('reopened'),
  ...Array<Scenario>(4).fill('flagged'), ...Array<Scenario>(4).fill('overridden'), ...Array<Scenario>(6).fill('rejected'),
];
for (let i = scenarios.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [scenarios[i], scenarios[j]] = [scenarios[j]!, scenarios[i]!]; }
let strongCursor = 0, weakCursor = 0, regularCursor = 0;
function wardFor(scenario: Scenario): WardFeature {
  if (scenario === 'verified') return selected[(strongCursor++ % 5 === 4) ? 3 + strongCursor % 9 : strongCursor % 3]!;
  if (scenario === 'reopened' || scenario === 'overridden' || scenario === 'resolved_pending_verification') return selected[3 + weakCursor++ % 3]!;
  return selected[regularCursor++ % 12]!;
}

function makeRecord(index: number): RecordRow {
  const serial = index + 1, id = `demo-issue-${pad(serial)}`, scenario = scenarios[index]!, category = categories[index]!;
  const feature = wardFor(scenario), ward = feature.properties, wardIndex = selected.findIndex((candidate) => candidate.properties.id === ward.id);
  const location = locations[index % locations.length]!, subject = subjects[category][Math.floor(index / locations.length) % 3]!;
  const title = bilingual(`${subject.en} ${location.en}`, `${location.kn} ${subject.kn}`);
  const summary = bilingual(`Fictional demo report in ${ward.name_en}: ${subject.en.toLowerCase()} ${location.en}. Residents request an inspection and an evidence-backed response. The photo is a licensed illustration, not a geolocated record.`, `${ward.name_kn ?? ''} ವ್ಯಾಪ್ತಿಯ ಕಾಲ್ಪನಿಕ ಪ್ರದರ್ಶನ ವರದಿ. ${location.kn} ${subject.kn}. ಸ್ಥಳ ಪರಿಶೀಲನೆ ಮತ್ತು ಸಾಕ್ಷ್ಯ ಸಹಿತ ಕ್ರಮಕ್ಕೆ ನಿವಾಸಿಗಳ ಮನವಿ. ಫೋಟೋ ಕೇವಲ ಉದಾಹರಣೆ.`);
  const [lng, lat] = demoPoint(feature);
  const ageDays = scenario === 'reported' && index % 4 === 0 ? .12 + random() * .55 : 5 + random() * 55;
  const reportedAt = Math.floor(now - ageDays * DAY);
  const ackAt = Math.floor(reportedAt + (wardIndex < 3 ? 1 + random() * 12 : wardIndex < 6 ? 25 + random() * 30 : 6 + random() * 30) * HOUR);
  const startedAt = ackAt + 3 * HOUR;
  const claimedAt = Math.floor(startedAt + (wardIndex < 3 ? 8 + random() * 18 : 24 + random() * 36) * HOUR);
  const eligible = 3 + Math.floor(random() ** 1.8 * 38);
  const reportCount = Math.min(eligible, 1 + Math.floor(random() * 6));
  const severity = (2 + serial % 4) as Severity;
  const hazards = hazardSets[category];
  const hasClaim = ['resolved_pending_verification', 'verified', 'reopened', 'overridden'].includes(scenario);
  const pair = category === 'pothole' && hasClaim;
  const reportPhoto = pair ? photos.find((photo) => photo.id === 'pothole-3-before') : photos.filter((photo) => photo.category === category && photo.role === 'report')[serial % Math.max(1, photos.filter((photo) => photo.category === category && photo.role === 'report').length)];
  const events: IssueEventDoc[] = [], evidence: EvidenceDoc[] = [], votes: Vote[] = [];
  const supports: Support[] = Array.from({ length: eligible }, (_, i) => ({ issueId: id, uid: `demo-citizen-${pad(serial)}-${pad(i + 1)}`, createdAt: reportedAt + (i + 1) * 30_000, isDemo: true }));
  const reports: SeedReport[] = supports.slice(0, reportCount).map((support, i) => ({ id: `demo-report-${pad(serial)}-${pad(i + 1)}`, uid: support.uid, issueId: id, merged: i > 0, anonymous: true, lang: serial % 3 === 0 ? 'kn' : 'en', text: title.en, transcript: null, photoUrl: reportPhoto?.file ?? null, hasAudio: false, location: { lat, lng, geohash: geohashForLocation([lat, lng], 10) }, createdAt: i === 0 ? reportedAt : support.createdAt, triageRunId: null, dedupeRunId: null, isDemo: true }));
  const event = (type: EventType, at: number, actorType: ActorType, actorLabel: string, fields: Partial<IssueEventDoc> = {}) => events.push({ id: `event-${pad(events.length + 1)}`, type, at, actorType, actorLabel, meta: { isDemo: true, source: 'scripted_seed' }, ...fields });
  const photo = (asset: Photo | undefined, kind: EvidenceDoc['kind'], at: number, claimNo?: number): string | null => {
    if (!asset) return null;
    const evidenceId = `${kind}-${pad(evidence.length + 1)}`;
    evidence.push({ id: evidenceId, kind, url: asset.file, width: asset.width, height: asset.height, uploadedAt: at, uploaderType: kind === 'report' ? 'citizen' : 'officer', ...(claimNo ? { claimNo } : {}) });
    return evidenceId;
  };
  const reportEvidence = photo(reportPhoto, 'report', reportedAt);
  event('reported', reportedAt, 'citizen', 'Citizen', { toStatus: 'reported', note: 'Fictional demo report. Licensed photos illustrate the scenario; they do not document this location.', evidenceIds: reportEvidence ? [reportEvidence] : [] });
  for (let i = 1; i < reports.length; i++) event('merged', reports[i]!.createdAt, 'citizen', 'Citizen', { note: 'Scripted demo report joined this canonical issue.' });
  event('supported', reportedAt + eligible * 30_000 + 1_000, 'system', 'LeadNet (demo system)', { note: `${eligible} fictional citizens support this demo issue.`, meta: { isDemo: true, count: eligible } });
  let status: Status = 'reported';
  const transition = (to: Status, role: Role | 'system', type: EventType, at: number, note: string, evidenceIds: string[] = []) => {
    assert.ok(canTransition(status, to, role), `${id}: invalid ${status} -> ${to}`);
    event(type, at, role === 'officer' ? 'officer' : 'system', role === 'officer' ? `Demo ward officer · ${ward.name_en}` : 'LeadNet (demo system)', { fromStatus: status, toStatus: to, note, evidenceIds, meta: { isDemo: true, role } });
    status = to;
  };
  let acknowledgedAt: number | null = null, firstClaimedAt: number | null = null, verifiedAt: number | null = null;
  let claimCount = 0, reopenCount = 0, overrideCount = 0;
  let evidenceFlag: IssueDoc['evidenceFlag'] = null;
  if (scenario === 'rejected') transition('rejected', 'moderator', 'rejected', ackAt, 'Scripted moderation: demo report is outside the scope of this category.');
  else if (scenario !== 'reported') {
    transition('acknowledged', 'officer', 'acknowledged', ackAt, 'Demo officer acknowledged the issue and accepted responsibility.');
    acknowledgedAt = ackAt;
    if (scenario !== 'acknowledged') transition('in_progress', 'officer', 'started', startedAt, 'Scripted demo work started; this is not an official work order.');
  }
  if (scenario === 'flagged' || scenario === 'overridden') {
    const asset = photos.find((candidate) => candidate.id === 'road-elsewhere-1')!;
    const evidenceId = photo(asset, 'resolution', claimedAt, 1)!;
    const observation = { sameLocation: false, sameLocationConfidence: 1, defectResolved: false, defectResolvedConfidence: 1, afterPhotoQuality: 'unrelated' as const };
    const gate = evidenceGate(observation);
    const record = evidence.find((candidate) => candidate.id === evidenceId)!;
    record.observation = { ...observation, notes: 'Scripted negative fixture: source photo is from another city. This observation is not a recorded Gemini call.' };
    record.gate = gate;
    evidenceFlag = { ...gate, overridden: scenario === 'overridden', note: 'Scripted demo scenario; different-city evidence must be held.' };
    event('evidence_flagged', claimedAt, 'system', 'LeadNet (demo evidence fixture)', { note: 'Different-location demo photo held by the shared evidence gate; issue remains open.', evidenceIds: [evidenceId] });
    if (scenario === 'overridden') {
      overrideCount = 1; claimCount = 1; firstClaimedAt = claimedAt + HOUR;
      evidenceFlag.note = 'Demo override with written reason: inspector requests citizen review. Not an official inspection.';
      transition('resolved_pending_verification', 'officer', 'resolution_submitted', firstClaimedAt, evidenceFlag.note, [evidenceId]);
    }
  } else if (hasClaim) {
    const asset = pair ? photos.find((candidate) => candidate.id === 'pothole-3-after') : reportPhoto;
    const evidenceId = photo(asset, 'resolution', claimedAt, 1);
    // A generic image is explicitly illustrative when no category-specific asset exists.
    if (!evidenceId) {
      const generic = photos.find((candidate) => candidate.id === 'pothole-3-after')!;
      photo(generic, 'resolution', claimedAt, 1);
    }
    transition('resolved_pending_verification', 'officer', 'resolution_submitted', claimedAt, 'Scripted demo fix claim. The licensed image is illustrative, not proof for this fictional location.', [evidenceId ?? evidence[evidence.length - 1]!.id]);
    claimCount = 1; firstClaimedAt = claimedAt;
  }
  let confirms = 0, disputes = 0;
  if ((status as Status) === 'resolved_pending_verification') {
    const voteType: Vote['vote'] = scenario === 'reopened' ? 'dispute' : 'confirm';
    const count = scenario === 'verified' || scenario === 'reopened' ? verificationQuorum(eligible) : serial % 2;
    for (let i = 0; i < count; i++) {
      const at = firstClaimedAt! + (i + 1) * HOUR;
      votes.push({ issueId: id, uid: supports[i]!.uid, claimNo: 1, vote: voteType, createdAt: at, isDemo: true });
      if (voteType === 'confirm') confirms++; else disputes++;
      event(voteType === 'confirm' ? 'comment' : 'disputed', at, 'citizen', 'Citizen', { note: `Scripted demo citizen ${voteType === 'confirm' ? 'confirmation' : 'dispute'}.` });
    }
    const outcome = verificationOutcome({ confirms, disputes, eligible });
    if (outcome === 'verified') { verifiedAt = firstClaimedAt! + count * HOUR + 1; transition('verified', 'system', 'verified', verifiedAt, 'The shared citizen quorum confirmed this scripted demo claim.'); }
    if (outcome === 'reopened') { reopenCount = 1; transition('reopened', 'system', 'reopened', firstClaimedAt! + count * HOUR + 1, 'The shared citizen quorum disputed this scripted demo claim; the issue reopens.'); }
  }
  events.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const lastEventAt = events[events.length - 1]!.at;
  assert.ok(lastEventAt <= now, `${id}: future event`);
  const issue: IssueDoc = {
    id, title, summary, category, hazards, severity, status, departmentId: CATEGORY_META[category].department,
    wardId: ward.id, wardName: ward.name_en, location: { lat, lng, geohash: geohashForLocation([lat, lng], 10), label: `Illustrative demo point · ${ward.name_en}` },
    coverPhotoUrl: reportPhoto?.file ?? null, lang: reports[0]!.lang, reportCount, supporterCount: eligible,
    priority: computePriority({ category, hazards, severity, supporters: eligible, ageHours: (now - reportedAt) / HOUR }),
    reportedAt, acknowledgedAt, firstClaimedAt, verifiedAt, lastEventAt, updatedAt: lastEventAt, claimCount, reopenCount, overrideCount,
    verification: { claimNo: claimCount, confirms, disputes, eligible, quorum: verificationQuorum(eligible) },
    sla: { ackDueAt: 0, resolveDueAt: 0, overdue: false }, evidenceFlag, passCode: `BLR-D${pad(serial)}`, isDemo: true,
  };
  const sla = computeSla(issue, now);
  issue.sla = { ackDueAt: sla.ackDueAt, resolveDueAt: sla.resolveDueAt, overdue: sla.overdue };
  return { issue, events, evidence, reports, supports, votes };
}

const rows = Array.from({ length: 200 }, (_, index) => makeRecord(index));
const issues = rows.map((row) => row.issue);
const wards: WardDoc[] = display.features.map(({ properties: ward }) => ({ id: ward.id, number: ward.number,
  name: bilingual(ward.name_en, ward.name_kn ?? ''), zone: ward.zone, corporation: ward.corporation, assembly: ward.assembly,
  centroid: { lat: ward.ly, lng: ward.lx }, officerLeaderId: null,
  stats: computeLedger(issues.filter((issue) => issue.wardId === ward.id), now), statsUpdatedAt: now }));
const projectNames: Bilingual[] = [bilingual('Storm-water drain desilting', 'ಮಳೆನೀರು ಚರಂಡಿಯ ಹೂಳೆತ್ತುವಿಕೆ'), bilingual('Accessible footpath renewal', 'ಎಲ್ಲರಿಗೂ ಅನುಕೂಲಕರ ಪಾದಚಾರಿ ಮಾರ್ಗ ನವೀಕರಣ'), bilingual('Streetlight LED retrofit', 'ಬೀದಿದೀಪಗಳ ಎಲ್‌ಇಡಿ ನವೀಕರಣ'), bilingual('Safer school junction', 'ಸುರಕ್ಷಿತ ಶಾಲಾ ಜಂಕ್ಷನ್'), bilingual('Neighbourhood park restoration', 'ಬಡಾವಣೆಯ ಉದ್ಯಾನವನ ಪುನರುಜ್ಜೀವನ'), bilingual('Road surface renewal', 'ರಸ್ತೆ ಮೇಲ್ಮೈ ನವೀಕರಣ'), bilingual('Lake-edge walkway repairs', 'ಕೆರೆಬದಿಯ ಪಾದಚಾರಿ ದಾರಿ ದುರಸ್ತಿ'), bilingual('Community waste collection point', 'ಸಮುದಾಯದ ಕಸ ಸಂಗ್ರಹ ಸ್ಥಳ')];
const projects: ProjectDoc[] = projectNames.map((title, index) => {
  const wardId = selected[index % selected.length]!.properties.id;
  const status = (['in_progress', 'delayed', 'completed', 'planned'] as const)[index % 4]!;
  const start = now - (20 + index * 3) * DAY, end = status === 'delayed' ? now - 2 * DAY : now + (10 + index * 2) * DAY;
  return { id: `demo-project-${pad(index + 1)}`, title, description: bilingual(`A fictional planning scenario in ${selected[index]!.properties.name_en}. Dates, money and milestones are demonstration data, not an official public project.`, 'ಕಾಲ್ಪನಿಕ ಅಭಿವೃದ್ಧಿ ಯೋಜನೆಯ ಪ್ರದರ್ಶನ. ದಿನಾಂಕಗಳು, ವೆಚ್ಚ ಮತ್ತು ಮೈಲಿಗಲ್ಲುಗಳು ಅಧಿಕೃತ ಸರ್ಕಾರಿ ದಾಖಲೆಗಳಲ್ಲ.'), wardId,
    agency: 'Fictional demo civic works unit', budgetInr: (index + 2) * 1_000_000, budgetSource: 'Demo figure — not an official budget', plannedStart: start, plannedEnd: end, status,
    milestones: [bilingual('Survey and public consultation', 'ಸಮೀಕ್ಷೆ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸಮಾಲೋಚನೆ'), bilingual('Work execution', 'ಕಾಮಗಾರಿ ಕಾರ್ಯಗತಗೊಳಿಸುವಿಕೆ'), bilingual('Evidence and community inspection', 'ಸಾಕ್ಷ್ಯ ಮತ್ತು ಸಮುದಾಯ ಪರಿಶೀಲನೆ')].map((label, milestone) => ({ id: `m-${milestone + 1}`, title: label, plannedAt: start + (milestone + 1) * (end - start) / 3, actualAt: status === 'completed' || status !== 'planned' && milestone === 0 ? start + (milestone + 1) * 3 * DAY : null, evidenceUrl: null })),
    relatedIssueIds: issues.filter((issue) => issue.wardId === wardId).slice(0, 4).map((issue) => issue.id), source: 'demo', isDemo: true };
});
const personas = ['Demo officer Aruna', 'Demo officer Kiran', 'Demo officer Samira', 'Demo councillor Neela', 'Demo councillor Tarun', 'Demo representative Mira'];
const leaders: LeaderDoc[] = personas.map((name, index) => {
  const role = index < 3 ? 'ward_officer' : index < 5 ? 'corporator' : 'mla';
  const assigned = selected.filter((_, i) => role === 'mla' || i % (role === 'ward_officer' ? 3 : 2) === index % (role === 'ward_officer' ? 3 : 2)).map((ward) => ward.properties.id);
  return { id: `demo-leader-${pad(index + 1)}`, name, role,
    roleLabel: role === 'ward_officer' ? bilingual('Fictional ward officer', 'ಕಾಲ್ಪನಿಕ ವಾರ್ಡ್ ಅಧಿಕಾರಿ') : role === 'corporator' ? bilingual('Fictional councillor', 'ಕಾಲ್ಪನಿಕ ಪಾಲಿಕೆ ಸದಸ್ಯರು') : bilingual('Fictional constituency representative', 'ಕಾಲ್ಪನಿಕ ಕ್ಷೇತ್ರ ಪ್ರತಿನಿಧಿ'),
    wardIds: assigned, avatarUrl: null, bio: 'A clearly fictional demo persona used to explain civic accountability. This profile does not represent a real person or public office.',
    commitments: projects.filter((project) => assigned.includes(project.wardId)).slice(0, 3).map((project, i) => ({ id: `c-${i + 1}`, text: bilingual(`Publish evidence for ${project.title.en.toLowerCase()}`, `${project.title.kn} ಕುರಿತು ಸಾಕ್ಷ್ಯ ಪ್ರಕಟಿಸುವುದು`), madeAt: now - 15 * DAY, dueAt: project.plannedEnd, projectId: project.id })), isDemo: true };
});
for (const ward of wards) ward.officerLeaderId = leaders.find((leader) => leader.role === 'ward_officer' && leader.wardIds.includes(ward.id))?.id ?? null;
const ledger: LedgerDoc = { city: computeLedger(issues, now), wards: wards.filter((ward) => issues.some((issue) => issue.wardId === ward.id)).map((ward) => ({ wardId: ward.id, name: ward.name, metrics: ward.stats! })), updatedAt: now };
const data: SeedData = { notice: 'Fictional demonstration data on real GBA geography. All people, issue records, votes, project budgets, histories and outcomes are scripted. Licensed photographs are reused illustrations, not geolocated proof. No Gemini call or benchmark is fabricated.', generatedAt: now, seed: demoSeed, wards, issues,
  histories: Object.fromEntries(rows.map((row) => [row.issue.id, { events: row.events, evidence: row.evidence }])), leaders, projects, ledger,
  reports: rows.flatMap((row) => row.reports), supports: rows.flatMap((row) => row.supports), votes: rows.flatMap((row) => row.votes) };

for (const row of rows) {
  let replay: Status = 'reported';
  for (const event of row.events) {
    if (!event.fromStatus || !event.toStatus) continue;
    assert.equal(event.fromStatus, replay, `${row.issue.id}: discontinuous event history`);
    const role = event.meta?.role as Role | 'system';
    const rule = canTransition(replay, event.toStatus, role);
    assert.ok(rule, `${row.issue.id}: illegal event transition`);
    if (rule.requires === 'resolution_evidence') assert.ok(event.evidenceIds?.some((id) => row.evidence.some((item) => item.id === id && item.kind === 'resolution')));
    if (rule.requires === 'verification_votes') assert.equal(verificationOutcome(row.issue.verification), event.toStatus);
    if (rule.requires === 'note') assert.ok(event.note);
    replay = event.toStatus;
  }
  assert.equal(replay, row.issue.status);
  assert.equal(row.reports.length, row.issue.reportCount);
  assert.equal(row.supports.length, row.issue.supporterCount);
  assert.equal(row.votes.filter((vote) => vote.vote === 'confirm').length, row.issue.verification.confirms);
  assert.equal(row.votes.filter((vote) => vote.vote === 'dispute').length, row.issue.verification.disputes);
  assert.equal(geohashForLocation([row.issue.location.lat, row.issue.location.lng], 10), row.issue.location.geohash);
  assert.ok(contains(exactById.get(row.issue.wardId!)!.geometry, [row.issue.location.lng, row.issue.location.lat]));
  assert.ok(row.issue.isDemo);
}
assert.equal(data.reports.length, ledger.city.reports.value);
assert.equal(leaders.length, 6); assert.equal(projects.length, 8);
assert.ok(leaders.every((leader) => leader.isDemo)); assert.ok(projects.every((project) => project.source === 'demo' && project.isDemo));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(data) + '\n');
await writeFile(resolve(root, 'apps/web/public/data/demo-city.json'), JSON.stringify({ notice: data.notice, generatedAt: now, issues, wards, ledger, leaders, projects, histories: data.histories }) + '\n');
const summary = { mode: dryRun ? 'dry-run' : 'apply', generatedAt: new Date(now).toISOString(), wards: wards.length, demoWards: selected.length, issues: issues.length, reports: data.reports.length, supporters: data.supports.length, votes: data.votes.length,
  events: rows.reduce((sum, row) => sum + row.events.length, 0), evidence: rows.reduce((sum, row) => sum + row.evidence.length, 0),
  leaders: leaders.length, projects: projects.length,
  byStatus: Object.fromEntries([...new Set(issues.map((issue) => issue.status))].map((status) => [status, issues.filter((issue) => issue.status === status).length])),
  byCategory: Object.fromEntries([...new Set(issues.map((issue) => issue.category))].map((category) => [category, issues.filter((issue) => issue.category === category).length])),
  city: ledger.city, wardsStory: ledger.wards.map((ward) => ({ wardId: ward.wardId, name: ward.name.en, issues: ward.metrics.issues.value, claimed: ward.metrics.claimed.value, verified: ward.metrics.verified.value, verifiedRate: ward.metrics.verifiedRate.value, reopenRate: ward.metrics.reopenRate.value })),
  payloadSha256: createHash('sha256').update(JSON.stringify(data)).digest('hex') };
await writeFile(resolve(root, 'apps/api/data/demo-seed-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));

if (!dryRun) {
  const { applicationDefault, getApps, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getStorage } = await import('firebase-admin/storage');
  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'leadnet-blr';
  const storageBucket = process.env.STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`;
  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId, storageBucket });
  const db = getFirestore(app), bucket = getStorage(app).bucket(storageBucket);
  if (!cli.includes('--reset')) {
    const existing = await db.collection('issues').where('isDemo', '==', true).limit(500).get();
    if (existing.docs.some((doc) => issues.some((issue) => issue.id === doc.id))) {
      throw new Error('Seed IDs already exist. Refusing to overwrite live demo interactions; use explicit --apply --reset to rebuild demo records.');
    }
  }
  if (cli.includes('--reset')) {
    const resetCollections = ['issues', 'leaders', 'projects', 'reports', 'supports', 'votes'];
    const snapshots = await Promise.all(resetCollections.map((collection) => db.collection(collection).where('isDemo', '==', true).get()));
    const documents = snapshots.flatMap((snapshot) => snapshot.docs);
    const candidates = documents.map((doc) => ({ path: doc.ref.path, data: doc.data() }));
    assertDemoPrefixes(candidates);
    const demoIssues = snapshots[0]!.docs;
    const demoIssueIds = new Set(demoIssues.map((doc) => doc.id));
    // Reading complete prototype collections includes runtime records with no isDemo field.
    const [interactions, timelines] = await Promise.all([
      Promise.all(['reports', 'supports', 'votes'].map((collection) => db.collection(collection).get())),
      Promise.all(demoIssues.map((doc) => doc.ref.collection('events').get())),
    ]);
    const linkedRecords = interactions.flatMap((snapshot) => snapshot.docs)
      .map((doc) => ({ path: doc.ref.path, data: doc.data() }))
      .filter((record) => demoIssueIds.has(record.data.issueId));
    const events = timelines.flatMap((snapshot) => snapshot.docs).map((doc) => ({ path: doc.ref.path, data: doc.data() }));
    assertSeedResetSafe({ candidates, linkedRecords, events });
    for (const doc of documents) await db.recursiveDelete(doc.ref);
  }
  const writes: { path: string; value: object }[] = [];
  for (const row of rows) {
    for (const evidence of row.evidence) {
      const sourcePath = evidence.url;
      if (!sourcePath.startsWith('/samples/photos/')) throw new Error(`Unexpected seed photo path ${sourcePath}`);
      const objectPath = `evidence/${row.issue.id}/${evidence.id}.jpg`;
      const token = createHash('sha256').update(`${projectId}:${objectPath}:leadnet-demo-v1`).digest('hex');
      await bucket.file(objectPath).save(await readFile(resolve(root, 'apps/web/public', sourcePath.slice(1))), { resumable: false, metadata: { contentType: 'image/jpeg', cacheControl: 'public,max-age=86400', metadata: { firebaseStorageDownloadTokens: token, source: 'licensed-demo-illustration', isDemo: 'true' } } });
      evidence.url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
      if (evidence.kind === 'report') row.issue.coverPhotoUrl = evidence.url;
      writes.push({ path: `issues/${row.issue.id}/evidence/${evidence.id}`, value: evidence });
    }
    writes.push({ path: `issues/${row.issue.id}`, value: row.issue });
    for (const event of row.events) writes.push({ path: `issues/${row.issue.id}/events/${event.id}`, value: event });
  }
  for (const report of data.reports) {
    report.photoUrl = issues.find((issue) => issue.id === report.issueId)!.coverPhotoUrl;
    writes.push({ path: `reports/${report.id}`, value: report });
  }
  for (const support of data.supports) writes.push({ path: `supports/${support.issueId}_${encodeURIComponent(support.uid)}`, value: support });
  for (const vote of data.votes) writes.push({ path: `votes/${vote.issueId}_${vote.claimNo}_${encodeURIComponent(vote.uid)}`, value: vote });
  for (const ward of wards) writes.push({ path: `wards/${ward.id}`, value: ward });
  for (const leader of leaders) writes.push({ path: `leaders/${leader.id}`, value: leader });
  for (const project of projects) writes.push({ path: `projects/${project.id}`, value: project });
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = db.batch();
    for (const write of writes.slice(offset, offset + 400)) batch.set(db.doc(write.path), write.value, { merge: true });
    await batch.commit();
  }
  // Existing citizen records remain in the ledger when applying demo data to a nonempty project.
  const allIssues = (await db.collection('issues').get()).docs.map((doc) => doc.data() as IssueDoc);
  const allWards = (await db.collection('wards').get()).docs.map((doc) => doc.data() as WardDoc);
  const liveLedger: LedgerDoc = { city: computeLedger(allIssues, now), wards: allWards.filter((ward) => allIssues.some((issue) => issue.wardId === ward.id)).map((ward) => ({ wardId: ward.id, name: ward.name, metrics: computeLedger(allIssues.filter((issue) => issue.wardId === ward.id), now) })), updatedAt: now };
  await db.doc('ledger/city').set(liveLedger);
  for (const ward of liveLedger.wards) await db.doc(`wards/${ward.wardId}`).set({ stats: ward.metrics, statsUpdatedAt: now }, { merge: true });
  console.log(`Applied ${writes.length} documents to ${projectId}; uploaded ${rows.reduce((sum, row) => sum + row.evidence.length, 0)} licensed photo illustrations. No audio uploaded.`);
} else console.log(`Validated dry-run only. JSON: ${output}. Use --apply explicitly after cloud setup.`);
