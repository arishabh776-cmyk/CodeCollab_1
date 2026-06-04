// api/rooms/[id].js  →  GET /api/rooms/:id
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const { rows } = await db.query(
    `SELECT r.id, r.name, r.description, r.is_public, r.tags, r.max_members, r.owner_id, r.created_at,
            (r.password_hash IS NOT NULL) as password_protected,
            COUNT(rm.id) as member_count
     FROM rooms r LEFT JOIN room_members rm ON rm.room_id = r.id
     WHERE r.id = $1 GROUP BY r.id`, [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Room not found' });

  const { rows: members } = await db.query(
    `SELECT u.handle, u.display_name, u.avatar_url, rm.role
     FROM room_members rm JOIN users u ON u.id = rm.user_id WHERE rm.room_id = $1`, [id]
  );
  const { rows: snippets } = await db.query(
    `SELECT id, title, language, updated_at FROM code_snippets WHERE room_id = $1 ORDER BY updated_at DESC`, [id]
  );
  res.status(200).json({ room: rows[0], members, snippets });
}
