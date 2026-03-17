/**
 * migrate.js
 *
 * Reads all positions from the old Career Pilot pipeline folder and converts
 * them into the new app's localStorage format.
 *
 * Usage:
 *   node scripts/migrate.js
 *
 * Output:
 *   scripts/migration-output.json  ← import this into the app via Settings → Import
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────
const PIPELINE_DIR = '/Users/Olga/Documents/career-pilot/pipeline';
const OUTPUT_FILE  = new URL('./migration-output.json', import.meta.url).pathname;

// ── Status normaliser (old → new) ─────────────────────────────────────────────
const VALID_STATUSES = new Set([
  '👀 New', '🎯 Target', '📨 Applied', '🤝 Interview',
  '❌ Rejected (App)', '📉 Rejected (Int)', '🚫 Dismissed', '✅ Offer',
]);

function normaliseStatus(raw) {
  if (!raw) return '👀 New';
  if (VALID_STATUSES.has(raw)) return raw;
  // fuzzy fallback
  if (raw.includes('Rejected') && raw.includes('Int')) return '📉 Rejected (Int)';
  if (raw.includes('Rejected'))                         return '❌ Rejected (App)';
  if (raw.includes('Applied'))                          return '📨 Applied';
  if (raw.includes('Interview'))                        return '🤝 Interview';
  if (raw.includes('Target'))                           return '🎯 Target';
  if (raw.includes('Offer'))                            return '✅ Offer';
  if (raw.includes('Dismiss'))                          return '🚫 Dismissed';
  return '👀 New';
}

// ── Verdict normaliser ────────────────────────────────────────────────────────
function normaliseVerdict(raw, score) {
  if (raw === 'Apply' || raw === 'Consider' || raw === 'Skip') return raw;
  // Derive from score when verdict is "N/A" or missing
  const s = parseInt(score, 10);
  if (!isNaN(s)) {
    if (s >= 78) return 'Apply';
    if (s >= 60) return 'Consider';
    return 'Skip';
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const folders = readdirSync(PIPELINE_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const jobs = [];
const errors = [];

for (const folder of folders) {
  const base = join(PIPELINE_DIR, folder);
  try {
    const meta   = JSON.parse(readFileSync(join(base, 'meta.json'), 'utf8'));
    const jd     = readFileSync(join(base, 'jd.md'), 'utf8').trim();
    const report = readFileSync(join(base, 'report.md'), 'utf8').trim();

    const score   = meta.score != null ? parseInt(meta.score, 10) : null;
    const verdict = normaliseVerdict(meta.verdict, score);
    const status  = normaliseStatus(meta.status);

    // Use ISO date — prefer applied_date, fall back to date, then today
    const rawDate = meta.applied_date || meta.date || new Date().toISOString().slice(0, 10);
    const date    = new Date(rawDate).toISOString();

    jobs.push({
      id:      randomUUID(),
      company: meta.company  || folder,
      role:    meta.role     || folder,
      jd,
      report,
      score:   isNaN(score) ? null : score,
      verdict,
      status,
      date,
      cvId:    null,
      cvName:  meta.cv || 'Imported',
      // Keep extra metadata as notes
      _source: folder,
    });
  } catch (err) {
    errors.push({ folder, error: err.message });
  }
}

// Sort by date descending (newest first)
jobs.sort((a, b) => new Date(b.date) - new Date(a.date));

writeFileSync(OUTPUT_FILE, JSON.stringify(jobs, null, 2), 'utf8');

console.log(`✅  Migrated ${jobs.length} positions → scripts/migration-output.json`);
if (errors.length) {
  console.warn(`⚠️   ${errors.length} errors:`);
  errors.forEach(e => console.warn(`    ${e.folder}: ${e.error}`));
}

// Quick stats
const byStatus = {};
jobs.forEach(j => { byStatus[j.status] = (byStatus[j.status] || 0) + 1; });
console.log('\nBreakdown:');
Object.entries(byStatus).sort((a,b) => b[1]-a[1]).forEach(([s,n]) => console.log(`  ${s}: ${n}`));
