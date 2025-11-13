// api/openai.js  (Vercel Serverless) - put in /api folder
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { text } = req.body || {};
    if (!text || text.length < 20) return res.status(400).json({ error: 'Provide CV text in request body.' });

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured (OPENAI_API_KEY missing).' });

    // Prompt engineering: ask the model for a numeric score + concise bullet feedback and a 1-2 sentence summary
    const prompt = `
You are a helpful CV reviewer. Given the candidate's CV text below, return a JSON object with these fields:
- score: an integer 0-100 (estimate) using criteria: spelling/grammar (25%), conciseness (20%), layout/format (20%), experience impact (25%), punctuation (10%).
- summary: a suggested 1-2 sentence profile summary the candidate could use at the top of their CV.
- feedback: an array of 6 concise bullet suggestions (each 6-18 words) covering spelling/grammar, conciseness, layout, experience clarity, bullets with metrics, and final polish.
Only output valid JSON and nothing else.

CV_TEXT:
"""${text.replace(/```/g, '')}"""
`;

    // Call OpenAI Chat Completions
    const payload = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error('OpenAI error', r.status, errBody);
      return res.status(502).json({ error: 'OpenAI error', details: errBody });
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? '';

    // Try to parse JSON inside the model output.
    let parsed = null;
    try {
      // Model should respond with JSON; attempt to find JSON block
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonText);
    } catch (e) {
      // fallback: return raw model content
      console.warn('Failed to parse JSON from model response', e);
      return res.json({ raw: content });
    }

    // Ensure fields exist and coerce types
    const out = {
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null,
      summary: parsed.summary || null,
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      raw: content
    };

    return res.json(out);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
};
