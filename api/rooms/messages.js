// api/rooms/messages.js — Room messages (GET messages / POST send)
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { id, limit = 50 } = req.query;
    if (!id) return res.status(400).json({ error: 'Room ID required' });

    const { rows } = await db.query(
      `SELECT m.*, u.handle, u.display_name, u.avatar_url
       FROM messages m LEFT JOIN users u ON u.id = m.user_id
       WHERE m.room_id = $1 ORDER BY m.created_at DESC LIMIT $2`,
      [id, parseInt(limit)]
    );
    return res.status(200).json({ messages: rows.reverse() });
  }

  if (req.method === 'POST') {
    const token = req.headers['x-cc-token'];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const { rows: sRows } = await db.query(
      `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
    );
    if (!sRows.length) return res.status(401).json({ error: 'Invalid session' });
    const member = sRows[0];

    const { id, content, reply_to } = req.body || {};
    const roomId = id || req.query.id;
    if (!roomId || !content?.trim()) return res.status(400).json({ error: 'Room ID and content required' });

    const { rows } = await db.query(
      `INSERT INTO messages (room_id, user_id, content, reply_to) VALUES ($1, $2, $3, $4) RETURNING *`,
      [roomId, member.id, content.trim(), reply_to || null]
    );
    return res.status(200).json({ message: { ...rows[0], handle: member.handle, display_name: member.display_name, avatar_url: member.avatar_url } });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
