// api/rooms/create.js  →  POST /api/rooms/create
import { db } from '../../lib/db.js';
import { hashPassword } from '../../lib/hash.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify session token
  const token = req.headers['x-cc-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const { rows: sessionRows } = await db.query(
    `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
  );
  if (!sessionRows.length) return res.status(401).json({ error: 'Invalid session' });
  const member = sessionRows[0];

  const { name, description, is_public, tags, max_members, password } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Room name required' });

  const passwordHash = password ? await hashPassword(password) : null;

  const { rows } = await db.query(
    `INSERT INTO rooms (name, description, is_public, tags, max_members, owner_id, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [name, description || '', is_public !== false, tags || [], max_members || 50, member.id, passwordHash]
  );
  const room = rows[0];
  await db.query(
    `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
    [room.id, member.id]
  );
  delete room.password_hash;
  res.status(200).json({ room });
}
