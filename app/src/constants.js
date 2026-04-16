/**
 * Shared constants and tiny pure helpers used across multiple components.
 *
 * Keeping these in one place means you only need to update them once:
 *   - Add a new status? Edit STATUSES here.
 *   - Change a score colour threshold? Edit scoreColor here.
 */

// ── Job statuses (ordered to reflect the natural pipeline progression) ───────
export const STATUSES = [
  '👀 New',
  '🎯 Target',
  '📨 Applied',
  '🤝 Interview',
  '❌ Rejected (App)',
  '📉 Rejected (Int)',
  '🚫 Dismissed',
  '✅ Offer',
];

// ── AI verdict options ────────────────────────────────────────────────────────
export const VERDICTS = ['Apply', 'Consider', 'Skip'];

// ── Score → Tailwind text-colour class ───────────────────────────────────────
export function scoreColor(score) {
  if (score === null || score === undefined) return 'text-slate-500';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
}

// ── Verdict → Tailwind badge classes (background + text + border) ─────────────
export function verdictBadge(verdict) {
  switch (verdict) {
    case 'Apply':    return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30';
    case 'Consider': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30';
    case 'Skip':     return 'bg-red-400/10 text-red-400 border-red-400/30';
    default:         return 'bg-slate-700/50 text-slate-400 border-slate-600';
  }
}
