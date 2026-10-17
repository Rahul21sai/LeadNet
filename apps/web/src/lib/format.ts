const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });

export function timeAgo(ms: number, now = Date.now()): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, size] of units) {
    if (abs >= size) return rtf.format(Math.round(diff / size), unit);
  }
  return 'just now';
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (Math.abs(h) < 48) return `${Math.round(h * 10) / 10}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
}

export function formatNumber(n: number | null, unit: '' | '%' | 'h' | 'd' = ''): string {
  if (n === null) return '—';
  const s = Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 1 });
  return unit ? `${s}${unit === '%' ? '%' : ` ${unit}`}` : s;
}

export function formatInr(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1e7) return `₹${Math.round((n / 1e7) * 10) / 10} Cr`;
  if (n >= 1e5) return `₹${Math.round((n / 1e5) * 10) / 10} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
