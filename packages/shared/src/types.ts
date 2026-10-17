import type { ActorType, AiTask, Category, DepartmentId, EventType, EvidenceKind, Hazard, Lang, Role, Severity, Status } from './enums.ts';
import type { EvidenceGateResult, EvidenceObservation } from './verification.ts';
import type { LedgerMetrics } from './metrics.ts';
import type { PriorityResult } from './priority.ts';

/**
 * Firestore document shapes. Conventions:
 * - every timestamp is epoch milliseconds (number), never a Firestore Timestamp
 * - bilingual strings are { en, kn }
 * - `isDemo: true` marks seeded/illustrative records; the UI labels them
 */

export interface Bilingual {
  en: string;
  kn: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  /** geofire-common geohash, precision 10. */
  geohash: string;
}

/** issues/{issueId} — the canonical real-world problem. Public read, server-only write. */
export interface IssueDoc {
  id: string;
  title: Bilingual;
  summary: Bilingual;
  category: Category;
  hazards: Hazard[];
  severity: Severity;
  status: Status;
  departmentId: DepartmentId;
  wardId: string | null;
  wardName: string | null;
  location: GeoPoint & { label?: string };
  coverPhotoUrl: string | null;
  /** Language of the first report. */
  lang: Lang;
  reportCount: number;
  supporterCount: number;
  priority: PriorityResult;
  reportedAt: number;
  acknowledgedAt: number | null;
  firstClaimedAt: number | null;
  verifiedAt: number | null;
  lastEventAt: number;
  updatedAt: number;
  claimCount: number;
  reopenCount: number;
  overrideCount: number;
  /** Tally for the current fix claim (resets on each new claim). */
  verification: { claimNo: number; confirms: number; disputes: number; eligible: number; quorum: number };
  sla: { ackDueAt: number; resolveDueAt: number; overdue: boolean };
  /** Present while the latest fix claim is held/overridden by the evidence gate. */
  evidenceFlag: { decision: EvidenceGateResult['decision']; reasons: EvidenceGateResult['reasons']; overridden: boolean; note?: string } | null;
  /** Short public id shown on the Issue Pass, e.g. "BLR-7Q4K". */
  passCode: string;
  isDemo: boolean;
}

/** issues/{issueId}/events/{eventId} — append-only public timeline. */
export interface IssueEventDoc {
  id: string;
  type: EventType;
  at: number;
  actorType: ActorType;
  /** Public display label — never a personal name for citizens ("Citizen", "Ward officer, Ward 45"). */
  actorLabel: string;
  fromStatus?: Status;
  toStatus?: Status;
  note?: string;
  evidenceIds?: string[];
  aiRunId?: string;
  meta?: Record<string, string | number | boolean | null>;
}

/** issues/{issueId}/evidence/{evidenceId} — public photo evidence (EXIF stripped). */
export interface EvidenceDoc {
  id: string;
  kind: EvidenceKind;
  url: string;
  width: number;
  height: number;
  uploadedAt: number;
  uploaderType: ActorType;
  claimNo?: number;
  observation?: EvidenceObservation & { notes: string };
  gate?: EvidenceGateResult;
  aiRunId?: string;
}

/** reports/{reportId} — one citizen's submission. Readable only by its author. */
export interface ReportDoc {
  id: string;
  uid: string;
  issueId: string;
  merged: boolean;
  anonymous: boolean;
  lang: Lang;
  text: string | null;
  transcript: string | null;
  photoUrl: string | null;
  hasAudio: boolean;
  location: GeoPoint;
  createdAt: number;
  triageRunId: string | null;
  dedupeRunId: string | null;
}

/** wards/{wardId} — public. Stats are recomputed by the API after every mutation. */
export interface WardDoc {
  id: string;
  number: number | null;
  name: Bilingual;
  zone: string | null;
  corporation: string | null;
  assembly: string | null;
  centroid: { lat: number; lng: number };
  officerLeaderId: string | null;
  stats: LedgerMetrics | null;
  statsUpdatedAt: number | null;
}

/** ledger/city — public city-wide snapshot used by the ledger page and the home page. */
export interface LedgerDoc {
  city: LedgerMetrics;
  /** Per-ward rows for wards with at least one issue. */
  wards: Array<{ wardId: string; name: Bilingual; metrics: LedgerMetrics }>;
  updatedAt: number;
}

/** leaders/{leaderId} — FICTIONAL demo personas. Never a real person. */
export interface LeaderDoc {
  id: string;
  name: string;
  role: 'ward_officer' | 'corporator' | 'mla';
  roleLabel: Bilingual;
  wardIds: string[];
  avatarUrl: string | null;
  bio: string;
  commitments: Array<{ id: string; text: Bilingual; madeAt: number; dueAt: number | null; projectId?: string }>;
  isDemo: true;
}

export type ProjectStatus = 'planned' | 'in_progress' | 'delayed' | 'completed';

/** projects/{projectId} — development projects. `source` distinguishes official data from demo data. */
export interface ProjectDoc {
  id: string;
  title: Bilingual;
  description: Bilingual;
  wardId: string;
  agency: string;
  budgetInr: number | null;
  budgetSource: string | null;
  plannedStart: number;
  plannedEnd: number;
  status: ProjectStatus;
  milestones: Array<{ id: string; title: Bilingual; plannedAt: number; actualAt: number | null; evidenceUrl: string | null }>;
  relatedIssueIds: string[];
  source: 'official' | 'demo';
  isDemo: boolean;
}

export interface VerifierCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

/** aiRuns/{runId} — the decision trail. Public read only when `public` is true (linked to a submitted report). */
export interface AiRunDoc {
  id: string;
  task: AiTask;
  model: string;
  promptVersion: string;
  /** Redacted description of inputs — never raw media or personal text. */
  inputSummary: string;
  /** Validated, PII-scrubbed output (or the fallback). */
  output: unknown;
  checks: VerifierCheck[];
  attempts: number;
  fallbackUsed: boolean;
  latencyMs: number;
  tokens: { input: number | null; output: number | null };
  createdAt: number;
  issueId: string | null;
  public: boolean;
}

/** users/{uid} — owner read only; role is set server-side. */
export interface UserDoc {
  uid: string;
  role: Role;
  wardIds: string[];
  createdAt: number;
  demoOfficer?: boolean;
}

/** drafts/{draftId} — server-only scratch state between report steps (TTL 1h). */
export interface DraftDoc {
  id: string;
  uid: string;
  createdAt: number;
  location: GeoPoint;
  wardId: string | null;
  photoPath: string | null;
  audioPath: string | null;
  text: string | null;
  triageRunId: string;
  triage: unknown;
  dedupeRunId: string | null;
  dedupe: unknown;
}
