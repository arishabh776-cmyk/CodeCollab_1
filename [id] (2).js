// api/snippets/[id].js  →  GET /api/snippets/:id
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const { rows } = await db.query('SELECT * FROM code_snippets WHERE id = $1', [id]);
  if (!rows.length) return res.status(404).json({ error: 'Snippet not found' });
  res.status(200).json({ snippet: rows[0] });
}
