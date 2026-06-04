// api/profile/update.js  →  POST /api/profile/update
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

  const { bio, skills, github_url, twitter_url, website_url, display_name } = req.body || {};
  const { rows } = await db.query(
    `UPDATE users SET
      bio = COALESCE($1, bio), skills = COALESCE($2, skills),
      github_url = COALESCE($3, github_url), twitter_url = COALESCE($4, twitter_url),
      website_url = COALESCE($5, website_url), display_name = COALESCE($6, display_name)
     WHERE id = $7 RETURNING *`,
    [bio, skills, github_url, twitter_url, website_url, display_name, member.id]
  );
  res.status(200).json({ user: rows[0] });
}
