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
  '❌ No Interview',
  '📉 No Offer',
  '🚫 Dismissed',
  '✅ Offer',
];

// ── AI verdict options ────────────────────────────────────────────────────────
export const VERDICTS = ['Apply', 'Consider', 'Skip'];

// ── Score → Tailwind text-colour class ───────────────────────────────────────
// Thresholds aligned with the verdict bands defined in the prompt:
//   75–100 → Apply    (green)
//   45–74  → Consider (yellow)
//    0–44  → Skip     (red)
export function scoreColor(score) {
  if (score === null || score === undefined) return 'text-slate-500';
  if (score >= 75) return 'text-emerald-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-red-400';
}

// ── Verdict → Tailwind text colour class ──────────────────────────────────────
export function verdictBadge(verdict) {
  switch (verdict) {
    case 'Apply':    return 'text-emerald-400';
    case 'Consider': return 'text-yellow-400';
    case 'Skip':     return 'text-red-400';
    default:         return 'text-slate-400';
  }
}
