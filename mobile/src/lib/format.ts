import type { ValueFormat } from '../types/dashboard';

/** Compact dollars: $1.01B, $48.6M, $826K, $512. */
export function fmtUsd(value: number): string {
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(0)}K`;
  return `${sign}$${v.toFixed(0)}`;
}

export function fmtPct(value: number, signed = false): string {
  const s = `${value.toFixed(1)}%`;
  return signed && value > 0 ? `+${s}` : s;
}

export function fmtCount(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function fmtValue(value: number, format: ValueFormat): string {
  switch (format) {
    case 'usd':
      return fmtUsd(value);
    case 'pct':
      return fmtPct(value);
    case 'signedPct':
      return fmtPct(value, true);
    case 'count':
      return fmtCount(value);
  }
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
