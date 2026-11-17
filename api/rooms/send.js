// api/rooms/send.js  →  POST /api/rooms/send  (body: { id, content, reply_to? })
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-cc-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const { rows: sRows } = await db.query(
    `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
  );
  if (!sRows.length) return res.status(401).json({ error: 'Invalid session' });
  const member = sRows[0];

  const { id, content, reply_to } = req.body || {};
  if (!id || !content?.trim()) return res.status(400).json({ error: 'Room ID and content required' });

  const { rows } = await db.query(
    `INSERT INTO messages (room_id, user_id, content, reply_to) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, member.id, content.trim(), reply_to || null]
  );
  res.status(200).json({ message: { ...rows[0], handle: member.handle, display_name: member.display_name, avatar_url: member.avatar_url } });
}
