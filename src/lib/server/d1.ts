import { randomUUID } from 'node:crypto';
import { buildRows, isVulnerable, normalizePhone, SLA_MINUTES, sortRows } from '#lib/domain';
import type {
	AlertEvent,
	Announcement,
	Audience,
	Checkin,
	CheckStatus,
	Facility,
	FacilityKind,
	ForecastDay,
	HelpType,
	LiveMessage,
	PublicUser,
	ResidentRow,
	Result,
	Role,
	Scenario,
	SetupStep,
	User,
	Vulnerability,
	Wilayah,
	WilayahLevel
} from '#lib/types';
import type { D1DatabaseLike, D1PreparedStatementLike } from './env';
import { hashPassword, verifyPassword } from './passwords';
import { seedState } from './seed';

const DDL_STATEMENTS = [
	`CREATE TABLE IF NOT EXISTS wilayah (
		id TEXT PRIMARY KEY,
		parent_id TEXT,
		level TEXT NOT NULL CHECK (level IN ('provinsi', 'kabupaten', 'kecamatan', 'kelurahan')),
		name TEXT NOT NULL,
		alt_name TEXT NOT NULL,
		lat REAL,
		lng REAL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_wilayah_parent ON wilayah (level, parent_id)`,
	`CREATE TABLE IF NOT EXISTS users (
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
	)`,
	`CREATE INDEX IF NOT EXISTS idx_users_kelurahan ON users (kelurahan_id, role)`,
	`CREATE TABLE IF NOT EXISTS events (
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
	)`,
	`CREATE INDEX IF NOT EXISTS idx_events_kelurahan ON events (kelurahan_id, started_at DESC)`,
	`CREATE TABLE IF NOT EXISTS checkins (
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
	)`,
	`CREATE INDEX IF NOT EXISTS idx_checkins_event ON checkins (event_id)`,
	`CREATE TABLE IF NOT EXISTS facilities (
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
	)`,
	`CREATE INDEX IF NOT EXISTS idx_facilities_kelurahan ON facilities (kelurahan_id)`,
	`CREATE TABLE IF NOT EXISTS announcements (
		id TEXT PRIMARY KEY,
		kelurahan_id TEXT NOT NULL,
		author_id TEXT NOT NULL,
		body TEXT NOT NULL,
		audience TEXT NOT NULL CHECK (audience IN ('semua', 'rentan')),
		created_at TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_announcements_kelurahan ON announcements (kelurahan_id, created_at DESC)`,
	`CREATE TABLE IF NOT EXISTS forecasts (
		kelurahan_id TEXT PRIMARY KEY,
		fetched_at TEXT NOT NULL,
		days_json TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS seen_keys (
		key TEXT PRIMARY KEY,
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS live_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		payload_json TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`
];

const readyMap = new WeakMap<D1DatabaseLike, Promise<void>>();

async function runBatched(d1: D1DatabaseLike, statements: D1PreparedStatementLike[], chunkSize = 40) {
	for (let i = 0; i < statements.length; i += chunkSize) {
		await d1.batch(statements.slice(i, i + chunkSize));
	}
}

export async function seedD1(d1: D1DatabaseLike, wipeFirst = false) {
	const initial = seedState();
	if (wipeFirst) {
		await d1.batch([
			d1.prepare('DELETE FROM checkins'),
			d1.prepare('DELETE FROM events'),
			d1.prepare('DELETE FROM announcements'),
			d1.prepare('DELETE FROM facilities'),
			d1.prepare('DELETE FROM forecasts'),
			d1.prepare('DELETE FROM seen_keys'),
			d1.prepare('DELETE FROM users')
		]);
	}

	const wilayahStmts = initial.wilayah.map((w) =>
		d1
			.prepare(
				`INSERT OR REPLACE INTO wilayah (id, parent_id, level, name, alt_name, lat, lng)
				 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
			)
			.bind(w.id, w.parentId, w.level, w.name, w.altName, w.lat, w.lng)
	);
	await runBatched(d1, wilayahStmts);

	const userStmts = initial.users.map((u) =>
		d1
			.prepare(
				`INSERT OR REPLACE INTO users (
					id, full_name, phone, password_hash, role, setup_step, kelurahan_id,
					rt, rw, address, lat, lng, notify_enabled, location_on_confirm,
					push_subscription_json, vulnerability_json, last_status, last_status_at, created_at
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`
			)
			.bind(
				u.id,
				u.fullName,
				u.phone,
				u.passwordHash,
				u.role,
				u.setupStep,
				u.kelurahanId,
				u.rt,
				u.rw,
				u.address,
				u.lat,
				u.lng,
				u.notifyEnabled ? 1 : 0,
				u.locationOnConfirm ? 1 : 0,
				u.pushSubscription ? JSON.stringify(u.pushSubscription) : null,
				u.vulnerability ? JSON.stringify(u.vulnerability) : null,
				u.lastStatus,
				u.lastStatusAt,
				u.createdAt
			)
	);
	await runBatched(d1, userStmts);

	const facilityStmts = initial.facilities.map((f) =>
		d1
			.prepare(
				`INSERT OR REPLACE INTO facilities (
					id, kelurahan_id, external_id, kind, name, lat, lng,
					distance_m, shelter_confirmed, confirmed_by, confirmed_at, source
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
			)
			.bind(
				f.id,
				f.kelurahanId,
				f.externalId,
				f.kind,
				f.name,
				f.lat,
				f.lng,
				f.distanceM,
				f.shelterConfirmed ? 1 : 0,
				f.confirmedBy,
				f.confirmedAt,
				f.source
			)
	);
	await runBatched(d1, facilityStmts);

	const eventStmts = initial.events.map((e) =>
		d1
			.prepare(
				`INSERT OR REPLACE INTO events (
					id, kelurahan_id, kind, scenario, title, headline, area_label,
					coverage_note, source_label, is_simulation, relevant, started_at, ended_at, external_id
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
			)
			.bind(
				e.id,
				e.kelurahanId,
				e.kind,
				e.scenario,
				e.title,
				e.headline,
				e.areaLabel,
				e.coverageNote,
				e.sourceLabel,
				e.isSimulation ? 1 : 0,
				e.relevant ? 1 : 0,
				e.startedAt,
				e.endedAt,
				e.externalId
			)
	);
	await runBatched(d1, eventStmts);

	const checkinStmts = initial.checkins.map((c) =>
		d1
			.prepare(
				`INSERT OR REPLACE INTO checkins (
					id, event_id, user_id, status, prior_status, help_type, note,
					lat, lng, location_label, claimed_by, claimed_at, updated_at
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
			)
			.bind(
				c.id,
				c.eventId,
				c.userId,
				c.status,
				c.priorStatus,
				c.helpType,
				c.note,
				c.lat,
				c.lng,
				c.locationLabel,
				c.claimedBy,
				c.claimedAt,
				c.updatedAt
			)
	);
	await runBatched(d1, checkinStmts);

	const forecastStmts = Object.entries(initial.forecasts).map(([kelId, entry]) =>
		d1
			.prepare(
				`INSERT OR REPLACE INTO forecasts (kelurahan_id, fetched_at, days_json)
				 VALUES (?1, ?2, ?3)`
			)
			.bind(kelId, entry.at, JSON.stringify(entry.days))
	);
	if (forecastStmts.length) await runBatched(d1, forecastStmts);
}

export async function ensureD1Ready(d1: D1DatabaseLike): Promise<D1DatabaseLike> {
	let pending = readyMap.get(d1);
	if (!pending) {
		pending = (async () => {
			await d1.batch(DDL_STATEMENTS.map((sql) => d1.prepare(sql)));
			const countRow = await d1.prepare('SELECT COUNT(*) AS cnt FROM users').first<{ cnt: number }>();
			const wilayahRow = await d1.prepare('SELECT COUNT(*) AS cnt FROM wilayah').first<{ cnt: number }>();
			if (!wilayahRow?.cnt || !countRow?.cnt) {
				await seedD1(d1, false);
			}
		})().catch((err) => {
			readyMap.delete(d1);
			throw err;
		});
		readyMap.set(d1, pending);
	}
	await pending;
	return d1;
}

function fail(error: string): Result<never> {
	return { ok: false, error };
}

function toPublicUser(user: User): PublicUser {
	const { passwordHash: _pw, pushSubscription: _push, ...rest } = user;
	return rest;
}

interface UserRow {
	id: string;
	full_name: string;
	phone: string;
	password_hash: string;
	role: Role;
	setup_step: SetupStep;
	kelurahan_id: string | null;
	rt: string;
	rw: string;
	address: string;
	lat: number | null;
	lng: number | null;
	notify_enabled: number;
	location_on_confirm: number;
	push_subscription_json: string | null;
	vulnerability_json: string | null;
	last_status: CheckStatus | null;
	last_status_at: string | null;
	created_at: string;
}

function mapUser(row: UserRow): User {
	return {
		id: row.id,
		fullName: row.full_name,
		phone: row.phone,
		passwordHash: row.password_hash,
		role: row.role,
		setupStep: row.setup_step,
		kelurahanId: row.kelurahan_id,
		rt: row.rt,
		rw: row.rw,
		address: row.address,
		lat: row.lat,
		lng: row.lng,
		notifyEnabled: Boolean(row.notify_enabled),
		locationOnConfirm: Boolean(row.location_on_confirm),
		pushSubscription: row.push_subscription_json ? JSON.parse(row.push_subscription_json) : null,
		vulnerability: row.vulnerability_json ? (JSON.parse(row.vulnerability_json) as Vulnerability) : null,
		lastStatus: row.last_status,
		lastStatusAt: row.last_status_at,
		createdAt: row.created_at
	};
}

interface WilayahRow {
	id: string;
	parent_id: string | null;
	level: WilayahLevel;
	name: string;
	alt_name: string;
	lat: number | null;
	lng: number | null;
}

function mapWilayah(row: WilayahRow): Wilayah {
	return {
		id: row.id,
		parentId: row.parent_id,
		level: row.level,
		name: row.name,
		altName: row.alt_name,
		lat: row.lat,
		lng: row.lng
	};
}

interface EventRow {
	id: string;
	kelurahan_id: string;
	kind: 'cuaca' | 'gempa' | 'simulasi';
	scenario: Scenario;
	title: string;
	headline: string;
	area_label: string;
	coverage_note: string;
	source_label: string;
	is_simulation: number;
	relevant: number;
	started_at: string;
	ended_at: string | null;
	external_id: string | null;
}

function mapEvent(row: EventRow): AlertEvent {
	return {
		id: row.id,
		kelurahanId: row.kelurahan_id,
		kind: row.kind,
		scenario: row.scenario,
		title: row.title,
		headline: row.headline,
		areaLabel: row.area_label,
		coverageNote: row.coverage_note,
		sourceLabel: row.source_label,
		isSimulation: Boolean(row.is_simulation),
		relevant: Boolean(row.relevant),
		startedAt: row.started_at,
		endedAt: row.ended_at,
		externalId: row.external_id
	};
}

interface CheckinRow {
	id: string;
	event_id: string;
	user_id: string;
	status: CheckStatus;
	prior_status: CheckStatus | null;
	help_type: HelpType | null;
	note: string;
	lat: number | null;
	lng: number | null;
	location_label: string;
	claimed_by: string | null;
	claimed_at: string | null;
	updated_at: string;
}

function mapCheckin(row: CheckinRow): Checkin {
	return {
		id: row.id,
		eventId: row.event_id,
		userId: row.user_id,
		status: row.status,
		priorStatus: row.prior_status,
		helpType: row.help_type,
		note: row.note,
		lat: row.lat,
		lng: row.lng,
		locationLabel: row.location_label,
		claimedBy: row.claimed_by,
		claimedAt: row.claimed_at,
		updatedAt: row.updated_at
	};
}

interface FacilityRow {
	id: string;
	kelurahan_id: string;
	external_id: string;
	kind: FacilityKind;
	name: string;
	lat: number;
	lng: number;
	distance_m: number;
	shelter_confirmed: number;
	confirmed_by: string | null;
	confirmed_at: string | null;
	source: 'fixture' | 'api';
}

function mapFacility(row: FacilityRow): Facility {
	return {
		id: row.id,
		kelurahanId: row.kelurahan_id,
		externalId: row.external_id,
		kind: row.kind,
		name: row.name,
		lat: row.lat,
		lng: row.lng,
		distanceM: row.distance_m,
		shelterConfirmed: Boolean(row.shelter_confirmed),
		confirmedBy: row.confirmed_by,
		confirmedAt: row.confirmed_at,
		source: row.source
	};
}

interface AnnouncementRow {
	id: string;
	kelurahan_id: string;
	author_id: string;
	body: string;
	audience: Audience;
	created_at: string;
}

function mapAnnouncement(row: AnnouncementRow): Announcement {
	return {
		id: row.id,
		kelurahanId: row.kelurahan_id,
		authorId: row.author_id,
		body: row.body,
		audience: row.audience,
		createdAt: row.created_at
	};
}

export async function d1FullUser(d1: D1DatabaseLike, id: string): Promise<User | null> {
	await ensureD1Ready(d1);
	const row = await d1.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<UserRow>();
	return row ? mapUser(row) : null;
}

export async function d1GetUser(d1: D1DatabaseLike, id: string | null): Promise<PublicUser | null> {
	if (!id) return null;
	const user = await d1FullUser(d1, id);
	return user ? toPublicUser(user) : null;
}

export async function d1Login(d1: D1DatabaseLike, phone: string, password: string): Promise<Result<User>> {
	await ensureD1Ready(d1);
	const normalized = normalizePhone(phone);
	const row = await d1.prepare('SELECT * FROM users WHERE phone = ?1').bind(normalized).first<UserRow>();
	if (!row) return fail('Nomor HP atau kata sandi tidak sesuai.');
	const user = mapUser(row);
	if (!verifyPassword(password, user.passwordHash)) {
		return fail('Nomor HP atau kata sandi tidak sesuai.');
	}
	return { ok: true, data: user };
}

export async function d1Register(
	d1: D1DatabaseLike,
	input: { fullName: string; phone: string; password: string; role: Role }
): Promise<Result<User>> {
	await ensureD1Ready(d1);
	const fullName = input.fullName.trim();
	const phone = normalizePhone(input.phone);
	if (fullName.length < 3) return fail('Nama lengkap minimal 3 huruf.');
	if (phone.length < 10 || phone.length > 15) return fail('Nomor HP tidak valid.');
	if (input.password.length < 8) return fail('Kata sandi minimal 8 karakter.');
	if (!['warga', 'rt', 'relawan'].includes(input.role)) return fail('Pilih peran Anda.');

	const exists = await d1.prepare('SELECT id FROM users WHERE phone = ?1').bind(phone).first();
	if (exists) return fail('Nomor HP ini sudah terdaftar.');

	const user: User = {
		id: randomUUID(),
		fullName,
		phone,
		passwordHash: hashPassword(input.password),
		role: input.role,
		setupStep: 'wilayah',
		kelurahanId: null,
		rt: '',
		rw: '',
		address: '',
		lat: null,
		lng: null,
		notifyEnabled: false,
		locationOnConfirm: true,
		pushSubscription: null,
		vulnerability: null,
		lastStatus: null,
		lastStatusAt: null,
		createdAt: new Date().toISOString()
	};

	try {
		await d1
			.prepare(
				`INSERT INTO users (
					id, full_name, phone, password_hash, role, setup_step, kelurahan_id,
					rt, rw, address, lat, lng, notify_enabled, location_on_confirm,
					push_subscription_json, vulnerability_json, last_status, last_status_at, created_at
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`
			)
			.bind(
				user.id,
				user.fullName,
				user.phone,
				user.passwordHash,
				user.role,
				user.setupStep,
				user.kelurahanId,
				user.rt,
				user.rw,
				user.address,
				user.lat,
				user.lng,
				0,
				1,
				null,
				null,
				null,
				null,
				user.createdAt
			)
			.run();
	} catch {
		return fail('Nomor HP ini sudah terdaftar.');
	}
	return { ok: true, data: user };
}

export async function d1GetWilayah(d1: D1DatabaseLike, id: string | null | undefined): Promise<Wilayah | null> {
	if (!id) return null;
	await ensureD1Ready(d1);
	const row = await d1.prepare('SELECT * FROM wilayah WHERE id = ?1').bind(id).first<WilayahRow>();
	return row ? mapWilayah(row) : null;
}

export async function d1PlacePath(d1: D1DatabaseLike, kelurahanId: string | null): Promise<Wilayah[]> {
	if (!kelurahanId) return [];
	await ensureD1Ready(d1);
	const path: Wilayah[] = [];
	let current = await d1GetWilayah(d1, kelurahanId);
	let guard = 0;
	while (current && guard < 6) {
		path.unshift(current);
		current = current.parentId ? await d1GetWilayah(d1, current.parentId) : null;
		guard += 1;
	}
	return path;
}

export async function d1PlaceLabel(d1: D1DatabaseLike, kelurahanId: string | null): Promise<string> {
	const kel = await d1GetWilayah(d1, kelurahanId);
	return kel ? `Kel. ${kel.altName}` : 'kelurahan Anda';
}

export async function d1ChildrenOf(
	d1: D1DatabaseLike,
	parentId: string | null,
	level: WilayahLevel,
	q = ''
): Promise<Wilayah[]> {
	await ensureD1Ready(d1);
	const trimmed = q.trim().toLowerCase();
	const rows =
		parentId === null
			? await d1.prepare('SELECT * FROM wilayah WHERE level = ?1 AND parent_id IS NULL').bind(level).all<WilayahRow>()
			: await d1
					.prepare('SELECT * FROM wilayah WHERE level = ?1 AND parent_id = ?2')
					.bind(level, parentId)
					.all<WilayahRow>();
	return rows.results
		.map(mapWilayah)
		.filter((item) => !trimmed || item.name.toLowerCase().includes(trimmed) || item.altName.toLowerCase().includes(trimmed))
		.sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export async function d1SetKelurahan(d1: D1DatabaseLike, userId: string, kelurahanId: string): Promise<Result<User>> {
	const user = await d1FullUser(d1, userId);
	const kel = await d1GetWilayah(d1, kelurahanId);
	if (!user) return fail('Akun tidak ditemukan.');
	if (!kel || kel.level !== 'kelurahan') return fail('Pilih kelurahan terlebih dahulu.');
	const lat = user.lat ?? kel.lat;
	const lng = user.lng ?? kel.lng;
	const nextStep: SetupStep = user.setupStep === 'wilayah' ? 'kerentanan' : user.setupStep;
	await d1
		.prepare('UPDATE users SET kelurahan_id = ?1, lat = ?2, lng = ?3, setup_step = ?4 WHERE id = ?5')
		.bind(kel.id, lat, lng, nextStep, userId)
		.run();
	return { ok: true, data: { ...user, kelurahanId: kel.id, lat, lng, setupStep: nextStep } };
}

export async function d1SetVulnerability(
	d1: D1DatabaseLike,
	userId: string,
	input: { lansia: boolean; disabilitas: boolean; bayi: boolean; consent: boolean },
	skip: boolean
): Promise<Result<User>> {
	const user = await d1FullUser(d1, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	let vulnerability: Vulnerability | null = null;
	if (!skip) {
		const any = input.lansia || input.disabilitas || input.bayi;
		if (any && !input.consent) {
			return fail('Centang persetujuan agar data kerentanan bisa disimpan.');
		}
		vulnerability = any
			? {
					lansia: input.lansia,
					disabilitas: input.disabilitas,
					bayi: input.bayi,
					consent: true,
					consentAt: new Date().toISOString()
				}
			: null;
	}
	const nextStep: SetupStep = user.setupStep === 'kerentanan' ? 'izin' : user.setupStep;
	await d1
		.prepare('UPDATE users SET vulnerability_json = ?1, setup_step = ?2 WHERE id = ?3')
		.bind(vulnerability ? JSON.stringify(vulnerability) : null, nextStep, userId)
		.run();
	return { ok: true, data: { ...user, vulnerability, setupStep: nextStep } };
}

export async function d1SetPrefs(
	d1: D1DatabaseLike,
	userId: string,
	input: { notifyEnabled: boolean; locationOnConfirm: boolean }
): Promise<Result<User>> {
	const user = await d1FullUser(d1, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	const nextStep: SetupStep = user.setupStep === 'izin' ? 'done' : user.setupStep;
	await d1
		.prepare('UPDATE users SET notify_enabled = ?1, location_on_confirm = ?2, setup_step = ?3 WHERE id = ?4')
		.bind(input.notifyEnabled ? 1 : 0, input.locationOnConfirm ? 1 : 0, nextStep, userId)
		.run();
	return {
		ok: true,
		data: {
			...user,
			notifyEnabled: input.notifyEnabled,
			locationOnConfirm: input.locationOnConfirm,
			setupStep: nextStep
		}
	};
}

export async function d1SetProfile(
	d1: D1DatabaseLike,
	userId: string,
	input: { rt?: string; rw?: string; address?: string; notifyEnabled?: boolean; locationOnConfirm?: boolean }
): Promise<Result<User>> {
	const user = await d1FullUser(d1, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	const rt = input.rt != null ? input.rt.trim() : user.rt;
	const rw = input.rw != null ? input.rw.trim() : user.rw;
	const address = input.address != null ? input.address.trim() : user.address;
	const notifyEnabled = input.notifyEnabled != null ? input.notifyEnabled : user.notifyEnabled;
	const locationOnConfirm = input.locationOnConfirm != null ? input.locationOnConfirm : user.locationOnConfirm;
	await d1
		.prepare(
			'UPDATE users SET rt = ?1, rw = ?2, address = ?3, notify_enabled = ?4, location_on_confirm = ?5 WHERE id = ?6'
		)
		.bind(rt, rw, address, notifyEnabled ? 1 : 0, locationOnConfirm ? 1 : 0, userId)
		.run();
	return { ok: true, data: { ...user, rt, rw, address, notifyEnabled, locationOnConfirm } };
}

export async function d1SetPush(
	d1: D1DatabaseLike,
	userId: string,
	subscription: User['pushSubscription']
): Promise<Result<User>> {
	const user = await d1FullUser(d1, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	const notifyEnabled = subscription ? true : user.notifyEnabled;
	await d1
		.prepare('UPDATE users SET push_subscription_json = ?1, notify_enabled = ?2 WHERE id = ?3')
		.bind(subscription ? JSON.stringify(subscription) : null, notifyEnabled ? 1 : 0, userId)
		.run();
	return { ok: true, data: { ...user, pushSubscription: subscription, notifyEnabled } };
}

export async function d1RemoveAccount(d1: D1DatabaseLike, userId: string): Promise<Result<true>> {
	const user = await d1FullUser(d1, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	await d1.batch([
		d1.prepare('DELETE FROM checkins WHERE user_id = ?1').bind(userId),
		d1.prepare('UPDATE checkins SET claimed_by = NULL WHERE claimed_by = ?1').bind(userId),
		d1.prepare('UPDATE facilities SET confirmed_by = NULL WHERE confirmed_by = ?1').bind(userId),
		d1.prepare('DELETE FROM users WHERE id = ?1').bind(userId)
	]);
	return { ok: true, data: true };
}

export async function d1CurrentAlert(d1: D1DatabaseLike, kelurahanId: string | null): Promise<AlertEvent | null> {
	if (!kelurahanId) return null;
	await ensureD1Ready(d1);
	const row = await d1
		.prepare(
			`SELECT * FROM events
			 WHERE kelurahan_id = ?1 AND relevant = 1 AND ended_at IS NULL
			 ORDER BY started_at DESC LIMIT 1`
		)
		.bind(kelurahanId)
		.first<EventRow>();
	return row ? mapEvent(row) : null;
}

export async function d1History(d1: D1DatabaseLike, kelurahanId: string): Promise<AlertEvent[]> {
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare('SELECT * FROM events WHERE kelurahan_id = ?1 ORDER BY started_at DESC')
		.bind(kelurahanId)
		.all<EventRow>();
	return rows.results.map(mapEvent);
}

export async function d1GetEvent(d1: D1DatabaseLike, id: string): Promise<AlertEvent | null> {
	await ensureD1Ready(d1);
	const row = await d1.prepare('SELECT * FROM events WHERE id = ?1').bind(id).first<EventRow>();
	return row ? mapEvent(row) : null;
}

export async function d1CheckinsFor(d1: D1DatabaseLike, eventId: string): Promise<Checkin[]> {
	await ensureD1Ready(d1);
	const rows = await d1.prepare('SELECT * FROM checkins WHERE event_id = ?1').bind(eventId).all<CheckinRow>();
	return rows.results.map(mapCheckin);
}

export async function d1MyCheckin(d1: D1DatabaseLike, eventId: string, userId: string): Promise<Checkin | null> {
	await ensureD1Ready(d1);
	const row = await d1
		.prepare('SELECT * FROM checkins WHERE event_id = ?1 AND user_id = ?2')
		.bind(eventId, userId)
		.first<CheckinRow>();
	return row ? mapCheckin(row) : null;
}

export async function d1Roster(d1: D1DatabaseLike, kelurahanId: string): Promise<PublicUser[]> {
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare("SELECT * FROM users WHERE role = 'warga' AND kelurahan_id = ?1")
		.bind(kelurahanId)
		.all<UserRow>();
	return rows.results
		.map((r) => toPublicUser(mapUser(r)))
		.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
}

export async function d1ResidentBoard(
	d1: D1DatabaseLike,
	kelurahanId: string,
	eventId: string | null
): Promise<ResidentRow[]> {
	await ensureD1Ready(d1);
	const [allUsers, checkins] = await Promise.all([
		d1.prepare('SELECT * FROM users WHERE kelurahan_id = ?1').bind(kelurahanId).all<UserRow>(),
		eventId ? d1CheckinsFor(d1, eventId) : Promise.resolve([])
	]);
	const users = allUsers.results.map(mapUser);
	const names = new Map(users.map((u) => [u.id, u.fullName]));
	const warga = users.filter((u) => u.role === 'warga').map(toPublicUser);
	return sortRows(buildRows(warga, checkins, names));
}

async function d1EnsureStaff(d1: D1DatabaseLike, actorId: string, kelurahanId: string): Promise<Result<User>> {
	const actor = await d1FullUser(d1, actorId);
	if (!actor) return fail('Akun tidak ditemukan.');
	if (actor.role === 'warga') return fail('Hanya ketua RT atau relawan yang dapat melakukan ini.');
	if (actor.kelurahanId !== kelurahanId) return fail('Bukan kelurahan Anda.');
	return { ok: true, data: actor };
}

export async function d1BeginSimulation(
	d1: D1DatabaseLike,
	actorId: string,
	scenario: Extract<Scenario, 'hujan_lebat' | 'gempa_dirasakan'>
): Promise<Result<AlertEvent>> {
	const actor = await d1FullUser(d1, actorId);
	if (!actor?.kelurahanId) return fail('Pilih kelurahan terlebih dahulu.');
	const staff = await d1EnsureStaff(d1, actorId, actor.kelurahanId);
	if (!staff.ok) return staff;

	const now = new Date().toISOString();
	const path = await d1PlacePath(d1, actor.kelurahanId);
	const province = path.find((item) => item.level === 'provinsi');
	const area = province?.altName || 'wilayah Anda';
	const hujan = scenario === 'hujan_lebat';

	const event: AlertEvent = {
		id: randomUUID(),
		kelurahanId: actor.kelurahanId,
		kind: 'simulasi',
		scenario,
		title: hujan ? 'Simulasi: hujan lebat tingkat provinsi' : 'Simulasi: gempa dirasakan',
		headline: hujan
			? `Simulasi: peringatan dini cuaca hujan lebat untuk ${area}.`
			: `Simulasi: gempa dirasakan untuk ${area}.`,
		areaLabel: area,
		coverageNote: hujan ? 'Tingkat provinsi, bukan kelurahan' : 'Bukan peringatan instan',
		sourceLabel: 'Simulasi oleh Ketua RT, bukan BMKG',
		isSimulation: true,
		relevant: true,
		startedAt: now,
		endedAt: null,
		externalId: null
	};

	const wargaRows = await d1
		.prepare("SELECT id FROM users WHERE role = 'warga' AND kelurahan_id = ?1")
		.bind(actor.kelurahanId)
		.all<{ id: string }>();

	const statements: D1PreparedStatementLike[] = [
		d1
			.prepare('UPDATE events SET ended_at = ?1 WHERE kelurahan_id = ?2 AND relevant = 1 AND ended_at IS NULL')
			.bind(now, actor.kelurahanId),
		d1
			.prepare(
				`INSERT INTO events (
					id, kelurahan_id, kind, scenario, title, headline, area_label,
					coverage_note, source_label, is_simulation, relevant, started_at, ended_at, external_id
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, 1, ?10, NULL, NULL)`
			)
			.bind(
				event.id,
				event.kelurahanId,
				event.kind,
				event.scenario,
				event.title,
				event.headline,
				event.areaLabel,
				event.coverageNote,
				event.sourceLabel,
				event.startedAt
			),
		...wargaRows.results.map((resident) =>
			d1
				.prepare(
					`INSERT INTO checkins (
						id, event_id, user_id, status, prior_status, help_type, note,
						lat, lng, location_label, claimed_by, claimed_at, updated_at
					) VALUES (?1, ?2, ?3, 'belum', NULL, NULL, '', NULL, NULL, '', NULL, NULL, ?4)`
				)
				.bind(randomUUID(), event.id, resident.id, now)
		)
	];

	await runBatched(d1, statements);
	return { ok: true, data: event };
}

export async function d1IgnoreEvent(d1: D1DatabaseLike, actorId: string, eventId: string): Promise<Result<AlertEvent>> {
	const event = await d1GetEvent(d1, eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = await d1EnsureStaff(d1, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	if (!event.relevant || event.endedAt) return fail('Kejadian ini sudah ditutup.');
	const endedAt = new Date().toISOString();
	await d1.prepare('UPDATE events SET relevant = 0, ended_at = ?1 WHERE id = ?2').bind(endedAt, eventId).run();
	return { ok: true, data: { ...event, relevant: false, endedAt } };
}

export async function d1BreachSla(d1: D1DatabaseLike, actorId: string, eventId: string): Promise<Result<AlertEvent>> {
	const event = await d1GetEvent(d1, eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = await d1EnsureStaff(d1, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	if (!event.relevant || event.endedAt) return fail('Kejadian ini sudah ditutup.');
	const targetMs = Date.now() - (SLA_MINUTES + 1) * 60000;
	const startedAt =
		new Date(event.startedAt).getTime() > targetMs ? new Date(targetMs).toISOString() : event.startedAt;
	await d1.prepare('UPDATE events SET started_at = ?1 WHERE id = ?2').bind(startedAt, eventId).run();
	return { ok: true, data: { ...event, startedAt } };
}

export async function d1SendStatus(
	d1: D1DatabaseLike,
	input: {
		userId: string;
		eventId: string;
		status: 'aman' | 'butuh';
		helpType?: HelpType | null;
		note?: string;
		lat?: number | null;
		lng?: number | null;
		locationLabel?: string;
	}
): Promise<Result<Checkin>> {
	const [user, event] = await Promise.all([d1FullUser(d1, input.userId), d1GetEvent(d1, input.eventId)]);
	if (!user || !event) return fail('Data siaga tidak ditemukan.');
	if (user.kelurahanId !== event.kelurahanId) return fail('Siaga ini bukan untuk kelurahan Anda.');
	if (!event.relevant || event.endedAt) return fail('Siaga ini sudah ditutup.');
	if (input.status === 'butuh' && !input.helpType) return fail('Pilih jenis bantuan.');

	const now = new Date().toISOString();
	const helpType = input.status === 'butuh' ? (input.helpType ?? null) : null;
	const note = input.status === 'butuh' ? (input.note ?? '').trim() : '';
	const lat = input.lat ?? null;
	const lng = input.lng ?? null;
	const locationLabel = input.locationLabel || user.address || 'Lokasi tercatat';

	await d1.batch([
		d1
			.prepare(
				`INSERT INTO checkins (
					id, event_id, user_id, status, prior_status, help_type, note,
					lat, lng, location_label, claimed_by, claimed_at, updated_at
				) VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?9, NULL, NULL, ?10)
				ON CONFLICT(event_id, user_id) DO UPDATE SET
					status = excluded.status,
					help_type = excluded.help_type,
					note = excluded.note,
					lat = excluded.lat,
					lng = excluded.lng,
					location_label = excluded.location_label,
					claimed_by = NULL,
					claimed_at = NULL,
					updated_at = excluded.updated_at`
			)
			.bind(randomUUID(), event.id, user.id, input.status, helpType, note, lat, lng, locationLabel, now),
		d1.prepare('UPDATE users SET last_status = ?1, last_status_at = ?2 WHERE id = ?3').bind(input.status, now, user.id)
	]);

	const updated = await d1MyCheckin(d1, event.id, user.id);
	if (!updated) return fail('Gagal menyimpan respons.');
	return { ok: true, data: updated };
}

export async function d1ClaimResident(
	d1: D1DatabaseLike,
	actorId: string,
	eventId: string,
	residentId: string
): Promise<Result<Checkin>> {
	const event = await d1GetEvent(d1, eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = await d1EnsureStaff(d1, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	if (!event.relevant || event.endedAt) return fail('Siaga ini sudah ditutup.');

	const now = new Date().toISOString();
	const runResult = await d1
		.prepare(
			`UPDATE checkins
			 SET prior_status = CASE WHEN status != 'dicek' THEN status ELSE prior_status END,
			     status = 'dicek',
			     claimed_by = ?1,
			     claimed_at = ?2,
			     updated_at = ?2
			 WHERE event_id = ?3
			   AND user_id = ?4
			   AND status NOT IN ('aman', 'dibantu')
			   AND (status != 'dicek' OR claimed_by IS NULL OR claimed_by = ?1)`
		)
		.bind(actorId, now, eventId, residentId)
		.run();

	const current = await d1MyCheckin(d1, eventId, residentId);
	if (!current) return fail('Warga ini tidak ada pada siaga ini.');
	if (!runResult.meta?.changes) {
		if (current.status === 'aman' || current.status === 'dibantu') {
			return fail('Warga ini sudah ditandai selesai.');
		}
		if (current.status === 'dicek' && current.claimedBy && current.claimedBy !== actorId) {
			return fail('Sedang dicek relawan lain.');
		}
	}
	return { ok: true, data: current };
}

export async function d1UnclaimResident(
	d1: D1DatabaseLike,
	actorId: string,
	eventId: string,
	residentId: string
): Promise<Result<Checkin>> {
	const event = await d1GetEvent(d1, eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = await d1EnsureStaff(d1, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	const checkin = await d1MyCheckin(d1, eventId, residentId);
	if (!checkin || checkin.status !== 'dicek') return fail('Tidak ada klaim yang bisa dibatalkan.');
	const now = new Date().toISOString();
	const restored = checkin.priorStatus ?? 'belum';
	await d1
		.prepare(
			'UPDATE checkins SET status = ?1, claimed_by = NULL, claimed_at = NULL, updated_at = ?2 WHERE event_id = ?3 AND user_id = ?4'
		)
		.bind(restored, now, eventId, residentId)
		.run();
	return { ok: true, data: { ...checkin, status: restored, claimedBy: null, claimedAt: null, updatedAt: now } };
}

export async function d1FinishCheck(
	d1: D1DatabaseLike,
	actorId: string,
	eventId: string,
	residentId: string,
	status: 'aman' | 'dibantu'
): Promise<Result<Checkin>> {
	const event = await d1GetEvent(d1, eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = await d1EnsureStaff(d1, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	const [checkin, resident] = await Promise.all([d1MyCheckin(d1, eventId, residentId), d1FullUser(d1, residentId)]);
	if (!checkin || !resident) return fail('Data warga tidak ditemukan.');
	if (checkin.status !== 'dicek') return fail('Ketuk Saya cek terlebih dahulu.');
	const now = new Date().toISOString();
	const helpType = status === 'aman' ? null : checkin.helpType;
	await d1.batch([
		d1
			.prepare('UPDATE checkins SET status = ?1, help_type = ?2, updated_at = ?3 WHERE event_id = ?4 AND user_id = ?5')
			.bind(status, helpType, now, eventId, residentId),
		d1.prepare('UPDATE users SET last_status = ?1, last_status_at = ?2 WHERE id = ?3').bind(status, now, residentId)
	]);
	return { ok: true, data: { ...checkin, status, helpType, updatedAt: now } };
}

export async function d1Facilities(d1: D1DatabaseLike, kelurahanId: string): Promise<Facility[]> {
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare('SELECT * FROM facilities WHERE kelurahan_id = ?1 ORDER BY distance_m ASC')
		.bind(kelurahanId)
		.all<FacilityRow>();
	return rows.results.map(mapFacility);
}

export async function d1SetFacilities(d1: D1DatabaseLike, kelurahanId: string, items: Facility[]) {
	await ensureD1Ready(d1);
	const statements: D1PreparedStatementLike[] = [
		d1.prepare('DELETE FROM facilities WHERE kelurahan_id = ?1').bind(kelurahanId),
		...items.map((f) =>
			d1
				.prepare(
					`INSERT OR REPLACE INTO facilities (
						id, kelurahan_id, external_id, kind, name, lat, lng,
						distance_m, shelter_confirmed, confirmed_by, confirmed_at, source
					) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
				)
				.bind(
					f.id,
					f.kelurahanId,
					f.externalId,
					f.kind,
					f.name,
					f.lat,
					f.lng,
					f.distanceM,
					f.shelterConfirmed ? 1 : 0,
					f.confirmedBy,
					f.confirmedAt,
					f.source
				)
		)
	];
	await runBatched(d1, statements);
}

export async function d1Shelter(d1: D1DatabaseLike, actorId: string, facilityId: string): Promise<Result<Facility>> {
	await ensureD1Ready(d1);
	const row = await d1.prepare('SELECT * FROM facilities WHERE id = ?1').bind(facilityId).first<FacilityRow>();
	if (!row) return fail('Fasilitas tidak ditemukan.');
	const facility = mapFacility(row);
	const staff = await d1EnsureStaff(d1, actorId, facility.kelurahanId);
	if (!staff.ok) return staff;
	if (facility.kind !== 'calon_posko') return fail('Hanya calon posko yang dapat dikonfirmasi.');
	const confirmedAt = new Date().toISOString();
	await d1
		.prepare('UPDATE facilities SET shelter_confirmed = 1, confirmed_by = ?1, confirmed_at = ?2 WHERE id = ?3')
		.bind(actorId, confirmedAt, facilityId)
		.run();
	return { ok: true, data: { ...facility, shelterConfirmed: true, confirmedBy: actorId, confirmedAt } };
}

export async function d1AnnouncementsFor(
	d1: D1DatabaseLike,
	kelurahanId: string,
	viewer: PublicUser | null
): Promise<Announcement[]> {
	if (!viewer) return [];
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare('SELECT * FROM announcements WHERE kelurahan_id = ?1 ORDER BY created_at DESC')
		.bind(kelurahanId)
		.all<AnnouncementRow>();
	return rows.results.map(mapAnnouncement).filter((item) => {
		if (viewer.role !== 'warga') return true;
		if (item.audience === 'semua') return true;
		return isVulnerable(viewer.vulnerability);
	});
}

export async function d1PublishAnnouncement(
	d1: D1DatabaseLike,
	actorId: string,
	input: { body: string; audience: Audience }
): Promise<Result<Announcement>> {
	const actor = await d1FullUser(d1, actorId);
	if (!actor?.kelurahanId) return fail('Kelurahan belum dipilih.');
	const staff = await d1EnsureStaff(d1, actorId, actor.kelurahanId);
	if (!staff.ok) return staff;
	const body = input.body.trim();
	if (body.length < 8) return fail('Isi pengumuman masih terlalu singkat.');
	const item: Announcement = {
		id: randomUUID(),
		kelurahanId: actor.kelurahanId,
		authorId: actorId,
		body,
		audience: input.audience,
		createdAt: new Date().toISOString()
	};
	await d1
		.prepare(
			'INSERT INTO announcements (id, kelurahan_id, author_id, body, audience, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
		)
		.bind(item.id, item.kelurahanId, item.authorId, item.body, item.audience, item.createdAt)
		.run();
	return { ok: true, data: item };
}

export async function d1Forecast(d1: D1DatabaseLike, kelurahanId: string): Promise<ForecastDay[]> {
	await ensureD1Ready(d1);
	const row = await d1
		.prepare('SELECT days_json FROM forecasts WHERE kelurahan_id = ?1')
		.bind(kelurahanId)
		.first<{ days_json: string }>();
	if (row?.days_json) {
		try {
			return JSON.parse(row.days_json) as ForecastDay[];
		} catch {
			/* fallback */
		}
	}
	return [
		{ label: 'Hari ini', weather: 'Belum ada data', tempC: 0 },
		{ label: 'Besok', weather: 'Belum ada data', tempC: 0 },
		{ label: 'Lusa', weather: 'Belum ada data', tempC: 0 }
	];
}

export async function d1ForecastAge(d1: D1DatabaseLike, kelurahanId: string): Promise<string | null> {
	await ensureD1Ready(d1);
	const row = await d1
		.prepare('SELECT fetched_at FROM forecasts WHERE kelurahan_id = ?1')
		.bind(kelurahanId)
		.first<{ fetched_at: string }>();
	return row?.fetched_at ?? null;
}

export async function d1SetForecastDays(d1: D1DatabaseLike, kelurahanId: string, days: ForecastDay[]) {
	await ensureD1Ready(d1);
	await d1
		.prepare('INSERT OR REPLACE INTO forecasts (kelurahan_id, fetched_at, days_json) VALUES (?1, ?2, ?3)')
		.bind(kelurahanId, new Date().toISOString(), JSON.stringify(days))
		.run();
}

export async function d1OpenExternal(
	d1: D1DatabaseLike,
	input: {
		kelurahanId: string;
		externalId: string;
		kind: 'cuaca' | 'gempa';
		scenario: Scenario;
		title: string;
		headline: string;
		areaLabel: string;
		coverageNote: string;
		sourceLabel: string;
	}
): Promise<AlertEvent | null> {
	await ensureD1Ready(d1);
	const key = `${input.kind}:${input.externalId}:${input.kelurahanId}`;
	const now = new Date().toISOString();
	const seen = await d1
		.prepare('INSERT OR IGNORE INTO seen_keys (key, created_at) VALUES (?1, ?2)')
		.bind(key, now)
		.run();
	if (!seen.meta?.changes) return null;

	const event: AlertEvent = {
		id: randomUUID(),
		kelurahanId: input.kelurahanId,
		kind: input.kind,
		scenario: input.scenario,
		title: input.title,
		headline: input.headline,
		areaLabel: input.areaLabel,
		coverageNote: input.coverageNote,
		sourceLabel: input.sourceLabel,
		isSimulation: false,
		relevant: true,
		startedAt: now,
		endedAt: null,
		externalId: input.externalId
	};

	const wargaRows = await d1
		.prepare("SELECT id FROM users WHERE role = 'warga' AND kelurahan_id = ?1")
		.bind(input.kelurahanId)
		.all<{ id: string }>();

	const statements: D1PreparedStatementLike[] = [
		d1
			.prepare(
				`INSERT INTO events (
					id, kelurahan_id, kind, scenario, title, headline, area_label,
					coverage_note, source_label, is_simulation, relevant, started_at, ended_at, external_id
				) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 1, ?10, NULL, ?11)`
			)
			.bind(
				event.id,
				event.kelurahanId,
				event.kind,
				event.scenario,
				event.title,
				event.headline,
				event.areaLabel,
				event.coverageNote,
				event.sourceLabel,
				event.startedAt,
				event.externalId
			),
		...wargaRows.results.map((resident) =>
			d1
				.prepare(
					`INSERT INTO checkins (
						id, event_id, user_id, status, prior_status, help_type, note,
						lat, lng, location_label, claimed_by, claimed_at, updated_at
					) VALUES (?1, ?2, ?3, 'belum', NULL, NULL, '', NULL, NULL, '', NULL, NULL, ?4)`
				)
				.bind(randomUUID(), event.id, resident.id, now)
		)
	];
	await runBatched(d1, statements);
	return event;
}

export async function d1KelurahanWithResidents(d1: D1DatabaseLike) {
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare("SELECT DISTINCT kelurahan_id FROM users WHERE role = 'warga' AND kelurahan_id IS NOT NULL")
		.all<{ kelurahan_id: string }>();
	return Promise.all(
		rows.results.map(async ({ kelurahan_id }) => ({
			id: kelurahan_id,
			path: await d1PlacePath(d1, kelurahan_id),
			center: await d1GetWilayah(d1, kelurahan_id)
		}))
	);
}

export async function d1Subscribers(d1: D1DatabaseLike, kelurahanId: string): Promise<User[]> {
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare(
			'SELECT * FROM users WHERE kelurahan_id = ?1 AND notify_enabled = 1 AND push_subscription_json IS NOT NULL'
		)
		.bind(kelurahanId)
		.all<UserRow>();
	return rows.results.map(mapUser);
}

export async function d1RecordLiveEvent(d1: D1DatabaseLike, message: LiveMessage): Promise<number | null> {
	try {
		await ensureD1Ready(d1);
		const inserted = await d1
			.prepare('INSERT INTO live_events (payload_json, created_at) VALUES (?1, ?2)')
			.bind(JSON.stringify(message), message.at)
			.run();
		const id = inserted.meta?.last_row_id ?? null;
		if (id && id % 25 === 0) {
			await d1
				.prepare('DELETE FROM live_events WHERE id <= ?1')
				.bind(id - 100)
				.run()
				.catch(() => null);
		}
		return id;
	} catch {
		return null;
	}
}

export async function d1LatestLiveEventId(d1: D1DatabaseLike): Promise<number> {
	await ensureD1Ready(d1);
	const row = await d1.prepare('SELECT COALESCE(MAX(id), 0) AS max_id FROM live_events').first<{ max_id: number }>();
	return row?.max_id ?? 0;
}

export async function d1LiveEventsAfter(
	d1: D1DatabaseLike,
	afterId: number
): Promise<Array<{ id: number; message: LiveMessage }>> {
	await ensureD1Ready(d1);
	const rows = await d1
		.prepare('SELECT id, payload_json FROM live_events WHERE id > ?1 ORDER BY id ASC LIMIT 25')
		.bind(afterId)
		.all<{ id: number; payload_json: string }>();
	const out: Array<{ id: number; message: LiveMessage }> = [];
	for (const row of rows.results) {
		try {
			out.push({ id: row.id, message: JSON.parse(row.payload_json) as LiveMessage });
		} catch {
			/* skip malformed */
		}
	}
	return out;
}
