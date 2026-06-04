-- Run this once in your Vercel Postgres dashboard (Storage → Query)
-- or via: psql $POSTGRES_URL -f migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  github_url TEXT,
  twitter_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  password_hash TEXT,
  tags TEXT[],
  max_members INT DEFAULT 50,
  owner_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  reply_to INT REFERENCES messages(id) ON DELETE SET NULL,
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  owner_id INT REFERENCES users(id) ON DELETE CASCADE,
  room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS code_snippets (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  language TEXT DEFAULT 'javascript',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
  duration_minutes INT DEFAULT 0,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id SERIAL PRIMARY KEY,
  from_user_id INT REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO rooms (name, description, is_public, tags, max_members) VALUES
  ('JavaScript Fundamentals', 'Learn JS basics together', true, ARRAY['javascript','beginners'], 30),
  ('Python Data Science', 'Data science study group', true, ARRAY['python','data-science'], 25),
  ('LeetCode Grind', 'Daily algorithm challenges', true, ARRAY['algorithms','interviews'], 50),
  ('React & Next.js', 'Modern frontend development', true, ARRAY['react','nextjs','frontend'], 40),
  ('System Design', 'System design interview prep', true, ARRAY['system-design','architecture'], 35)
ON CONFLICT DO NOTHING;
