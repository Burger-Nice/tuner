-- airglow accounts (design/ui-v1/accounts-v1/SPEC.md 6.2, with review 3's fixes: the refresh generation, purged_seq)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
  kdf_alg TEXT NOT NULL, kdf_iter INTEGER NOT NULL, kdf_salt TEXT NOT NULL,
  auth_salt TEXT NOT NULL, auth_hash TEXT NOT NULL,
  wrapped_key TEXT NOT NULL, dk_check TEXT NOT NULL,
  recovery_wrapped_key TEXT, recovery_auth_hash TEXT, recovery_key_wrapped_by_pw TEXT, recovery_set_at INTEGER,
  key_version INTEGER NOT NULL DEFAULT 1, seq INTEGER NOT NULL DEFAULT 0, purged_seq INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0, prev_bytes INTEGER NOT NULL DEFAULT 0, is_owner INTEGER NOT NULL DEFAULT 0 );
CREATE TABLE devices (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL, platform TEXT, how TEXT NOT NULL,          -- how: password | phone | recovery
  created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
  approved_by TEXT,
  refresh_hash TEXT, refresh_prev_hash TEXT, refresh_gen INTEGER NOT NULL DEFAULT 1,
  refresh_rotated_at INTEGER, refresh_used_at INTEGER,
  revoked_at INTEGER, revoked_why TEXT );
CREATE INDEX devices_account ON devices(account_id);
CREATE TABLE device_codes (
  device_code_hash TEXT PRIMARY KEY, user_code TEXT NOT NULL UNIQUE, tv_name TEXT NOT NULL, tv_kind TEXT NOT NULL,
  tv_pub TEXT NOT NULL, tv_net TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  account_id TEXT, box TEXT, approved_by_device TEXT, last_poll INTEGER, poll_gap INTEGER NOT NULL DEFAULT 5 );
CREATE TABLE records (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, col TEXT NOT NULL, id TEXT NOT NULL,
  ver INTEGER NOT NULL, iv TEXT NOT NULL, blob TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL, updated_at INTEGER NOT NULL, by_device TEXT,
  PRIMARY KEY (account_id, col, id) );
CREATE INDEX records_seq ON records(account_id, seq);
CREATE TABLE records_prev (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, col TEXT NOT NULL, id TEXT NOT NULL,
  ver INTEGER NOT NULL, iv TEXT, blob TEXT, deleted INTEGER NOT NULL, replaced_at INTEGER NOT NULL, by_device TEXT,
  PRIMARY KEY (account_id, col, id, ver) );
CREATE INDEX records_prev_at ON records_prev(account_id, replaced_at);
CREATE TABLE invites (
  code_hash TEXT PRIMARY KEY, made_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, used_by TEXT );
CREATE INDEX invites_by ON invites(made_by, created_at);
CREATE TABLE meta ( key TEXT PRIMARY KEY, value TEXT NOT NULL );
CREATE TABLE counters ( key TEXT PRIMARY KEY, n INTEGER NOT NULL, window_start INTEGER NOT NULL );
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT, at INTEGER NOT NULL, event TEXT NOT NULL,
  device_id TEXT, ip_hash TEXT, detail TEXT );
CREATE INDEX audit_account ON audit(account_id, at);
