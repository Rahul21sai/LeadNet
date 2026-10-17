import { ACK_SLA_HOURS, CATEGORY_META } from './categories.ts';
import type { Category, Status } from './enums.ts';

const HOUR = 3_600_000;

export interface SlaInput {
  category: Category;
  status: Status;
  reportedAt: number;
  acknowledgedAt?: number | null;
  verifiedAt?: number | null;
}

export interface SlaState {
  ackDueAt: number;
  resolveDueAt: number;
  ackBreached: boolean;
  resolveBreached: boolean;
  /** Overdue = open past either applicable deadline. */
  overdue: boolean;
  /** Hours until the next relevant deadline (negative = overdue by). */
  hoursToNextDeadline: number | null;
}

const CLOSED: readonly Status[] = ['verified', 'rejected', 'duplicate'];

/** Deadlines run from the first report. Times are epoch milliseconds. */
export function computeSla(i: SlaInput, now: number): SlaState {
  const ackDueAt = i.reportedAt + ACK_SLA_HOURS * HOUR;
  const resolveDueAt = i.reportedAt + CATEGORY_META[i.category].slaResolveHours * HOUR;
  const closed = CLOSED.includes(i.status);

  const ackAt = i.acknowledgedAt ?? null;
  const ackBreached = ackAt ? ackAt > ackDueAt : !closed && now > ackDueAt;
  const resolveEnd = i.verifiedAt ?? null;
  const resolveBreached = resolveEnd ? resolveEnd > resolveDueAt : !closed && now > resolveDueAt;

  let hoursToNextDeadline: number | null = null;
  if (!closed) {
    const next = !ackAt ? ackDueAt : resolveDueAt;
    hoursToNextDeadline = Math.round(((next - now) / HOUR) * 10) / 10;
  }

  return {
    ackDueAt,
    resolveDueAt,
    ackBreached,
    resolveBreached,
    overdue: !closed && ((!ackAt && now > ackDueAt) || now > resolveDueAt),
    hoursToNextDeadline,
  };
}
