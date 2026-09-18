-- Dedicated private schema: deliberately NOT exposed through the Supabase Data API.
-- ISO 8601 timestamps are kept as text for lossless migration from Sites D1.
CREATE SCHEMA IF NOT EXISTS gem_hub;
REVOKE ALL ON SCHEMA gem_hub FROM PUBLIC;
CREATE TABLE IF NOT EXISTS gem_hub.users (
 id text PRIMARY KEY, username text NOT NULL UNIQUE, password_hash text NOT NULL,
 full_name text NOT NULL, role text NOT NULL CHECK(role IN ('admin','student')),
 active integer NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at text NOT NULL,
 first_login text, last_login text, login_count integer NOT NULL DEFAULT 0 CHECK(login_count>=0)
);
CREATE TABLE IF NOT EXISTS gem_hub.gem_links (
 id integer PRIMARY KEY, sequence integer NOT NULL CHECK(sequence>0), title text NOT NULL,
 description text NOT NULL, url text NOT NULL CHECK(url LIKE 'https://gemini.google.com/%'),
 active integer NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS gem_hub.student_progress (
 user_id text NOT NULL REFERENCES gem_hub.users(id), gem_id integer NOT NULL REFERENCES gem_hub.gem_links(id),
 status text NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
 first_opened_at text, last_opened_at text, open_count integer NOT NULL DEFAULT 0 CHECK(open_count>=0),
 completed_at text, PRIMARY KEY(user_id,gem_id)
);
CREATE TABLE IF NOT EXISTS gem_hub.sessions (
 token text PRIMARY KEY, user_id text NOT NULL REFERENCES gem_hub.users(id), expires_at text NOT NULL, heartbeat text NOT NULL
);
CREATE TABLE IF NOT EXISTS gem_hub.login_logs (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES gem_hub.users(id), login_at text NOT NULL, ip_address text, user_agent text
);
CREATE TABLE IF NOT EXISTS gem_hub.activity_logs (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES gem_hub.users(id), activity_type text NOT NULL,
 gem_id integer REFERENCES gem_hub.gem_links(id), created_at text NOT NULL, metadata text
);
CREATE TABLE IF NOT EXISTS gem_hub.settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS gem_hub.login_attempts (key text PRIMARY KEY, count integer NOT NULL, expires_at text NOT NULL);
CREATE TABLE IF NOT EXISTS gem_hub.import_runs (fingerprint text PRIMARY KEY, source_project_id text NOT NULL, captured_at text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user ON gem_hub.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON gem_hub.sessions(expires_at);
CREATE INDEX IF NOT EXISTS activity_user_time ON gem_hub.activity_logs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS activity_time ON gem_hub.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS login_time ON gem_hub.login_logs(login_at);
CREATE INDEX IF NOT EXISTS attempts_expiry ON gem_hub.login_attempts(expires_at);
-- App-owned authentication is enforced by Next.js server routes.
-- The server connects as the schema owner; no browser receives a database credential.
-- Default-deny RLS plus revoked grants prevent anon/authenticated Data API access.
ALTER TABLE gem_hub.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.gem_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_hub.import_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA gem_hub FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON SCHEMA gem_hub FROM anon;
  REVOKE ALL ON ALL TABLES IN SCHEMA gem_hub FROM anon;
 END IF;
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON SCHEMA gem_hub FROM authenticated;
  REVOKE ALL ON ALL TABLES IN SCHEMA gem_hub FROM authenticated;
 END IF;
END $$;
