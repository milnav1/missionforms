-- Mission 1o2 UGC tracker — initial schema
-- Applied automatically by Netlify Database on deploy.

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT,
  product TEXT,
  comment TEXT NOT NULL,
  media_key TEXT,
  media_type TEXT,
  optin TEXT NOT NULL DEFAULT 'opted',
  tag_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ambassador_interest BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS releases (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  handle TEXT,
  context TEXT,
  signature_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions (email);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_releases_email ON releases (email);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases (status);
