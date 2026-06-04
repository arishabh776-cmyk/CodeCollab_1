// api/rooms/messages.js  →  GET /api/rooms/messages?id=:id
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, limit = 50 } = req.query;
  if (!id) return res.status(400).json({ error: 'Room ID required' });

  const { rows } = await db.query(
    `SELECT m.*, u.handle, u.display_name, u.avatar_url
     FROM messages m LEFT JOIN users u ON u.id = m.user_id
     WHERE m.room_id = $1 ORDER BY m.created_at DESC LIMIT $2`,
    [id, parseInt(limit)]
  );
  res.status(200).json({ messages: rows.reverse() });
}
