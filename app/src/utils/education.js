// Education Level Matching
// Extracts required education from JD, infers candidate level from CV,
// and scores the match using a graduated matrix.
//
// Level scale:
//   0 — No degree / high school
//   1 — Bachelor's (BA, BSc, BS)
//   2 — Master's (MA, MSc, MS, MBA, MEd)
//   3 — PhD / Doctorate
//   4 — Professional degree (MD, JD, PsyD — rare in hiring tech)
//
// Scoring matrix (candidate level vs JD requirement):
//   Overqualified by 1+: slight penalty (0.85) — some roles screen out overqualified
//   Exact match:         1.0
//   Under by 1:          0.7  — "preferred" language softens this
//   Under by 2:          0.4
//   Under by 3+:         0.1
//
// "Preferred" vs "Required" distinction:
//   If JD uses soft language ("preferred", "nice to have", "or equivalent"),
//   under-by-1 is scored 0.85 instead of 0.7.

const LEVEL_NAMES = {
  0: 'High school / no degree',
  1: "Bachelor's",
  2: "Master's",
  3: 'PhD / Doctorate',
  4: 'Professional degree',
};

// JD patterns for each level
const JD_LEVEL_PATTERNS = [
  // PhD / Doctorate (check before Master's — "PhD preferred" shouldn't match Master's first)
  {
    level: 3,
    required: [
      /\bph\.?d\.?\b/i,
      /\bdoctorate\b/i,
      /\bdoctoral\b/i,
    ],
    preferred: [
      /\bph\.?d\.?\s+(?:preferred|a plus|is a plus|desirable)/i,
      /\bprefer(?:red|ably)?\s+.*ph\.?d/i,
    ],
  },
  // Master's
  {
    level: 2,
    required: [
      /\bm\.?[as]\.?\b/i,
      /\bmaster'?s?\b/i,
      /\bmsc\b/i,
      /\bmba\b/i,
      /\bm\.?ed\.?\b/i,
      /\bgraduate degree\b/i,
      /\bpostgraduate\b/i,
    ],
    preferred: [
      /\bmaster'?s?\s+(?:preferred|a plus|is a plus|desirable)/i,
      /\bprefer(?:red|ably)?\s+.*master/i,
      /\bmba\s+(?:preferred|a plus)/i,
    ],
  },
  // Bachelor's
  {
    level: 1,
    required: [
      /\bb\.?[as]\.?\b/i,
      /\bbachelor'?s?\b/i,
      /\bbsc\b/i,
      /\bundergraduate degree\b/i,
      /\b4[- ]year degree\b/i,
      /\bcollege degree\b/i,
      /\bdegree in\b/i,
    ],
    preferred: [
      /\bbachelor'?s?\s+(?:preferred|a plus|is a plus|desirable)/i,
      /\bprefer(?:red|ably)?\s+.*bachelor/i,
    ],
  },
];

// CV patterns for each level (check highest first)
const CV_LEVEL_PATTERNS = [
  { level: 4, patterns: [/\bmd\b/i, /\bj\.?d\.?\b/i, /\bpsy\.?d\.?\b/i] },
  { level: 3, patterns: [/\bph\.?d\.?\b/i, /\bdoctorate\b/i, /\bdoctoral\b/i] },
  {
    level: 2,
    patterns: [
      /\bm\.?[as]\.?\b/i, /\bmaster'?s?\b/i, /\bmsc\b/i,
      /\bmba\b/i, /\bm\.?ed\.?\b/i, /\bpostgraduate\b/i,
    ],
  },
  {
    level: 1,
    patterns: [
      /\bb\.?[as]\.?\b/i, /\bbachelor'?s?\b/i, /\bbsc\b/i,
      /\bundergraduate\b/i,
    ],
  },
];

/**
 * Infer education level required by a JD.
 * Returns { level, is_preferred, detail }
 */
function parseJDEducation(jd) {
  // Check preferred patterns first (more specific — preferred PhD > required Master's)
  for (const entry of JD_LEVEL_PATTERNS) {
    if (entry.preferred.some((p) => p.test(jd))) {
      return {
        level: entry.level,
        is_preferred: true,
        detail: `${LEVEL_NAMES[entry.level]} (preferred)`,
      };
    }
  }
  // Then required patterns
  for (const entry of JD_LEVEL_PATTERNS) {
    if (entry.required.some((p) => p.test(jd))) {
      return {
        level: entry.level,
        is_preferred: false,
        detail: `${LEVEL_NAMES[entry.level]} (required)`,
      };
    }
  }
  // No education requirement found
  return { level: null, is_preferred: false, detail: 'No education requirement specified' };
}

/**
 * Infer candidate education level from CV text.
 * Returns { level, detail }
 */
function parseCVEducation(cv) {
  for (const entry of CV_LEVEL_PATTERNS) {
    if (entry.patterns.some((p) => p.test(cv))) {
      return { level: entry.level, detail: LEVEL_NAMES[entry.level] };
    }
  }
  return { level: 0, detail: LEVEL_NAMES[0] };
}

/**
 * Score the education match.
 * @param {number} cv_level     - Candidate's highest degree (0–4)
 * @param {number} jd_level     - JD requirement (0–4), or null if unspecified
 * @param {boolean} is_preferred - Whether JD uses soft ("preferred") language
 * @returns {number} Score 0–1
 */
function scoreEducation(cv_level, jd_level, is_preferred) {
  if (jd_level === null) return 1.0; // No requirement → no penalty

  const diff = cv_level - jd_level; // positive = overqualified, negative = underqualified

  if (diff >= 1)  return 0.85; // Overqualified — slight penalty
  if (diff === 0) return 1.0;  // Exact match
  if (diff === -1) return is_preferred ? 0.85 : 0.7; // One level under — softened if preferred
  if (diff === -2) return 0.4;
  return 0.1; // Under by 3+
}

/**
 * Main export: Extract and score education match.
 * @param {string} jd  - Job description text
 * @param {string} cv  - CV text
 * @returns {object} { score: 0-1, cv_level, jd_level, is_preferred, detail }
 */
export function extractEducationMatch(jd, cv) {
  const jdEdu = parseJDEducation(jd);
  const cvEdu = parseCVEducation(cv);
  const score = scoreEducation(cvEdu.level, jdEdu.level, jdEdu.is_preferred);

  return {
    score: Math.round(score * 100) / 100,
    cv_level: cvEdu.level,
    cv_detail: cvEdu.detail,
    jd_level: jdEdu.level,
    jd_detail: jdEdu.detail,
    is_preferred: jdEdu.is_preferred,
    detail: `${cvEdu.detail} vs ${jdEdu.detail}`,
  };
}
