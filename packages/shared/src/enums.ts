/**
 * Closed vocabularies. Gemini may only ever *select* from these lists;
 * everything downstream (priority, SLA, routing) is keyed off them in code.
 */

export const CATEGORIES = [
  'pothole',
  'garbage',
  'drainage',
  'streetlight',
  'water',
  'footpath',
  'traffic',
  'trees',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const HAZARDS = [
  'traffic_risk',
  'pedestrian_risk',
  'electrical',
  'flooding',
  'health',
  'night_visibility',
  'accessibility',
  'fire',
] as const;
export type Hazard = (typeof HAZARDS)[number];

export const SEVERITIES = [1, 2, 3, 4, 5] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Lifecycle — see stateMachine.ts for the allowed transitions. */
export const STATUSES = [
  'reported',
  'acknowledged',
  'in_progress',
  'resolved_pending_verification',
  'verified',
  'reopened',
  'rejected',
  'duplicate',
] as const;
export type Status = (typeof STATUSES)[number];

/** Statuses that count as "open" for queues, SLA and ledger metrics. */
export const OPEN_STATUSES: readonly Status[] = [
  'reported',
  'acknowledged',
  'in_progress',
  'resolved_pending_verification',
  'reopened',
];

export const ROLES = ['citizen', 'officer', 'moderator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ACTOR_TYPES = ['citizen', 'officer', 'system', 'ai'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const EVENT_TYPES = [
  'reported',
  'merged',
  'supported',
  'acknowledged',
  'started',
  'resolution_submitted',
  'evidence_flagged',
  'verified',
  'disputed',
  'reopened',
  'rejected',
  'escalated',
  'sla_breached',
  'comment',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVIDENCE_KINDS = ['report', 'progress', 'resolution', 'verification'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const AI_TASKS = ['triage', 'dedupe', 'evidence', 'brief'] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const LANGS = ['en', 'kn', 'hi'] as const;
export type Lang = (typeof LANGS)[number];

/** Departments are fixed per category — routing is a lookup, never inferred. */
export const DEPARTMENTS = {
  roads: { en: 'Roads & Infrastructure', kn: 'ರಸ್ತೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ' },
  swm: { en: 'Solid Waste Management', kn: 'ಘನತ್ಯಾಜ್ಯ ನಿರ್ವಹಣೆ' },
  storm_water: { en: 'Storm Water Drains', kn: 'ಮಳೆನೀರು ಚರಂಡಿ' },
  electrical: { en: 'Electrical (Streetlights)', kn: 'ವಿದ್ಯುತ್ (ಬೀದಿದೀಪ)' },
  water_supply: { en: 'Water Supply (BWSSB)', kn: 'ನೀರು ಸರಬರಾಜು (ಜಲಮಂಡಳಿ)' },
  traffic: { en: 'Traffic Engineering', kn: 'ಸಂಚಾರ ಎಂಜಿನಿಯರಿಂಗ್' },
  forest: { en: 'Forest & Tree Cell', kn: 'ಅರಣ್ಯ ಮತ್ತು ಮರ ಘಟಕ' },
  ward_office: { en: 'Ward Office', kn: 'ವಾರ್ಡ್ ಕಚೇರಿ' },
} as const;
export type DepartmentId = keyof typeof DEPARTMENTS;
