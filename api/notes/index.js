// api/notes/index.js — Notes management (GET list, POST create / update)
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-cc-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const { rows: sRows } = await db.query(
    `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
  );
  if (!sRows.length) return res.status(401).json({ error: 'Invalid session' });
  const member = sRows[0];

  const noteId = req.query.id;

  if (req.method === 'GET') {
    const { rows } = await db.query(
      'SELECT * FROM notes WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 100', [member.id]
    );
    return res.status(200).json({ notes: rows });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { title, content, room_id, is_shared } = req.body || {};

    if (noteId) {
      const { rows: check } = await db.query('SELECT owner_id FROM notes WHERE id = $1', [noteId]);
      if (!check.length) return res.status(404).json({ error: 'Note not found' });
      if (check[0].owner_id !== member.id) return res.status(403).json({ error: 'You do not own this note' });

      const { rows } = await db.query(
        `UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [title, content, noteId]
      );
      return res.status(200).json({ note: rows[0] });
    }

    const { rows } = await db.query(
      `INSERT INTO notes (title, content, owner_id, room_id, is_shared) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title || 'Untitled Note', content || '', member.id, room_id || null, is_shared || false]
    );
    return res.status(200).json({ note: rows[0] });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
