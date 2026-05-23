// Prompt Management & Versioning
// Manages baseline and extended context variations
// Supports easy A/B testing and experimentation

// ──────────────────────────────────────────────────────────────────────────
// Shared prompt fragments — reused by both baseline and extended templates
// ──────────────────────────────────────────────────────────────────────────
//
// Notes on the schema:
// - `talents`, `persona`, `hardNos` are kept in the function signatures for
//   backward compatibility with existing call sites and the localStorage
//   data model, but they are no longer passed into the LLM prompt:
//     · `talents` and `persona` → removed entirely (UI hidden, schema stays
//       intact in case we add them back later).
//     · `hardNos` → handled by code post-processing as a badge (see ai.js);
//       not included in the prompt so the LLM doesn't bias the score.

const RUBRIC_BLOCK = `SCORING RUBRIC (internal use — assess silently, do not reveal weights to user):
1. Skills fit (55%): Ability to apply knowledge and competencies ("can do") — tools, frameworks, methods, language fluency, specific soft skills.
2. Experience (30%): Demonstrated application of these skills in prior roles ("has done"). Consider it as 60% domain similarity and 40% role relevance.
3. Education (10%): Formal qualifications. If the JD does not specify any education requirement, treat education as NEUTRAL — do not penalise the candidate for it.
4. Strategic Alignment (5%): Match with the candidate's stated current focus and career direction.`;

const SCORING_PROCESS = `SCORING PROCESS:

Step 1 — Evaluate each rubric dimension silently against the JD requirements.
Step 2 — SENIORITY CHECK: Determine the JD's seniority requirement (Junior / Middle / Senior / Lead / Head) and the candidate's current level from the CV. If they differ by 2 or more levels in EITHER direction (e.g., a Senior candidate applying to a Junior role, or a Junior candidate applying to a Senior role), the SCORE must NOT exceed 70 regardless of other dimensions.
Step 3 — Combine the dimension assessments into a single SCORE on 0–100, where a HIGHER number means a STRONGER overall fit.
Step 4 — Derive the VERDICT directly from the SCORE band below. Do NOT pick a verdict that contradicts the score.

SCORE BANDS → VERDICT:
- 85–100: strong fit, no major reservations             → Apply
- 75–84:  solid fit, minor caveats                      → Apply
- 60–74:  adjacent domain, transferable skills          → Consider
- 45–59:  weak overlap, mostly surface keyword match    → Consider
-  0–44:  not relevant — different domain or seniority off → Skip`;

const OUTPUT_FULL = `Produce the analysis in exactly this format. Write in English regardless of the CV/JD language.

# ROLE: [exact role title from JD] — [exact company name from JD]

**SCORE: [0–100]**
**VERDICT: [Apply|Consider|Skip]**

[2–3 sentences explaining the verdict: the main fit signal, the main gap, and how the seniority levels compare. No section header above this paragraph.]

**ROLE SNAPSHOT**
[1–2 sentences: what the employer actually wants — the core problem this role solves. Cut through the wall of text.]

**KEYWORDS**
[Comma-separated keywords from the JD that are missing or under-emphasised in the CV — either because synonyms are used, or because the keyword is absent entirely. No rewrite suggestions.]

**FINAL TIP**
[One actionable sentence for positioning.]

---
Technical Metadata:
SCORE: [number]
VERDICT: [Apply|Consider|Skip]`;

const OUTPUT_SCORE_ONLY = `Return ONLY:
SCORE: [0-100]

---
Technical Metadata:
SCORE: [number]`;

const OUTPUT_SCORE_VERDICT = `Return ONLY:
SCORE: [0-100]
VERDICT: [Apply|Consider|Skip]

---
Technical Metadata:
SCORE: [number]
VERDICT: [Apply|Consider|Skip]`;

function outputForLevel(level) {
  if (level === 'score') return OUTPUT_SCORE_ONLY;
  if (level === 'score+verdict') return OUTPUT_SCORE_VERDICT;
  return OUTPUT_FULL;
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

/**
 * Build prompt based on user context and extended settings
 * @param {object} params - {
 *   persona, talents, currentFocus, hardNos,   // persona/talents/hardNos kept for back-compat, not used
 *   cv, jd, extendedContext,
 *   structuredContext (optional),
 *   templateVersion (optional, default 'baseline'),
 *   outputLevel (optional, 'score' | 'score+verdict' | 'full', default 'full')
 * }
 * @returns {object} { prompt: string, metadata: { version, outputLevel, ... } }
 */
export function buildPrompt({
  persona,
  talents,
  currentFocus,
  hardNos,
  cv,
  jd,
  extendedContext,
  structuredContext,
  templateVersion = 'baseline',
  outputLevel = 'full',
}) {
  const has_extended_context = extendedContext && extendedContext.trim().length > 0;

  const prompt =
    templateVersion === 'extended' && has_extended_context
      ? buildExtendedContextPrompt({
          currentFocus,
          cv,
          jd,
          extendedContext,
          structuredContext,
          outputLevel,
        })
      : buildBaselinePrompt({
          currentFocus,
          cv,
          jd,
          structuredContext,
          outputLevel,
        });

  return {
    prompt,
    metadata: {
      version: has_extended_context ? 'extended' : 'baseline',
      has_extended_context,
      extended_context_value: extendedContext || null,
      includes_structured_context: !!structuredContext,
      template_used: templateVersion,
      output_level: outputLevel,
    },
  };
}

/**
 * Baseline prompt — research-validated rubric, seniority check, minimal report.
 */
function buildBaselinePrompt({
  currentFocus,
  cv,
  jd,
  structuredContext,
  outputLevel = 'full',
}) {
  return `SYSTEM: You are a Senior Hiring Manager. Be objective and concise.

${RUBRIC_BLOCK}

${SCORING_PROCESS}

CANDIDATE HIDDEN CONTEXT (this is not visible in the CV):
- Current Career Focus: ${currentFocus || 'Not specified'}

${structuredContext ? structuredContext : ''}

---
CANDIDATE CV:
${cv}

---
JOB DESCRIPTION:
${jd}

---
${outputForLevel(outputLevel)}`;
}

/**
 * Extended-context prompt — same rubric, plus a reviewer-perspective note.
 */
function buildExtendedContextPrompt({
  currentFocus,
  cv,
  jd,
  extendedContext,
  structuredContext,
  outputLevel = 'full',
}) {
  return `SYSTEM: You are a Senior Hiring Manager. Be objective and concise.

EXTENDED CONTEXT — Who reviews this CV:
${extendedContext}

[Note: Carefully consider how this context shapes CV review. Different reviewers (ATS vs recruiter vs hiring manager) may prioritise different signals. Adapt your assessment accordingly while remaining objective.]

${RUBRIC_BLOCK}

${SCORING_PROCESS}

CANDIDATE HIDDEN CONTEXT (this is not visible in the CV):
- Current Career Focus: ${currentFocus || 'Not specified'}

${structuredContext ? structuredContext : ''}

---
CANDIDATE CV:
${cv}

---
JOB DESCRIPTION:
${jd}

---
${outputForLevel(outputLevel)}`;
}

/**
 * Get list of available prompt versions (for reference)
 * @returns {array} Available versions with descriptions
 */
export function getAvailablePromptVersions() {
  return [
    {
      id: 'baseline',
      name: 'Baseline',
      description: 'Standard scoring without extended context',
      tokens_estimate: 1800,
    },
    {
      id: 'extended',
      name: 'Extended Context',
      description: 'Adapts analysis based on who reviews CV (ATS vs recruiter vs hiring manager)',
      tokens_estimate: 2000,
    },
  ];
}

/**
 * Extract score and verdict from LLM response
 * Handles different output levels (score only, score+verdict, full)
 * @param {string} text - LLM response text
 * @param {string} outputLevel - 'score' | 'score+verdict' | 'full'
 * @returns {object} { score: number, verdict: string|null, success: bool }
 */
export function parseAnalysisResponse(text, outputLevel = 'full') {
  try {
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    let verdict = null;
    if (outputLevel !== 'score') {
      const verdictMatch = text.match(/VERDICT:\s*(Apply|Consider|Skip)/i);
      verdict = verdictMatch ? verdictMatch[1] : null;
    }

    if (score === null) {
      return {
        error: 'Could not parse score from response',
        success: false,
      };
    }

    if (outputLevel === 'score+verdict' && verdict === null) {
      return {
        error: 'Could not parse verdict from response',
        success: false,
        score,
      };
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      verdict: verdict || 'Consider',
      success: true,
      raw_text: text,
    };
  } catch (err) {
    return {
      error: `Parse error: ${err.message}`,
      success: false,
    };
  }
}
