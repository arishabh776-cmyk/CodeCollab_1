// lib/hash.js — SHA-256 password hashing (Web Crypto API, no dependencies)
const SALT = 'codecollab_salt_2026';

async function sha256hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password) {
  return sha256hex(password + SALT);
}

export async function verifyPassword(password, hash) {
  return (await hashPassword(password)) === hash;
}
