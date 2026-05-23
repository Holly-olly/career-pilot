import { buildPrompt as buildPromptFromTemplate, parseAnalysisResponse } from './prompts.js';
import { extractStructuredFeatures } from './structuredMatching.js';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

/**
 * Analyze a job with structured matching + LLM analysis
 * @param {object} params - { jd, cv, settings, extendedContext, outputLevel }
 * @returns {object} { structured_score, llm_score, llm_verdict, llm_report, prompt_version, analysis_result }
 */
export async function analyzeJobWithStructuredMatching({
  jd,
  cv,
  settings = {},
  extendedContext = null,
  outputLevel = 'full', // 'score' | 'score+verdict' | 'full'
}) {
  // STEP 0: Pre-check — verify the input actually looks like a job description.
  // Bails out before any storage or scoring work happens. Throws an Error
  // with the InvalidJDError marker so callers can show an inline message
  // instead of saving a junk job record.
  const jdCheck = await validateIsJD(jd, settings.userApiKey || '');
  if (!jdCheck.isJD) {
    const err = new Error(
      `This doesn't look like a job description. Try pasting actual JD text.${jdCheck.reason ? `\n(Reason: ${jdCheck.reason})` : ''}`
    );
    err.code = 'INVALID_JD';
    throw err;
  }

  // STEP 1: Run structured matching (deterministic baseline)
  const structured = await extractStructuredFeatures(jd, cv, settings);

  // STEP 2: If hard NOs violated, skip LLM call (save tokens + cost)
  if (structured.skip_llm) {
    return {
      structured_score: 0,
      structured_breakdown: structured.breakdown,
      hard_no_violated: true,
      hard_no_reason: structured.skip_reason,
      llm_score: null,
      llm_verdict: null,
      llm_report: null,
      prompt_version: null,
      output_level: outputLevel,
      analysis_result: null,
    };
  }

  // STEP 3: Build prompt (no structured context injected — sensitivity test showed LLM ignores it)
  const promptBuild = buildPromptFromTemplate({
    persona: settings.persona || '',
    talents: settings.talents || '',
    currentFocus: settings.currentFocus || '',
    hardNos: Array.isArray(settings.hardNos) ? settings.hardNos.join(', ') : (settings.hardNos || ''),
    cv,
    jd,
    extendedContext: extendedContext || '',
    structuredContext: '',
    templateVersion: extendedContext && extendedContext.trim() ? 'extended' : 'baseline',
    outputLevel,
  });

  // STEP 4: Call LLM
  let llmRawText;
  try {
    llmRawText = await callGemini(promptBuild.prompt, settings.userApiKey || '');
  } catch (error) {
    throw new Error(`LLM call failed: ${error.message}`);
  }

  // STEP 5: Parse response
  const parseResult = parseAnalysisResponse(llmRawText, outputLevel);

  if (!parseResult.success) {
    throw new Error(`Failed to parse LLM response: ${parseResult.error}`);
  }

  // STEP 6: Detect dealbreaker triggers in the JD (purely advisory — does
  // NOT change score or verdict; surfaces as a badge in the UI).
  const dealbreakersTriggered = detectDealbreakers(jd, settings.hardNos);

  return {
    structured_score: Math.round(structured.structured_score * 100) / 100,
    structured_breakdown: structured.breakdown,
    hard_no_violated: false,
    hard_no_reason: null,
    llm_score: parseResult.score,
    llm_verdict: parseResult.verdict,
    llm_report: llmRawText, // Full report for display (may be short if score-only)
    prompt_version: promptBuild.metadata.version,
    output_level: outputLevel,
    dealbreakers_triggered: dealbreakersTriggered, // array of matched terms (empty if none)
    analysis_result: {
      prompt_metadata: promptBuild.metadata,
      parse_metadata: {
        has_extended_context: promptBuild.metadata.has_extended_context,
        extended_context_value: promptBuild.metadata.extended_context_value,
      },
    },
  };
}

/**
 * Dealbreaker detection — case-insensitive substring match of user's
 * declared dealbreakers against the JD text. Imperfect (can have false
 * positives and negatives — substring matching ignores negation and
 * synonyms), but good enough as an advisory flag. The result is purely
 * advisory; score and verdict are not modified.
 *
 * @param {string} jd        - full job description text
 * @param {string|array} hardNos - dealbreakers from settings (comma-separated string OR array)
 * @returns {string[]} list of dealbreaker terms found in the JD
 */
export function detectDealbreakers(jd, hardNos) {
  if (!jd || !hardNos) return [];
  // Accept either an array, a comma-separated string, OR a newline-separated
  // string — users type in a textarea and may use either delimiter.
  const raw = Array.isArray(hardNos) ? hardNos : String(hardNos).split(/[,\n;]/);
  const terms = raw.map((t) => t.trim()).filter((t) => t.length > 0);
  if (terms.length === 0) return [];
  const jdLower = jd.toLowerCase();
  return terms.filter((t) => jdLower.includes(t.toLowerCase()));
}

/**
 * Call Gemini API (dev mode browser direct, prod mode via serverless)
 * @param {string} prompt - The full prompt text
 * @returns {string} LLM response text
 */
async function callGemini(prompt, userApiKey = '') {
  // ── Dev mode: direct browser → Gemini call ───────────────────────────────
  if (import.meta.env.DEV) {
    const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'No API key found. Add your Gemini API key in Settings, or add VITE_GEMINI_API_KEY to .env.local.'
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Gemini error ${res.status}`);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) throw new Error('Gemini returned an empty response. Please try again.');
    return text;
  }

  // ── Production mode: serverless function ─────────────────────────────────
  // If user supplied their own key, use it directly (skip serverless).
  if (userApiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${userApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Gemini error ${res.status}`);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) throw new Error('Gemini returned an empty response. Please try again.');
    return text;
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, apiKey: userApiKey || undefined }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned an empty response (status ${response.status}).`);
  }

  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  if (!data.text) throw new Error('AI returned an empty response. Please try again.');
  return data.text;
}

/**
 * Pre-check: ask the LLM whether the pasted text is actually a job
 * description. Cheap minimal prompt (~50 tokens in, ~10 tokens out).
 *
 * On any failure (network, parse, missing API key) we default to
 * `{ isJD: true }` rather than blocking the user — better to let a junk
 * input through than to falsely reject a legitimate JD because of an
 * unrelated transient error.
 *
 * @param {string} jd
 * @param {string} userApiKey
 * @returns {Promise<{ isJD: boolean, reason: string|null }>}
 */
async function validateIsJD(jd, userApiKey = '') {
  const sample = (jd || '').trim().slice(0, 4000);
  if (sample.length < 30) {
    return { isJD: false, reason: 'Input is too short to be a job description.' };
  }

  const prompt = `Is the following text a real job description for an actual employment role (responsibilities, requirements, role context)? Reply with EXACTLY one line in this format:

VALID: yes
or
VALID: no — [one short reason]

Text:
"""
${sample}
"""`;

  let text;
  try {
    text = await callGemini(prompt, userApiKey);
  } catch {
    // Fail-open on errors — don't block the user on a transient issue.
    return { isJD: true, reason: null };
  }

  const m = text.match(/VALID:\s*(yes|no)(?:\s*[—\-]\s*(.+))?/i);
  if (!m) return { isJD: true, reason: null };       // unclear → fail-open
  const verdict = m[1].toLowerCase();
  if (verdict === 'yes') return { isJD: true, reason: null };
  return { isJD: false, reason: (m[2] || '').trim() || null };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use analyzeJobWithStructuredMatching instead
 */
export async function analyzeJob({ prompt }) {
  return callGemini(prompt);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use buildPrompt from prompts.js instead
 */
export function buildPrompt({ persona, talents, currentFocus, hardNos, cv, jd }) {
  const { prompt } = buildPromptFromTemplate({
    persona,
    talents,
    currentFocus,
    hardNos: Array.isArray(hardNos) ? hardNos.join(', ') : hardNos,
    cv,
    jd,
    extendedContext: '',
    structuredContext: '',
  });
  return prompt;
}
