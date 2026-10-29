PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK(channel IN ('whatsapp','sms','email')),
  template_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sent','failed','pending')),
  error TEXT,
  provider_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);