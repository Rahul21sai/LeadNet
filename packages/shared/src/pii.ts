/**
 * Deterministic text guards used by the AI output verifier and by every
 * public-facing write. Reports become public records, so personal data is
 * scrubbed in code — not by asking the model nicely.
 */

const PATTERNS: Array<{ kind: 'phone' | 'email' | 'aadhaar' | 'pan'; re: RegExp; mask: string }> = [
  { kind: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, mask: '[email removed]' },
  { kind: 'aadhaar', re: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, mask: '[ID removed]' },
  { kind: 'phone', re: /(?:\+91[\s-]?|\b0)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, mask: '[phone removed]' },
  { kind: 'pan', re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, mask: '[ID removed]' },
];

export interface ScrubResult {
  text: string;
  removed: Array<'phone' | 'email' | 'aadhaar' | 'pan'>;
}

export function scrubPII(input: string): ScrubResult {
  let text = input;
  const removed: ScrubResult['removed'] = [];
  for (const p of PATTERNS) {
    const matches = [...normalizeDigits(text).matchAll(p.re)];
    if (matches.length) removed.push(p.kind);
    for (const match of matches.reverse()) text = text.slice(0, match.index) + p.mask + text.slice(match.index + match[0].length);
  }
  return { text, removed };
}

function normalizeDigits(text: string): string {
  return text.replace(/[೦-೯०-९]/g, (digit) => String(digit.charCodeAt(0) - (digit >= '೦' && digit <= '೯' ? 0x0ce6 : 0x0966)));
}

const KANNADA = /[ಀ-೿]/g;
const LETTER = /\p{L}/gu;

/** Share of letters that are Kannada script (0..1). Used to verify `kn` fields really are Kannada. */
export function kannadaRatio(text: string): number {
  const letters = text.match(LETTER)?.length ?? 0;
  if (!letters) return 0;
  return (text.match(KANNADA)?.length ?? 0) / letters;
}

export function isKannada(text: string, threshold = 0.6): boolean {
  return kannadaRatio(text) >= threshold;
}

/** Every number appearing in `text` (used to check a narrative only cites computed facts). */
export function extractNumbers(text: string): number[] {
  const normalized = normalizeDigits(text);
  return (normalized.match(/-?\d+(?:,\d{2,3})*(?:\.\d+)?/g) ?? [])
    .map((n) => Number(n.replaceAll(',', ''))).filter(Number.isFinite);
}
