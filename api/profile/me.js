// api/profile/me.js  →  GET /api/profile/me
import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-cc-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const { rows } = await db.query(
    `SELECT u.id, u.handle, u.display_name, u.email, u.avatar_url, u.bio, u.skills
     FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid session' });
  res.status(200).json({ user: rows[0] });
}
