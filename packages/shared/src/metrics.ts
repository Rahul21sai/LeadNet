import type { Category, Status } from './enums.ts';
import { computeSla } from './sla.ts';

/**
 * The public accountability ledger. Every number LeadNet publishes is computed
 * here from issue records — never estimated, never written by a model. Each
 * metric carries a published definition and the sample size it was computed on.
 */

export interface IssueFacts {
  category: Category;
  status: Status;
  reportedAt: number;
  acknowledgedAt: number | null;
  /** First time an official claimed the issue fixed (entered resolved_pending_verification). */
  firstClaimedAt: number | null;
  verifiedAt: number | null;
  /** Number of fix claims submitted (each claim needs resolution evidence). */
  claimCount: number;
  reopenCount: number;
  /** Fix claims submitted over an AI evidence flag (officer override). */
  overrideCount: number;
  /** Citizen reports merged into this issue (≥ 1). */
  reportCount: number;
}

export interface MetricValue {
  value: number | null;
  /** Sample size the value was computed on. */
  n: number;
}

export interface LedgerMetrics {
  reports: MetricValue;
  issues: MetricValue;
  duplicatesMerged: MetricValue;
  open: MetricValue;
  overdue: MetricValue;
  medianAckHours: MetricValue;
  claimed: MetricValue;
  verified: MetricValue;
  awaitingCheck: MetricValue;
  verifiedRate: MetricValue;
  unverifiedClaims: MetricValue;
  reopenRate: MetricValue;
  overrides: MetricValue;
  medianDaysToVerified: MetricValue;
}

export type MetricKey = keyof LedgerMetrics;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OPEN: readonly Status[] = ['reported', 'acknowledged', 'in_progress', 'resolved_pending_verification', 'reopened'];

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
const ratio = (num: number, den: number): MetricValue => ({ value: den ? round1((num / den) * 100) : null, n: den });

/** Duplicate/rejected issues are excluded from outcome metrics; their reports still count. */
export function computeLedger(all: readonly IssueFacts[], now: number): LedgerMetrics {
  const issues = all.filter((i) => i.status !== 'duplicate' && i.status !== 'rejected');
  const reports = all.reduce((s, i) => s + Math.max(1, i.reportCount), 0);
  const duplicates = all.reduce((s, i) => s + Math.max(0, i.reportCount - 1) + (i.status === 'duplicate' ? 1 : 0), 0);
  const open = issues.filter((i) => OPEN.includes(i.status));
  const overdue = open.filter((i) => computeSla(i, now).overdue);
  const acked = issues.filter((i) => i.acknowledgedAt !== null);
  const claimed = issues.filter((i) => i.claimCount > 0);
  const verified = issues.filter((i) => i.status === 'verified');
  const awaiting = issues.filter((i) => i.status === 'resolved_pending_verification');
  const reopenedEver = claimed.filter((i) => i.reopenCount > 0);
  const overrides = issues.reduce((s, i) => s + i.overrideCount, 0);

  return {
    reports: { value: reports, n: reports },
    issues: { value: issues.length, n: issues.length },
    duplicatesMerged: { value: duplicates, n: reports },
    open: { value: open.length, n: issues.length },
    overdue: { value: overdue.length, n: open.length },
    medianAckHours: { value: round1(median(acked.map((i) => (i.acknowledgedAt! - i.reportedAt) / HOUR))), n: acked.length },
    claimed: { value: claimed.length, n: issues.length },
    verified: { value: verified.length, n: claimed.length },
    awaitingCheck: { value: awaiting.length, n: claimed.length },
    verifiedRate: ratio(verified.length, claimed.length),
    unverifiedClaims: { value: claimed.length - verified.length, n: claimed.length },
    reopenRate: ratio(reopenedEver.length, claimed.length),
    overrides: { value: overrides, n: claimed.length },
    medianDaysToVerified: {
      value: round1(median(verified.filter((i) => i.verifiedAt).map((i) => (i.verifiedAt! - i.reportedAt) / DAY))),
      n: verified.length,
    },
  };
}

export interface MetricDefinition {
  key: MetricKey;
  en: string;
  kn: string;
  unit: '' | '%' | 'h' | 'd';
  betterWhen: 'higher' | 'lower' | 'neutral';
  /** Plain-language definition shown in the "How this is computed" popover. */
  definition: string;
  formula: string;
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  reports: { key: 'reports', en: 'Citizen reports', kn: 'ನಾಗರಿಕ ವರದಿಗಳು', unit: '', betterWhen: 'neutral', definition: 'Every individual report submitted by a citizen, including ones merged into an existing issue.', formula: 'count(reports)' },
  issues: { key: 'issues', en: 'Unique issues', kn: 'ವಿಶಿಷ್ಟ ಸಮಸ್ಯೆಗಳು', unit: '', betterWhen: 'neutral', definition: 'Distinct real-world problems after duplicate reports are merged. Rejected and merged records are excluded.', formula: 'count(issues where status ∉ {duplicate, rejected})' },
  duplicatesMerged: { key: 'duplicatesMerged', en: 'Duplicate reports merged', kn: 'ವಿಲೀನಗೊಂಡ ನಕಲು ವರದಿಗಳು', unit: '', betterWhen: 'neutral', definition: 'Reports that were attached to an issue that already existed instead of creating a new one. Rejection is not a duplicate merge.', formula: 'sum(reportCount − 1) + count(duplicate records)' },
  open: { key: 'open', en: 'Open issues', kn: 'ಬಾಕಿ ಸಮಸ್ಯೆಗಳು', unit: '', betterWhen: 'lower', definition: 'Issues not yet verified fixed by citizens.', formula: 'count(status ∈ {reported, acknowledged, in progress, awaiting check, reopened})' },
  overdue: { key: 'overdue', en: 'Overdue', kn: 'ಗಡುವು ಮೀರಿದವು', unit: '', betterWhen: 'lower', definition: 'Open issues past their acknowledgement deadline (24 h) or their category resolution target.', formula: 'count(open where now > deadline)' },
  medianAckHours: { key: 'medianAckHours', en: 'Median time to acknowledge', kn: 'ಸ್ವೀಕಾರಕ್ಕೆ ಮಧ್ಯಮ ಸಮಯ', unit: 'h', betterWhen: 'lower', definition: 'Half of acknowledged issues were acknowledged faster than this.', formula: 'median(acknowledgedAt − reportedAt)' },
  claimed: { key: 'claimed', en: 'Fixes claimed', kn: 'ಸರಿಪಡಿಸಲಾಗಿದೆ ಎಂಬ ಹಕ್ಕುಗಳು', unit: '', betterWhen: 'neutral', definition: 'Issues an official has marked as fixed, with a resolution photo, at least once.', formula: 'count(issues with ≥ 1 fix claim)' },
  verified: { key: 'verified', en: 'Verified by citizens', kn: 'ನಾಗರಿಕರಿಂದ ದೃಢೀಕೃತ', unit: '', betterWhen: 'higher', definition: 'Claimed fixes that the people who reported the issue confirmed. Silence never counts as confirmation.', formula: 'count(status = verified)' },
  awaitingCheck: { key: 'awaitingCheck', en: 'Awaiting citizen check', kn: 'ಪರಿಶೀಲನೆ ಬಾಕಿ', unit: '', betterWhen: 'neutral', definition: 'Fixes claimed by officials that reporters have not yet confirmed or disputed.', formula: 'count(status = awaiting check)' },
  verifiedRate: { key: 'verifiedRate', en: 'Claims verified', kn: 'ದೃಢೀಕೃತ ಹಕ್ಕುಗಳು', unit: '%', betterWhen: 'higher', definition: 'Share of claimed fixes that citizens verified. This is the gap between what is announced and what residents confirm.', formula: 'verified ÷ fixes claimed × 100' },
  unverifiedClaims: { key: 'unverifiedClaims', en: 'Unverified claims', kn: 'ದೃಢೀಕರಿಸದ ಹಕ್ಕುಗಳು', unit: '', betterWhen: 'lower', definition: 'Claimed fixes not (or not yet) confirmed by citizens — awaiting check, disputed or reopened.', formula: 'fixes claimed − verified' },
  reopenRate: { key: 'reopenRate', en: 'Reopen rate', kn: 'ಮರುತೆರೆಯುವ ದರ', unit: '%', betterWhen: 'lower', definition: 'Share of claimed fixes that citizens disputed and reopened at least once.', formula: 'issues reopened ≥ 1 ÷ fixes claimed × 100' },
  overrides: { key: 'overrides', en: 'Claims over evidence flag', kn: 'ಸಾಕ್ಷ್ಯ ಎಚ್ಚರಿಕೆ ಮೀರಿದ ಹಕ್ಕುಗಳು', unit: '', betterWhen: 'lower', definition: 'Fix claims an official submitted after the evidence check flagged the photo, with a written justification.', formula: 'count(override submissions)' },
  medianDaysToVerified: { key: 'medianDaysToVerified', en: 'Median days to verified fix', kn: 'ದೃಢೀಕೃತ ಪರಿಹಾರಕ್ಕೆ ಮಧ್ಯಮ ದಿನಗಳು', unit: 'd', betterWhen: 'lower', definition: 'From first report to citizen-verified fix, for verified issues.', formula: 'median(verifiedAt − reportedAt)' },
};

/** Below this sample size the UI must show a "small sample" caution next to rates. */
export const SMALL_SAMPLE_N = 5;
