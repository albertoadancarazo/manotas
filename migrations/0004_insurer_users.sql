PRAGMA foreign_keys = ON;
ALTER TABLE users ADD COLUMN insurer_id TEXT REFERENCES insurers(id);
CREATE INDEX idx_users_insurer ON users(insurer_id);
