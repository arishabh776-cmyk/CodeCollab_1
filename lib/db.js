// lib/db.js — Vercel Postgres wrapper
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
}

import { sql } from '@vercel/postgres';

export const db = {
  async query(text, params = []) {
    const result = await sql.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }
};
