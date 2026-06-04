// api/account.js — Auth: signup, login, verify, logout
import { db } from '../lib/db.js';
import { hashPassword, verifyPassword } from '../lib/hash.js';

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CC-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body || {};

  // ── SIGN UP ────────────────────────────────────────────────────
  if (action === 'signup') {
    const { email, password, username } = req.body;
    if (!email || !password || !username)
      return res.status(400).json({ error: 'Username, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const handle = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
    if (!handle) return res.status(400).json({ error: 'Invalid username' });

    const { rows: existing } = await db.query(
      'SELECT id FROM users WHERE handle = $1 OR email = $2', [handle, email.toLowerCase()]
    );
    if (existing.length) return res.status(409).json({ error: 'Username or email already taken' });

    const pwHash = await hashPassword(password);
    const token = generateToken();

    const { rows } = await db.query(
      'INSERT INTO users (handle, display_name, email) VALUES ($1, $2, $3) RETURNING *',
      [handle, username, email.toLowerCase()]
    );
    const user = rows[0];
    await db.query('INSERT INTO user_sessions (user_id, token, password_hash) VALUES ($1, $2, $3)',
      [user.id, token, pwHash]);

    return res.status(200).json({ token, user: { id: user.id, handle: user.handle, display_name: user.display_name, email: user.email, avatar_url: user.avatar_url } });
  }

  // ── LOGIN ──────────────────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { rows: users } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!users.length) return res.status(401).json({ error: 'No account found with that email' });

    const user = users[0];
    const { rows: sessions } = await db.query(
      'SELECT password_hash FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]
    );
    if (!sessions.length) return res.status(401).json({ error: 'Account has no password. Please sign up again.' });

    const ok = await verifyPassword(password, sessions[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });

    const token = generateToken();
    await db.query('INSERT INTO user_sessions (user_id, token, password_hash) VALUES ($1, $2, $3)',
      [user.id, token, sessions[0].password_hash]);

    return res.status(200).json({ token, user: { id: user.id, handle: user.handle, display_name: user.display_name, email: user.email, avatar_url: user.avatar_url } });
  }

  // ── VERIFY ─────────────────────────────────────────────────────
  if (action === 'verify' || action === 'me') {
    const token = req.body.token || req.headers['x-cc-token'];
    if (!token) return res.status(400).json({ error: 'Token required' });

    const { rows } = await db.query(
      `SELECT u.id, u.handle, u.display_name, u.email, u.avatar_url
       FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid or expired session' });
    await db.query('UPDATE user_sessions SET last_used = NOW() WHERE token = $1', [token]);
    return res.status(200).json({ user: rows[0] });
  }

  // ── LOGOUT ─────────────────────────────────────────────────────
  if (action === 'logout') {
    const token = req.body.token || req.headers['x-cc-token'];
    if (token) await db.query('DELETE FROM user_sessions WHERE token = $1', [token]).catch(() => {});
    return res.status(200).json({ success: true });
  }

  res.status(400).json({ error: 'Invalid action. Use: signup, login, verify, logout' });
}
