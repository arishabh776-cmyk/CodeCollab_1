// api/rooms/list.js  →  GET /api/rooms/list
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { rows } = await db.query(
    `SELECT r.id, r.name, r.description, r.is_public, r.tags, r.max_members, r.created_at,
            (r.password_hash IS NOT NULL) as password_protected,
            COUNT(rm.id) as member_count
     FROM rooms r
     LEFT JOIN room_members rm ON rm.room_id = r.id
     WHERE r.is_public = true
     GROUP BY r.id
     ORDER BY member_count DESC, r.created_at DESC
     LIMIT 20`
  );
  res.status(200).json({ rooms: rows });
}
