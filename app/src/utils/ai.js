import { buildPrompt as buildPromptFromTemplate, parseAnalysisResponse } from './prompts.js';
import { extractStructuredFeatures } from './structuredMatching.js';

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

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
