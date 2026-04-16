// Location & Remote Matching
// Matches location preferences, handles hard NOs for remote/travel

/**
 * Extract location preferences and check against user settings
 * @param {string} jd - Job description
 * @param {string} cv - CV text
 * @param {object} settings - User settings { location_preference, ... }
 * @returns {object} { score: 0-1, detail, jd_mode }
 */
export function extractLocationMatch(jd, cv, settings = {}) {
  // Parse JD for location mode
  const jd_mode = parseLocationMode(jd);
  const jd_city = parseCity(jd);

  // Get user preference
  const user_preference = settings.location_preference || 'flexible';

  // Calculate match
  const score = calculateLocationScore(jd_mode, jd_city, user_preference);

  // Detail description
  const detail = `${jd_mode} role${jd_city ? ` (${jd_city})` : ''}`;

  return {
    score: Math.round(score * 100) / 100,
    detail,
    jd_mode,
    jd_city,
    user_preference,
  };
}

/**
 * Parse JD for location mode (remote/hybrid/on-site)
 * @param {string} jd - Job description
 * @returns {string} 'remote' | 'hybrid' | 'on-site'
 */
function parseLocationMode(jd) {
  const jd_lower = jd.toLowerCase();

  // Check for remote
  if (
    jd_lower.includes('remote') &&
    !jd_lower.includes('no remote') &&
    !jd_lower.includes('not remote')
  ) {
    return 'remote';
  }

  // Check for hybrid
  if (jd_lower.includes('hybrid') || jd_lower.includes('flexible')) {
    return 'hybrid';
  }

  // Check for on-site/in-office
  if (
    jd_lower.includes('on-site') ||
    jd_lower.includes('in office') ||
    jd_lower.includes('in-office') ||
    jd_lower.includes('5 days')
  ) {
    return 'on-site';
  }

  // Default: hybrid
  return 'hybrid';
}

/**
 * Extract city from JD
 * @param {string} jd - Job description
 * @returns {string | null} City name or null
 */
function parseCity(jd) {
  // Simple regex: look for "City, State" patterns
  const match = jd.match(/(\w+),\s*(CA|NY|TX|MA|WA|IL|TX|CO|WI|GA|IL|NC|OH|PA)/i);
  return match ? match[1] : null;
}

/**
 * Calculate location match score
 * @param {string} jd_mode - Job location mode ('remote', 'hybrid', 'on-site')
 * @param {string} jd_city - Job city
 * @param {string} user_preference - User's location preference
 * @returns {number} Score 0-1
 */
function calculateLocationScore(jd_mode, jd_city, user_preference) {
  const pref = user_preference.toLowerCase();

  // Perfect matches
  if (pref === 'remote' && jd_mode === 'remote') return 1.0;
  if (pref === 'hybrid' && jd_mode === 'hybrid') return 1.0;
  if (pref === 'on-site' && jd_mode === 'on-site') return 1.0;

  // Flexible users accept anything
  if (pref === 'flexible') {
    return 1.0;
  }

  // Remote-preference users
  if (pref === 'remote') {
    if (jd_mode === 'hybrid') return 0.7; // Can do some in-office
    if (jd_mode === 'on-site') return 0.2; // Prefers remote
  }

  // Hybrid-preference users
  if (pref === 'hybrid') {
    if (jd_mode === 'remote') return 0.9; // Happy with full remote
    if (jd_mode === 'on-site') return 0.6; // Prefers some remote
  }

  // On-site preference users
  if (pref === 'on-site') {
    if (jd_mode === 'hybrid') return 0.7;
    if (jd_mode === 'remote') return 0.4; // Wants in-office
  }

  return 0.5; // Fallback
}
