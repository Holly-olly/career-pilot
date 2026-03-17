/**
 * Extracts SCORE and VERDICT from AI report text.
 * Looks for the Technical Metadata section at the end of the report.
 */
export function parseReport(text) {
  const scoreMatch = text.match(/[-–]\s*SCORE:\s*(\d+)/i);
  const verdictMatch = text.match(/[-–]\s*VERDICT:\s*(Apply|Consider|Skip)/i);

  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : null;
  const verdict = verdictMatch ? verdictMatch[1] : null;

  return { score, verdict };
}

/**
 * Attempts to extract company and role from the first # heading in the report.
 * Format: # ROLE: {role} — {company}
 */
export function parseRoleFromReport(text) {
  const match = text.match(/^#\s*ROLE:\s*(.+?)\s*[—–-]\s*(.+)$/m);
  if (match) {
    return { role: match[1].trim(), company: match[2].trim() };
  }
  return null;
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
