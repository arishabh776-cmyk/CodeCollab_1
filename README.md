# CodeCollab — Vercel Migration Guide

> Learn Together. Code Together. Build Together.

## Folder Structure

```
codecollab/
├── public/
│   ├── index.html           Landing page
│   └── app/
│       └── index.html       Full app (SPA — auth, dashboard, rooms, editor, AI, notes, timer)
├── api/
│   ├── account.js           Auth: signup / login / verify / logout
│   ├── search.js            Global search (rooms + users)
│   ├── rooms/
│   │   ├── list.js          GET  /api/rooms/list
│   │   ├── create.js        POST /api/rooms/create
│   │   ├── [id].js          GET  /api/rooms/:id
│   │   ├── join.js          POST /api/rooms/join        { id, password? }
│   │   ├── messages.js      GET  /api/rooms/messages?id=:id
│   │   └── send.js          POST /api/rooms/send        { id, content }
│   ├── snippets/
│   │   ├── save.js          POST /api/snippets/save
│   │   └── [id].js          GET  /api/snippets/:id
│   ├── notes/
│   │   ├── list.js          GET/POST /api/notes/list
│   │   └── [id].js          POST /api/notes/:id
│   ├── ai/
│   │   └── chat.js          POST /api/ai/chat
│   └── profile/
│       ├── me.js            GET  /api/profile/me
│       └── update.js        POST /api/profile/update
├── lib/
│   ├── db.js                Vercel Postgres wrapper (mirrors Hatchable db SDK)
│   └── hash.js              SHA-256 password hashing (Web Crypto, zero deps)
├── migrations/
│   └── 001_initial.sql      Full schema — run once in Vercel Postgres dashboard
├── vercel.json              Routing config
├── package.json             Dependencies
└── .env.example             Required environment variables
```

---

## Setup Steps

### 1. Clone / Create Project
```bash
git init codecollab && cd codecollab
# copy all files into this folder
npm install
```

### 2. Create Vercel Postgres Database
1. Go to [vercel.com](https://vercel.com) → your project → **Storage** tab
2. Click **Create Database** → choose **Postgres**
3. Click **Connect** → copy the `.env.local` snippet it gives you
4. Paste those values into a `.env.local` file (copy from `.env.example`)

### 3. Run the Database Migration
```bash
# Option A: Vercel dashboard — Storage → your DB → Query tab → paste 001_initial.sql
# Option B: CLI
psql $POSTGRES_URL -f migrations/001_initial.sql
```

### 4. Add Environment Variables
In Vercel dashboard → Project → Settings → Environment Variables, add:
- `POSTGRES_URL` (and the other POSTGRES_* vars from your DB connection)
- `GOOGLE_AI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com)

### 5. Deploy
```bash
npx vercel --prod
# or push to GitHub and connect repo to Vercel for auto-deploy
```

---

## Key Differences from Hatchable

| Hatchable | Vercel |
|-----------|--------|
| `import { db } from 'hatchable'` | `import { db } from '../lib/db.js'` |
| `import { ai } from 'hatchable'` | Direct Google Gemini API fetch |
| `export const access = 'member'` | Manual token check via `X-CC-Token` header |
| `export default async function(req, res)` | Same — standard Node.js handler |
| Dynamic routes: `api/rooms/[id].js` | Same — Vercel supports `[param]` filenames |
| `req.member` (injected by platform) | Read from `x-cc-token` header + DB lookup |

---

## API Auth Pattern
Every protected endpoint reads the session token from the `X-CC-Token` header:
```js
const token = req.headers['x-cc-token'];
const { rows } = await db.query(
  `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`,
  [token]
);
if (!rows.length) return res.status(401).json({ error: 'Invalid session' });
const member = rows[0];
```

The frontend sends it automatically via `authFetch()`:
```js
function authFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  if (authToken) opts.headers['X-CC-Token'] = authToken;
  return fetch(url, opts);
}
```

---

## Frontend API Paths (app/index.html)
All API calls in the frontend use relative paths — no changes needed on Vercel.
The only difference from Hatchable is that some routes were reorganised:

| Hatchable route | Vercel route |
|----------------|-------------|
| `/api/rooms/:id/join` | `/api/rooms/join` (body: `{id}`) |
| `/api/rooms/:id/messages` | `/api/rooms/messages?id=:id` |
| `/api/rooms/:id/send` | `/api/rooms/send` (body: `{id}`) |
| `/api/rooms/:id` | `/api/rooms/:id` (same) |
| `/api/notes/index` | `/api/notes/list` (same) |
| `/api/account` | `/api/account` (same) |

---

## Getting the Full App HTML
The app `public/app/index.html` is ~1900 lines. Get it from the live Hatchable site:
```bash
curl -L "https://codecollab.hatchable.site/app" -o public/app/index.html
```
Then update the single `const API = ...` line at the top of the script:
```js
// Change this line in public/app/index.html:
const API = window.__HATCHABLE__ ? window.__HATCHABLE__.api : '/api';
// to simply:
const API = '/api';
```
That's the only change needed in the HTML file.

Also update the `joinRoom` calls to use the new flat API paths:
- `/api/rooms/${id}/join` → `/api/rooms/join` with `body: { id }`
- `/api/rooms/${id}/messages` → `/api/rooms/messages?id=${id}`
- `/api/rooms/${id}/send` → `/api/rooms/send` with `body: { id, content }`
