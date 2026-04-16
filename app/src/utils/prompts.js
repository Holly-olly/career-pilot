// Prompt Management & Versioning
// Manages baseline and extended context variations
// Supports easy A/B testing and experimentation

/**
 * Build prompt based on user context and extended settings
 * @param {object} params - {
 *   persona, talents, currentFocus, hardNos,
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
  outputLevel = 'full', // 'score' | 'score+verdict' | 'full'
}) {
  // Determine if using extended context
  const has_extended_context = extendedContext && extendedContext.trim().length > 0;

  let prompt =
    templateVersion === 'extended' && has_extended_context
      ? buildExtendedContextPrompt({
          persona,
          talents,
          currentFocus,
          hardNos,
          cv,
          jd,
          extendedContext,
          structuredContext,
          outputLevel,
        })
      : buildBaselinePrompt({
          persona,
          talents,
          currentFocus,
          hardNos,
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
 * Baseline prompt with output level support
 * outputLevel: 'score' (~60% tokens saved) | 'score+verdict' (~30% saved) | 'full' (100%)
 */
function buildBaselinePrompt({
  persona,
  talents,
  currentFocus,
  hardNos,
  cv,
  jd,
  structuredContext,
  outputLevel = 'full',
}) {
  const basePrompt = `SYSTEM PERSONA: You are a Senior Hiring Manager specializing in ${
    persona || 'talent acquisition and executive search'
  }.

SCORING RUBRIC (internal use — assess silently, do not reveal weights to user):
1. Domain Expertise (35%): Depth of knowledge and methodology in the candidate's core field
2. Technical Skills (25%): Match with required tools, stack, and analytical methods
3. Seniority Fit (20%): Candidate's experience level vs role's seniority requirement
4. Education Fit (15%): Candidate's qualification level vs role's education requirement
5. Strategic Alignment (5%): Match with candidate's stated current focus and career direction

Score bands:
- 80–100: Strong fit — would shortlist for interview with confidence
- 65–79:  Partial fit — real overlap, genuine chance of being shortlisted
- 50–64:  Adjacent domain — transferable skills but core of role is misaligned
- 25–49:  Weak overlap — surface keyword match only
- 0–24:   Not relevant — different domain or hard dealbreaker present

CANDIDATE HIDDEN CONTEXT (weigh heavily — this is not visible in the CV):
- Unlisted Talents/Experience: ${talents || 'None specified'}
- Current Career Focus: ${currentFocus || 'Not specified'}
- Hard NOs / Dealbreakers: ${hardNos || 'None'}

${structuredContext ? structuredContext : ''}

---
CANDIDATE CV:
${cv}

---
JOB DESCRIPTION:
${jd}

---`;

  // Output level determines what to return
  if (outputLevel === 'score') {
    return (
      basePrompt +
      `
Return ONLY:
SCORE: [0-100]

---
Technical Metadata:
SCORE: [number]`
    );
  }

  if (outputLevel === 'score+verdict') {
    return (
      basePrompt +
      `
Return ONLY:
SCORE: [0-100]
VERDICT: [Apply|Consider|Skip]

---
Technical Metadata:
SCORE: [number]
VERDICT: [Apply|Consider|Skip]`
    );
  }

  // Default: full output
  return (
    basePrompt +
    `
Produce the analysis in exactly this format:

# ROLE: [exact role title from JD] — [exact company name from JD]

**SCORE: [0–100]**
**VERDICT: [Apply|Consider|Skip]**

**ROLE SNAPSHOT**
One sentence describing the core problem this role solves.

**SUMMARY**
2–3 sentences: domain match, key fit signal, and the main gap.

**CV TWEAKS FOR THIS ROLE**
• Replace: "[Old]" → "[New]"
• Highlight: [specific experience to promote]

**ATS KEYWORDS**
[5–8 comma-separated keywords from JD that the candidate has demonstrated]

**FINAL TIP**
[One actionable sentence for positioning]

---
Technical Metadata:
SCORE: [number]
VERDICT: [Apply|Consider|Skip]`
  );
}

/**
 * Extended context prompt with output level support
 * Includes role description (ATS, recruiter, hiring manager, etc.)
 * outputLevel: 'score' | 'score+verdict' | 'full'
 */
function buildExtendedContextPrompt({
  persona,
  talents,
  currentFocus,
  hardNos,
  cv,
  jd,
  extendedContext,
  structuredContext,
  outputLevel = 'full',
}) {
  const basePrompt = `SYSTEM PERSONA: You are a Senior Hiring Manager specializing in ${
    persona || 'talent acquisition and executive search'
  }.

EXTENDED CONTEXT - Who reviews this CV:
${extendedContext}

[Note: Carefully consider how this context shapes CV review. Different reviewers (ATS vs recruiter vs hiring manager) may prioritize different signals. Adapt your assessment accordingly while remaining objective.]

SCORING RUBRIC (internal use — assess silently, do not reveal weights to user):
1. Domain Expertise (35%): Depth of knowledge and methodology in the candidate's core field
2. Technical Skills (25%): Match with required tools, stack, and analytical methods
3. Seniority Fit (20%): Candidate's experience level vs role's seniority requirement
4. Education Fit (15%): Candidate's qualification level vs role's education requirement
5. Strategic Alignment (5%): Match with candidate's stated current focus and career direction

Score bands:
- 80–100: Strong fit — would shortlist for interview with confidence
- 65–79:  Partial fit — real overlap, genuine chance of being shortlisted
- 50–64:  Adjacent domain — transferable skills but core of role is misaligned
- 25–49:  Weak overlap — surface keyword match only
- 0–24:   Not relevant — different domain or hard dealbreaker present

CANDIDATE HIDDEN CONTEXT (weigh heavily — this is not visible in the CV):
- Unlisted Talents/Experience: ${talents || 'None specified'}
- Current Career Focus: ${currentFocus || 'Not specified'}
- Hard NOs / Dealbreakers: ${hardNos || 'None'}

${structuredContext ? structuredContext : ''}

---
CANDIDATE CV:
${cv}

---
JOB DESCRIPTION:
${jd}

---`;

  // Output level determines what to return
  if (outputLevel === 'score') {
    return (
      basePrompt +
      `
Return ONLY:
SCORE: [0-100]

---
Technical Metadata:
SCORE: [number]`
    );
  }

  if (outputLevel === 'score+verdict') {
    return (
      basePrompt +
      `
Return ONLY:
SCORE: [0-100]
VERDICT: [Apply|Consider|Skip]

---
Technical Metadata:
SCORE: [number]
VERDICT: [Apply|Consider|Skip]`
    );
  }

  // Default: full output
  return (
    basePrompt +
    `
Produce the analysis in exactly this format:

# ROLE: [exact role title from JD] — [exact company name from JD]

**SCORE: [0–100]**
**VERDICT: [Apply|Consider|Skip]**

**ROLE SNAPSHOT**
One sentence describing the core problem this role solves.

**SUMMARY**
2–3 sentences: domain match, key fit signal, and the main gap.

**CV TWEAKS FOR THIS ROLE**
• Replace: "[Old]" → "[New]"
• Highlight: [specific experience to promote]

**ATS KEYWORDS**
[5–8 comma-separated keywords from JD that the candidate has demonstrated]

**FINAL TIP**
[One actionable sentence for positioning]

---
Technical Metadata:
SCORE: [number]
VERDICT: [Apply|Consider|Skip]`
  );
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
      tokens_estimate: 2000,
    },
    {
      id: 'extended',
      name: 'Extended Context',
      description: 'Adapts analysis based on who reviews CV (ATS vs recruiter vs hiring manager)',
      tokens_estimate: 2200,
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
    // Extract SCORE
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    // Extract VERDICT (only for non-score-only outputs)
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

    // For 'score' or 'score+verdict' levels, verdict is optional
    if (outputLevel === 'score+verdict' && verdict === null) {
      return {
        error: 'Could not parse verdict from response',
        success: false,
        score,
      };
    }

    return {
      score: Math.max(0, Math.min(100, score)), // Clamp 0-100
      verdict: verdict || 'Consider', // Default to 'Consider' if not provided
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
