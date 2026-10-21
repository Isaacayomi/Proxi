ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN matric_number TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student';
CREATE UNIQUE INDEX IF NOT EXISTS users_matric_number_unique ON users(matric_number) WHERE matric_number IS NOT NULL;
CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS auth_challenges_email ON auth_challenges(email, created_at);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_rates (
  key TEXT PRIMARY KEY NOT NULL,
  started_at INTEGER NOT NULL,
  count INTEGER NOT NULL
);
