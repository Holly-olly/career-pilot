const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

/**
 * In development (npm run dev), calls Gemini directly from the browser.
 * In production (Vercel), routes through /api/analyze so the key stays hidden.
 */
export async function analyzeJob({ prompt }) {
  // ── Dev mode: direct browser → Gemini call ───────────────────────────────
  if (import.meta.env.DEV) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing VITE_GEMINI_API_KEY in .env.local.\n' +
        'Add this line to your .env.local file:\nVITE_GEMINI_API_KEY=your_key_here'
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

  // ── Production mode: serverless function (key never exposed) ─────────────
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
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

export function buildPrompt({ persona, talents, currentFocus, hardNos, cv, jd }) {
  return `SYSTEM PERSONA: You are a Senior Hiring Manager specializing in ${persona || 'talent acquisition and executive search'}.

INTERNAL SCORING RUBRIC (DO NOT PRINT THIS SECTION IN YOUR RESPONSE — use it silently to calculate the score):
1. Domain Expertise (35%): Depth of methodology and years in field.
2. Problem Similarity (30%): Has the candidate solved the specific problems this company has?
3. Technical Stack (20%): Match with required tools and technologies.
4. Strategic Alignment (10%): Does the role fit the candidate's "Current Focus"?
5. Dealbreakers: If any "Hard NOs" are present in the JD, penalize the final score by 50 points.

CANDIDATE HIDDEN CONTEXT (incorporate into your analysis — this is NOT in the CV below):
- Unlisted Talents/Experience: ${talents || 'None specified'}
- Current Career Focus: ${currentFocus || 'Not specified'}
- Hard NOs / Dealbreakers: ${hardNos || 'None'}

---
CANDIDATE CV:
${cv}

---
JOB DESCRIPTION:
${jd}

---
Produce the analysis in exactly this format (replace all bracketed placeholders with actual content):

# ROLE: [exact role title from JD] — [exact company name from JD]

**Worth to apply: SCORE of [0–100] of 100**
**DECISION: [Apply|Consider|Skip]**

**ROLE SNAPSHOT**
[One sentence describing the core problem this role solves.]

**WHY YOU FIT**
• [Strong alignment point with specific evidence from CV]
• [Strong alignment point with specific evidence from CV]
• [Strong alignment point if applicable]

**GAPS**
• [Critical gap or risk]
• [Critical gap or risk]

**CV TWEAKS FOR THIS ROLE**
• **Replace wording:** "[Old Term]" → "[New Term]"
• **Highlight:** [Specific experience or achievement to move to the top of the CV]

**ATS KEYWORDS**
[5–8 comma-separated keywords extracted from the JD]

**FINAL TIP**
[One direct, actionable sentence for how to position yourself for this specific role.]

---
**Technical Metadata (System Use):**
- SCORE: [same number as above]
- VERDICT: [Apply|Consider|Skip]`;
}
