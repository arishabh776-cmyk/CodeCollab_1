// api/rooms/join.js  →  POST /api/rooms/join  (body: { id, password? })
import { db } from '../../lib/db.js';
import { verifyPassword } from '../../lib/hash.js';

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

  const { id, password } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Room ID required' });

  const { rows: roomRows } = await db.query('SELECT password_hash, owner_id FROM rooms WHERE id = $1', [id]);
  if (!roomRows.length) return res.status(404).json({ error: 'Room not found' });
  const room = roomRows[0];

  if (room.password_hash) {
    const isOwner = room.owner_id === member.id;
    if (!isOwner) {
      if (!password) return res.status(403).json({ error: 'This room requires a password' });
      const ok = await verifyPassword(password, room.password_hash);
      if (!ok) return res.status(403).json({ error: 'Incorrect password' });
    }
  }

  await db.query(
    `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
    [id, member.id]
  );
  res.status(200).json({ success: true });
}
