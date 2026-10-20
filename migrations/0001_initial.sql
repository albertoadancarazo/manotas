PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','TECHNICIAN','INSURER')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  consent_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insurers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  plate TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin_optional TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  reference TEXT NOT NULL UNIQUE,
  insurer_id TEXT REFERENCES insurers(id),
  claim_number TEXT,
  current_status TEXT NOT NULL DEFAULT 'RECEPCIONADO',
  assigned_technician TEXT REFERENCES users(id),
  entry_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estimated_delivery_date TEXT,
  delivered_at TEXT,
  public_token TEXT NOT NULL UNIQUE,
  insurer_token TEXT UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE work_order_events (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  technician_id TEXT REFERENCES users(id),
  note_internal TEXT,
  note_public TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  event_id TEXT REFERENCES work_order_events(id),
  technician_id TEXT REFERENCES users(id),
  category TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT,
  visibility TEXT NOT NULL DEFAULT 'INTERNAL_ONLY' CHECK(visibility IN ('INTERNAL_ONLY','CLIENT_VISIBLE','INSURER_VISIBLE','CLIENT_AND_INSURER')),
  file_hash TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  technician_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  internal_description TEXT,
  public_description TEXT,
  expected_delay INTEGER DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_status ON work_orders(current_status);
CREATE INDEX idx_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_events_order ON work_order_events(work_order_id, created_at);
CREATE INDEX idx_photos_order ON photos(work_order_id, uploaded_at);
CREATE INDEX idx_incidents_order ON incidents(work_order_id, resolved);
