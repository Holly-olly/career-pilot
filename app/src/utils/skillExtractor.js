// Skills Extraction & Matching
// Extracts required skills from JD, matches against CV + hidden skills

/**
 * Extract skills from JD and match against CV + hidden skills
 * @param {string} jd - Job description
 * @param {string} cv - CV text
 * @param {array} hiddenSkills - User-added skills (e.g., ["GPT prompt engineering"])
 * @returns {object} { score: 0-1, detail, breakdown }
 */
export async function extractSkillsMatch(jd, cv, hiddenSkills = []) {
  // Step 1: Extract required skills from JD
  const requiredSkills = await parseJDSkills(jd);

  if (!requiredSkills || requiredSkills.length === 0) {
    return {
      score: 1.0,
      detail: 'No specific skills required in JD',
      breakdown: { from_cv: [], from_hidden_skills: [], missing: [] },
    };
  }

  // Step 2: Combine CV + hidden skills
  const cvSkills = parseSkillsFromText(cv);
  const allUserSkills = [...cvSkills, ...hiddenSkills];

  // Step 3: Match each required skill
  let matches = 0;
  const matched_from_cv = [];
  const matched_from_hidden = [];
  const missing_skills = [];

  for (const required of requiredSkills) {
    const match = findSkillMatch(required, allUserSkills, cvSkills, hiddenSkills);

    if (match.found) {
      matches++;
      if (match.source === 'cv') {
        matched_from_cv.push(required);
      } else if (match.source === 'hidden') {
        matched_from_hidden.push(required);
      }
    } else {
      missing_skills.push(required);
    }
  }

  // Step 4: Calculate score (capped at 1.0)
  const rawScore = matches / requiredSkills.length;
  const score = Math.min(rawScore, 1.0);

  return {
    score,
    detail: `${matches}/${requiredSkills.length} required skills match`,
    breakdown: {
      from_cv: matched_from_cv,
      from_hidden_skills: matched_from_hidden,
      missing: missing_skills,
      total_required: requiredSkills.length,
    },
  };
}

/**
 * Extract required skills from JD
 * Currently uses regex fallback; can be replaced with LLM call
 * @param {string} jd - Job description
 * @returns {array} Required skill names
 *
 * NOTE — Vocabulary is engineering-focused (Python, Docker, SQL, etc.).
 * For HR/People Science/Psychometrics JDs this vocabulary rarely fires,
 * causing skills score to default to 100% (no skills found = no penalty).
 * This inflates structured scores for irrelevant roles.
 *
 * Possible fixes (deferred):
 *   A) Add a domain-specific vocabulary (psychometrics, HR analytics, etc.)
 *   B) Replace with LLM-based skill extraction (no hardcoded list needed)
 * For now, the LLM layer compensates — structured score is informational only.
 */
async function parseJDSkills(jd) {
  // Simple regex-based extraction
  // Future: Replace with LLM-based extraction for better accuracy

  const skills = [];

  const skillPatterns = {
    'Python': /\bPython\b/i,
    'JavaScript': /\bJavaScript\b/i,
    'TypeScript': /\bTypeScript\b/i,
    'React': /\bReact\b/i,
    'Vue': /\bVue\b/i,
    'Angular': /\bAngular\b/i,
    'AWS': /\bAWS\b/i,
    'GCP': /\bGoogle Cloud|GCP\b/i,
    'Azure': /\bAzure\b/i,
    'Docker': /\bDocker\b/i,
    'Kubernetes': /\bKubernetes|k8s\b/i,
    'PostgreSQL': /\bPostgreSQL|Postgres\b/i,
    'SQL': /\bSQL\b/i,
    'MongoDB': /\bMongo\b/i,
    'Redis': /\bRedis\b/i,
    'Node.js': /\bNode\.?js\b/i,
    'Go': /\bGolang|Go\b/i,
    'Rust': /\bRust\b/i,
    'Java': /\bJava\b/i,
    'C++': /\bC\+\+\b/i,
    'Machine Learning': /\bML|machine learning\b/i,
    'Data Analysis': /\bdata analysis|analytics\b/i,
  };

  for (const [skill, pattern] of Object.entries(skillPatterns)) {
    if (pattern.test(jd)) {
      skills.push(skill);
    }
  }

  return skills.length > 0 ? skills : [];
}

/**
 * Parse skills mentioned in CV text
 * @param {string} text - CV text
 * @returns {array} Skills found in text
 */
function parseSkillsFromText(text) {
  const skills = [];

  const skillKeywords = {
    'Python': ['python'],
    'JavaScript': ['javascript', 'js'],
    'TypeScript': ['typescript', 'ts'],
    'React': ['react'],
    'Vue': ['vue'],
    'Angular': ['angular'],
    'AWS': ['aws', 'amazon web services', 's3', 'lambda', 'ec2'],
    'GCP': ['gcp', 'google cloud'],
    'Azure': ['azure'],
    'Docker': ['docker'],
    'Kubernetes': ['kubernetes', 'k8s'],
    'PostgreSQL': ['postgresql', 'postgres'],
    'SQL': ['sql', 'mysql', 'oracle'],
    'MongoDB': ['mongodb', 'mongo'],
    'Redis': ['redis'],
    'Node.js': ['node.js', 'nodejs', 'node'],
    'Go': ['golang', 'go'],
    'Rust': ['rust'],
    'Java': ['java'],
    'C++': ['c++'],
    'Teaching': ['teaching', 'instructor', 'mentor'],
    'Leadership': ['leadership', 'leader', 'led team', 'managed team'],
  };

  const text_lower = text.toLowerCase();

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some((kw) => text_lower.includes(kw))) {
      skills.push(skill);
    }
  }

  return [...new Set(skills)]; // Deduplicate
}

/**
 * Find if a required skill matches something in user's skills
 * @param {string} required - Required skill name
 * @param {array} allUserSkills - All user skills (CV + hidden)
 * @param {array} cvSkills - Just CV skills (for source attribution)
 * @param {array} hiddenSkills - Just hidden skills (for source attribution)
 * @returns {object} { found: bool, source: 'cv' | 'hidden' }
 */
function findSkillMatch(required, allUserSkills, cvSkills, hiddenSkills) {
  const required_lower = required.toLowerCase();

  // Exact match in CV
  if (cvSkills.some((s) => s.toLowerCase() === required_lower)) {
    return { found: true, source: 'cv' };
  }

  // Exact match in hidden skills
  if (hiddenSkills.some((s) => s.toLowerCase() === required_lower)) {
    return { found: true, source: 'hidden' };
  }

  // Semantic match (e.g., NumPy ≈ Python, Redshift ≈ PostgreSQL)
  const semanticMatches = {
    python: ['numpy', 'pandas', 'scikit-learn', 'tensorflow', 'pytorch'],
    sql: ['postgresql', 'mysql', 'redshift', 'bigquery', 'snowflake'],
    react: ['vue', 'angular', 'next.js', 'remix'],
    aws: ['gcp', 'azure', 's3', 'lambda', 'ec2'],
    kubernetes: ['docker', 'eks', 'aks', 'gke'],
    'machine learning': ['ml', 'deep learning', 'nlp'],
  };

  const matchGroups = semanticMatches[required_lower] || [];

  for (const userSkill of allUserSkills) {
    if (matchGroups.some((m) => userSkill.toLowerCase().includes(m))) {
      return {
        found: true,
        source: cvSkills.includes(userSkill) ? 'cv' : 'hidden',
        semantic: true,
      };
    }
  }

  return { found: false };
}
