// lib/db.js — Vercel Postgres wrapper
// Mirrors the Hatchable `db` SDK so API files need minimal changes.
import { sql } from '@vercel/postgres';

export const db = {
  async query(text, params = []) {
    const result = await sql.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }
};
