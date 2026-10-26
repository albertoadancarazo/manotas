-- Only used when PHOTO_STORAGE=d1-test. Production photos remain in R2.
CREATE TABLE test_photo_objects (
  object_key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL
);
CREATE TABLE test_photo_chunks (
  object_key TEXT NOT NULL REFERENCES test_photo_objects(object_key),
  part INTEGER NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (object_key, part)
);
