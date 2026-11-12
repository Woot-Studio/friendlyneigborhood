-- Friendly Neighborhood — Cloudflare D1 (SQLite) Schema

CREATE TABLE IF NOT EXISTS wilayah (
	id TEXT PRIMARY KEY,
	parent_id TEXT,
	level TEXT NOT NULL CHECK (level IN ('provinsi', 'kabupaten', 'kecamatan', 'kelurahan')),
	name TEXT NOT NULL,
	alt_name TEXT NOT NULL,
	lat REAL,
	lng REAL
);
CREATE INDEX IF NOT EXISTS idx_wilayah_parent ON wilayah (level, parent_id);

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	full_name TEXT NOT NULL,
	phone TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('warga', 'rt', 'relawan')),
	setup_step TEXT NOT NULL DEFAULT 'wilayah' CHECK (setup_step IN ('wilayah', 'kerentanan', 'izin', 'done')),
	kelurahan_id TEXT,
	rt TEXT NOT NULL DEFAULT '',
	rw TEXT NOT NULL DEFAULT '',
	address TEXT NOT NULL DEFAULT '',
	lat REAL,
	lng REAL,
	notify_enabled INTEGER NOT NULL DEFAULT 0,
	location_on_confirm INTEGER NOT NULL DEFAULT 1,
	push_subscription_json TEXT,
	vulnerability_json TEXT,
	last_status TEXT,
	last_status_at TEXT,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_kelurahan ON users (kelurahan_id, role);

CREATE TABLE IF NOT EXISTS events (
	id TEXT PRIMARY KEY,
	kelurahan_id TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('cuaca', 'gempa', 'simulasi')),
	scenario TEXT NOT NULL,
	title TEXT NOT NULL,
	headline TEXT NOT NULL,
	area_label TEXT NOT NULL,
	coverage_note TEXT NOT NULL,
	source_label TEXT NOT NULL,
	is_simulation INTEGER NOT NULL DEFAULT 0,
	relevant INTEGER NOT NULL DEFAULT 1,
	started_at TEXT NOT NULL,
	ended_at TEXT,
	external_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_kelurahan ON events (kelurahan_id, started_at DESC);

CREATE TABLE IF NOT EXISTS checkins (
	id TEXT PRIMARY KEY,
	event_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('belum', 'aman', 'butuh', 'dicek', 'dibantu')),
	prior_status TEXT,
	help_type TEXT,
	note TEXT NOT NULL DEFAULT '',
	lat REAL,
	lng REAL,
	location_label TEXT NOT NULL DEFAULT '',
	claimed_by TEXT,
	claimed_at TEXT,
	updated_at TEXT NOT NULL,
	UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_checkins_event ON checkins (event_id);

CREATE TABLE IF NOT EXISTS facilities (
	id TEXT PRIMARY KEY,
	kelurahan_id TEXT NOT NULL,
	external_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	name TEXT NOT NULL,
	lat REAL NOT NULL,
	lng REAL NOT NULL,
	distance_m INTEGER NOT NULL,
	shelter_confirmed INTEGER NOT NULL DEFAULT 0,
	confirmed_by TEXT,
	confirmed_at TEXT,
	source TEXT NOT NULL DEFAULT 'fixture',
	UNIQUE (kelurahan_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_facilities_kelurahan ON facilities (kelurahan_id);

CREATE TABLE IF NOT EXISTS announcements (
	id TEXT PRIMARY KEY,
	kelurahan_id TEXT NOT NULL,
	author_id TEXT NOT NULL,
	body TEXT NOT NULL,
	audience TEXT NOT NULL CHECK (audience IN ('semua', 'rentan')),
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_announcements_kelurahan ON announcements (kelurahan_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forecasts (
	kelurahan_id TEXT PRIMARY KEY,
	fetched_at TEXT NOT NULL,
	days_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seen_keys (
	key TEXT PRIMARY KEY,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS live_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	payload_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);
