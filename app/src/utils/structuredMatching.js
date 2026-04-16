// Structured Matching Layer
// Deterministic, explainable scoring before LLM
// Components: Skills (35%) + Seniority (28%) + Location (17%) + Education (20%)
//
// V2 weights (research-aligned):
//   Skills 35%, Seniority 28%, Education 20%, Location 17%
//
// V1 weights (original, frozen for evaluation comparison):
//   Skills 40%, Seniority 35%, Location 25%, Education 0%

import { extractSkillsMatch } from './skillExtractor.js';
import { extractSeniorityMatch } from './seniority.js';
import { extractLocationMatch } from './location.js';
import { extractEducationMatch } from './education.js';

/**
 * Main entry point: Extract all structured features
 * @param {string} jd - Job description text
 * @param {string} cv - CV text
 * @param {object} settings - User settings { notCoveredSkills, hardNos, ... }
 * @returns {object} Complete structured analysis
 */
export async function extractStructuredFeatures(jd, cv, settings = {}) {
  // Hard NOs check first (can short-circuit)
  const hardNoCheck = checkHardNOs(jd, settings.hardNos || []);

  if (hardNoCheck.violated) {
    return {
      structured_score: 0,
      hard_nos: {
        checked: true,
        violated: true,
        reason: hardNoCheck.reason,
        detail: hardNoCheck.detail,
      },
      breakdown: null,
      skip_llm: true,
      skip_reason: `Hard NO violated: ${hardNoCheck.reason}`,
    };
  }

  // Calculate individual components
  const skills = await extractSkillsMatch(jd, cv, settings.notCoveredSkills || []);
  const seniority = extractSeniorityMatch(jd, cv);
  const location = extractLocationMatch(jd, cv, settings);
  const education = extractEducationMatch(jd, cv);

  // V2 weights (research-aligned): Skills 35%, Seniority 28%, Education 20%, Location 17%
  const weights = {
    skills: 0.35,
    seniority: 0.28,
    education: 0.20,
    location: 0.17,
  };

  const structured_score =
    skills.score    * weights.skills +
    seniority.score * weights.seniority +
    education.score * weights.education +
    location.score  * weights.location;

  return {
    structured_score: Math.round(structured_score * 100) / 100,
    hard_nos: {
      checked: true,
      violated: false,
    },
    breakdown: {
      skills,
      seniority,
      education,
      location,
    },
    skip_llm: false,
  };
}

/**
 * Check if JD violates any hard NOs
 * @param {string} jd - Job description
 * @param {array} hardNos - User's hard constraints
 * @returns {object} { violated: bool, reason: string, detail: string }
 */
function checkHardNOs(jd, hardNos) {
  if (!hardNos || hardNos.length === 0) {
    return { violated: false };
  }

  const jd_lower = jd.toLowerCase();

  for (const hard_no of hardNos) {
    const hard_no_lower = hard_no.toLowerCase();

    // Pattern matching for common hard NOs
    if (
      hard_no_lower.includes('remote-only') ||
      hard_no_lower.includes('remote only')
    ) {
      if (
        (jd_lower.includes('on-site') && !jd_lower.includes('remote')) ||
        (jd_lower.includes('5 days') && !jd_lower.includes('remote'))
      ) {
        return {
          violated: true,
          reason: hard_no,
          detail: 'JD requires on-site/in-office without remote option',
        };
      }
    }

    if (hard_no_lower.includes('no travel') || hard_no_lower.includes('no travel')) {
      if (
        jd_lower.includes('frequent travel') ||
        jd_lower.includes('travel required')
      ) {
        return {
          violated: true,
          reason: hard_no,
          detail: 'JD requires travel, violates your constraint',
        };
      }
    }

    if (hard_no_lower.includes('startup only')) {
      if (
        jd_lower.includes('fortune 500') ||
        jd_lower.includes('enterprise') ||
        jd_lower.includes('10,000+') ||
        jd_lower.includes('+10k')
      ) {
        return {
          violated: true,
          reason: hard_no,
          detail: 'JD is enterprise/large company, not startup',
        };
      }
    }
  }

  return { violated: false };
}

/**
 * Format structured breakdown for prompt injection
 * @param {object} analysis - Output from extractStructuredFeatures
 * @returns {string} Formatted context for LLM
 */
export function formatStructuredContext(analysis) {
  if (analysis.skip_llm) {
    return `[PRE-SCREENING: This position was automatically flagged as not matching — ${analysis.skip_reason}]`;
  }

  const { breakdown } = analysis;
  const { skills, seniority, education, location } = breakdown;

  let context = `[STRUCTURED PRE-SCREENING RESULTS (use as reference, not as final decision):\n`;
  context += `- Skills Match: ${Math.round(skills.score * 100)}% (${skills.detail})\n`;
  context += `- Seniority Match: ${Math.round(seniority.score * 100)}% (${seniority.detail})\n`;
  context += `- Education Match: ${Math.round(education.score * 100)}% (${education.detail})\n`;
  context += `- Location Match: ${Math.round(location.score * 100)}% (${location.detail})\n`;
  context += `- Overall Structured Score: ${Math.round(analysis.structured_score * 100)}\n`;
  context += `]\n`;

  return context;
}
