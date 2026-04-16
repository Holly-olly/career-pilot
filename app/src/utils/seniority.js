// Seniority Level Matching
// Infers seniority level (1-5) from JD and CV, calculates fit

/**
 * Extract seniority level from JD and CV, calculate fit
 * @param {string} jd - Job description
 * @param {string} cv - CV text
 * @returns {object} { score: 0-1, jd_level, cv_level, detail }
 */
export function extractSeniorityMatch(jd, cv) {
  const jd_level = inferSeniorityLevel(jd, 'jd');
  const cv_level = inferSeniorityLevel(cv, 'cv');

  // Proximity score: 1 - (|jd_level - cv_level| / 4)
  const proximity = 1 - Math.abs(jd_level - cv_level) / 4;
  const score = Math.max(0, proximity);

  // Create detail description
  const levelNames = {
    1: 'Junior/Entry-level',
    2: 'Mid-level',
    3: 'Senior',
    4: 'Lead/Principal',
    5: 'Executive',
  };
  const detail = `${levelNames[jd_level]} role, ${levelNames[cv_level]} candidate`;

  return {
    score: Math.round(score * 100) / 100,
    jd_level,
    cv_level,
    detail,
  };
}

/**
 * Infer seniority level (1-5) from text
 * @param {string} text - JD or CV text
 * @param {string} source - 'jd' or 'cv'
 * @returns {number} Level: 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Executive
 */
function inferSeniorityLevel(text, source) {
  const text_lower = text.toLowerCase();

  // Define keywords for each level
  const executives = [
    'ceo',
    'cto',
    'cfo',
    'vp ',
    'vice president',
    'chief',
    'director of',
    'head of',
  ];
  const leads = [
    'principal',
    'tech lead',
    'engineering lead',
    'lead engineer',
    'manager',
    'owner',
  ];
  const seniors = [
    'senior',
    'sr.',
    'sr ',
    '5+ years',
    '5-6 years',
    '7+ years',
    '8+ years',
  ];
  const mids = ['mid', 'mid-level', '3+ years', '3-4 years', '4+ years'];
  const juniors = [
    'junior',
    'jr ',
    'jr.',
    'entry',
    '0-2 years',
    'entry-level',
  ];

  // Check executives
  if (executives.some((term) => text_lower.includes(term))) return 5;
  // Check leads
  if (leads.some((term) => text_lower.includes(term))) return 4;
  // Check seniors
  if (seniors.some((term) => text_lower.includes(term))) return 3;
  // Check mids
  if (mids.some((term) => text_lower.includes(term))) return 2;
  // Check juniors
  if (juniors.some((term) => text_lower.includes(term))) return 1;

  // For CV only: parse years of experience
  if (source === 'cv') {
    const yearsMatch = text_lower.match(/(\d+)\s*(?:\+)?\s*years?/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      if (years <= 2) return 1;
      if (years <= 4) return 2;
      if (years <= 6) return 3;
      if (years <= 10) return 4;
      return 5;
    }
  }

  // For JD only: parse years required
  if (source === 'jd') {
    const yearsRequired = text_lower.match(/(\d+)\s*(?:\+)?\s*years?.*(?:experience|exp)/i);
    if (yearsRequired) {
      const years = parseInt(yearsRequired[1]);
      if (years <= 2) return 1;
      if (years <= 4) return 2;
      if (years <= 6) return 3;
      if (years <= 10) return 4;
      return 5;
    }
  }

  // Default to mid-level
  return 3;
}
