// api/ai/chat.js  →  POST /api/ai/chat
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, code, language, action } = req.body || {};

  const systemPrompt = `You are CodeCollab AI, an expert coding assistant embedded in a collaborative coding platform.
Be concise, practical, and use markdown formatting for code blocks.
When showing code, always specify the language in the fenced block.`;

  let msgHistory = Array.isArray(messages) ? [...messages] : [];

  if (action && code) {
    const actionPrompts = {
      explain:  `Explain this ${language || 'code'} clearly:\n\`\`\`${language || ''}\n${code}\n\`\`\``,
      debug:    `Debug this ${language || 'code'} and identify issues:\n\`\`\`${language || ''}\n${code}\n\`\`\``,
      optimize: `Optimize this ${language || 'code'}:\n\`\`\`${language || ''}\n${code}\n\`\`\``,
      review:   `Code review this ${language || 'code'}:\n\`\`\`${language || ''}\n${code}\n\`\`\``
    };
    msgHistory = [{ role: 'user', content: actionPrompts[action] || actionPrompts.explain }];
  }

  if (!msgHistory.length) return res.status(400).json({ error: 'No messages provided' });

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return res.status(503).json({ reply: '⚠️ Google AI API key not configured. Add GOOGLE_AI_API_KEY to your Vercel environment variables.' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: msgHistory.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || 'Gemini API error';
      return res.status(502).json({ reply: `AI error: ${errMsg}` });
    }
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ reply: `Network error: ${err.message}` });
  }
}
