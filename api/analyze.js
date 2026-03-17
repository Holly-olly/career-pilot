const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  // Parse body safely
  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch {
      return res.status(400).json({ message: 'Invalid JSON in request body.' });
    }
  }

  const { prompt } = body;

  if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'Server is not configured (missing GEMINI_API_KEY). Contact the app owner.' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || `Gemini API error (${response.status})`;
      return res.status(502).json({ message: msg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) {
      return res.status(502).json({ message: 'Gemini returned an empty response. Please try again.' });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error('[analyze] Error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
