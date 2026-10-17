import { CATEGORY_META, HAZARD_META } from './categories.ts';
import type { Category, Hazard, Severity } from './enums.ts';

/**
 * Priority is a published, deterministic formula — never a model output.
 * Gemini only suggests severity and hazard flags (from closed lists); the
 * citizen can correct them; this function turns them into a score.
 *
 * score = 100 × Σ weightᵢ × valueᵢ   (each valueᵢ ∈ [0,1])
 */
export const PRIORITY_WEIGHTS = {
  severity: 0.4,
  hazards: 0.2,
  category: 0.15,
  support: 0.15,
  age: 0.1,
} as const;

/** Support saturates: 50 unique supporters = full support value. Popularity alone can't dominate. */
export const SUPPORT_SATURATION = 50;

export interface PriorityInput {
  category: Category;
  severity: Severity;
  hazards: readonly Hazard[];
  /** Unique citizens who reported or supported the issue. */
  supporters: number;
  /** Hours since the first report. */
  ageHours: number;
}

export interface PriorityComponent {
  key: keyof typeof PRIORITY_WEIGHTS;
  label: string;
  weight: number;
  /** Normalised input value, 0..1. */
  value: number;
  /** weight × value × 100, rounded to 1 dp. */
  points: number;
  explain: string;
}

export interface PriorityResult {
  score: number;
  band: 'critical' | 'high' | 'medium' | 'low';
  components: PriorityComponent[];
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computePriority(input: PriorityInput): PriorityResult {
  const meta = CATEGORY_META[input.category];
  const severityValue = clamp01((input.severity - 1) / 4);
  const hazardValue = clamp01(input.hazards.reduce((sum, h) => sum + HAZARD_META[h].weight, 0) / 0.5);
  const categoryValue = clamp01(meta.baseRisk);
  const supportValue = clamp01(Math.log2(1 + Math.max(0, input.supporters)) / Math.log2(1 + SUPPORT_SATURATION));
  const ageValue = clamp01(input.ageHours / meta.slaResolveHours);

  const parts: Array<Omit<PriorityComponent, 'points'>> = [
    { key: 'severity', label: 'Severity', weight: PRIORITY_WEIGHTS.severity, value: severityValue, explain: `Severity ${input.severity} of 5` },
    {
      key: 'hazards',
      label: 'Safety hazards',
      weight: PRIORITY_WEIGHTS.hazards,
      value: hazardValue,
      explain: input.hazards.length ? input.hazards.map((h) => HAZARD_META[h].en).join(', ') : 'No hazard flags',
    },
    { key: 'category', label: 'Category risk', weight: PRIORITY_WEIGHTS.category, value: categoryValue, explain: `${meta.en} base risk ${meta.baseRisk}` },
    {
      key: 'support',
      label: 'Community reach',
      weight: PRIORITY_WEIGHTS.support,
      value: supportValue,
      explain: `${input.supporters} unique citizen${input.supporters === 1 ? '' : 's'} (log-scaled, saturates at ${SUPPORT_SATURATION})`,
    },
    {
      key: 'age',
      label: 'Time open',
      weight: PRIORITY_WEIGHTS.age,
      value: ageValue,
      explain: `${Math.round(input.ageHours)}h of a ${meta.slaResolveHours}h target`,
    },
  ];

  const components = parts.map((p) => ({ ...p, value: round1(p.value * 100) / 100, points: round1(p.weight * p.value * 100) }));
  const score = round1(components.reduce((s, c) => s + c.points, 0));
  const band = score >= 70 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score, band, components };
}
