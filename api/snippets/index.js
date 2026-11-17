// api/snippets/index.js — Snippets (GET by ?id=, POST to save)
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Snippet ID required' });
    const { rows } = await db.query('SELECT * FROM code_snippets WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Snippet not found' });
    return res.status(200).json({ snippet: rows[0] });
  }

  if (req.method === 'POST') {
    const { id, content, title, language, room_id } = req.body || {};

    if (!id || id === 'new') {
      const { rows } = await db.query(
        `INSERT INTO code_snippets (room_id, title, content, language) VALUES ($1, $2, $3, $4) RETURNING *`,
        [room_id || null, title || 'Untitled', content || '', language || 'javascript']
      );
      return res.status(200).json({ snippet: rows[0] });
    }

    const updates = [];
    const vals = [];
    let i = 1;
    if (content !== undefined) { updates.push(`content = $${i++}`); vals.push(content); }
    if (title !== undefined)   { updates.push(`title = $${i++}`);   vals.push(title); }
    if (language !== undefined){ updates.push(`language = $${i++}`); vals.push(language); }
    updates.push('updated_at = NOW()');
    vals.push(id);

    if (updates.length === 1) {
      const { rows } = await db.query('SELECT * FROM code_snippets WHERE id = $1', [id]);
      return res.status(200).json({ snippet: rows[0] || null });
    }
    const { rows } = await db.query(
      `UPDATE code_snippets SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    return res.status(200).json({ snippet: rows[0] || null });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
