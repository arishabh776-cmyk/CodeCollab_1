// api/search.js  →  GET /api/search?q=:query
import { db } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(200).json({ rooms: [], users: [] });

  const { rows: rooms } = await db.query(
    `SELECT id, name, description, tags FROM rooms
     WHERE is_public = true AND (name ILIKE $1 OR description ILIKE $1 OR $2 = ANY(tags)) LIMIT 10`,
    [`%${q}%`, q]
  );
  const { rows: users } = await db.query(
    `SELECT handle, display_name, avatar_url, bio FROM users
     WHERE handle ILIKE $1 OR display_name ILIKE $1 LIMIT 10`,
    [`%${q}%`]
  );
  res.status(200).json({ rooms, users });
}
