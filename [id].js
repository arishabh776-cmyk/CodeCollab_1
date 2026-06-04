// api/notes/[id].js  →  POST /api/notes/:id  (update)
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-cc-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const { rows: sRows } = await db.query(
    `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
  );
  if (!sRows.length) return res.status(401).json({ error: 'Invalid session' });
  const member = sRows[0];

  const { id } = req.query;
  const { title, content } = req.body || {};

  // Privacy: only allow updating your own notes
  const { rows: check } = await db.query('SELECT owner_id FROM notes WHERE id = $1', [id]);
  if (!check.length) return res.status(404).json({ error: 'Note not found' });
  if (check[0].owner_id !== member.id) return res.status(403).json({ error: 'You do not own this note' });

  const { rows } = await db.query(
    `UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [title, content, id]
  );
  res.status(200).json({ note: rows[0] });
}
