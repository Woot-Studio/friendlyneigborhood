import { randomUUID } from 'node:crypto';
import { normalizePhone, scenarioLabel } from '../domain';
import type {
	AlertEvent,
	Announcement,
	AppState,
	Audience,
	Checkin,
	Facility,
	ForecastDay,
	HelpType,
	Result,
	Role,
	Scenario,
	User,
	Vulnerability,
	Wilayah,
	WilayahLevel
} from '../types';
import { hashPassword, verifyPassword } from './passwords';
import { seedState } from './seed';
import { findWilayah, wilayahPath } from './wilayah-data';

export function blankState(): AppState {
	return seedState();
}

function userById(state: AppState, id: string): User | undefined {
	return state.users.find((item) => item.id === id);
}

function fail(error: string): Result<never> {
	return { ok: false, error };
}

export function authenticate(state: AppState, phone: string, password: string): Result<User> {
	const user = state.users.find((item) => item.phone === normalizePhone(phone));
	if (!user || !verifyPassword(password, user.passwordHash)) {
		return fail('Nomor HP atau kata sandi tidak sesuai.');
	}
	return { ok: true, data: user };
}

export function registerUser(
	state: AppState,
	input: { fullName: string; phone: string; password: string; role: Role }
): Result<User> {
	const fullName = input.fullName.trim();
	const phone = normalizePhone(input.phone);
	if (fullName.length < 3) return fail('Nama lengkap minimal 3 huruf.');
	if (phone.length < 10 || phone.length > 15) return fail('Nomor HP tidak valid.');
	if (input.password.length < 8) return fail('Kata sandi minimal 8 karakter.');
	if (!['warga', 'rt', 'relawan'].includes(input.role)) return fail('Pilih peran Anda.');
	if (state.users.some((item) => item.phone === phone)) return fail('Nomor HP ini sudah terdaftar.');
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
	state.users.push(user);
	return { ok: true, data: user };
}

export function listWilayah(
	state: AppState,
	parentId: string | null,
	level: WilayahLevel,
	query = ''
): Wilayah[] {
	const q = query.trim().toLowerCase();
	return state.wilayah
		.filter((item) => item.level === level && item.parentId === parentId)
		.filter((item) => !q || item.name.toLowerCase().includes(q) || item.altName.toLowerCase().includes(q))
		.sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function saveKelurahan(state: AppState, userId: string, kelurahanId: string): Result<User> {
	const user = userById(state, userId);
	const kelurahan = findWilayah(state.wilayah, kelurahanId);
	if (!user) return fail('Akun tidak ditemukan.');
	if (!kelurahan || kelurahan.level !== 'kelurahan') return fail('Pilih kelurahan terlebih dahulu.');
	user.kelurahanId = kelurahan.id;
	if (user.lat == null && kelurahan.lat != null) user.lat = kelurahan.lat;
	if (user.lng == null && kelurahan.lng != null) user.lng = kelurahan.lng;
	if (user.setupStep === 'wilayah') user.setupStep = 'kerentanan';
	return { ok: true, data: user };
}

export function saveVulnerability(
	state: AppState,
	userId: string,
	input: { lansia: boolean; disabilitas: boolean; bayi: boolean; consent: boolean },
	skip: boolean
): Result<User> {
	const user = userById(state, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	if (skip) {
		user.vulnerability = null;
	} else {
		const any = input.lansia || input.disabilitas || input.bayi;
		if (any && !input.consent) {
			return fail('Centang persetujuan agar data kerentanan bisa disimpan.');
		}
		const vuln: Vulnerability | null = any
			? {
					lansia: input.lansia,
					disabilitas: input.disabilitas,
					bayi: input.bayi,
					consent: true,
					consentAt: new Date().toISOString()
				}
			: null;
		user.vulnerability = vuln;
	}
	if (user.setupStep === 'kerentanan') user.setupStep = 'izin';
	return { ok: true, data: user };
}

export function savePrefs(
	state: AppState,
	userId: string,
	input: { notifyEnabled: boolean; locationOnConfirm: boolean }
): Result<User> {
	const user = userById(state, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	user.notifyEnabled = input.notifyEnabled;
	user.locationOnConfirm = input.locationOnConfirm;
	if (user.setupStep === 'izin') user.setupStep = 'done';
	return { ok: true, data: user };
}

export function updateProfile(
	state: AppState,
	userId: string,
	input: { rt?: string; rw?: string; address?: string; notifyEnabled?: boolean; locationOnConfirm?: boolean }
): Result<User> {
	const user = userById(state, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	if (input.rt != null) user.rt = input.rt.trim();
	if (input.rw != null) user.rw = input.rw.trim();
	if (input.address != null) user.address = input.address.trim();
	if (input.notifyEnabled != null) user.notifyEnabled = input.notifyEnabled;
	if (input.locationOnConfirm != null) user.locationOnConfirm = input.locationOnConfirm;
	return { ok: true, data: user };
}

export function savePush(
	state: AppState,
	userId: string,
	subscription: User['pushSubscription']
): Result<User> {
	const user = userById(state, userId);
	if (!user) return fail('Akun tidak ditemukan.');
	user.pushSubscription = subscription;
	user.notifyEnabled = true;
	return { ok: true, data: user };
}

export function deleteAccount(state: AppState, userId: string): Result<true> {
	if (!userById(state, userId)) return fail('Akun tidak ditemukan.');
	state.users = state.users.filter((item) => item.id !== userId);
	state.checkins = state.checkins.filter((item) => item.userId !== userId);
	for (const checkin of state.checkins) {
		if (checkin.claimedBy === userId) checkin.claimedBy = null;
	}
	for (const facility of state.facilities) {
		if (facility.confirmedBy === userId) facility.confirmedBy = null;
	}
	return { ok: true, data: true };
}

export function activeEvent(state: AppState, kelurahanId: string | null): AlertEvent | null {
	if (!kelurahanId) return null;
	const open = state.events
		.filter((item) => item.kelurahanId === kelurahanId && item.relevant && !item.endedAt)
		.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
	return open[0] ?? null;
}

export function eventsFor(state: AppState, kelurahanId: string): AlertEvent[] {
	return state.events
		.filter((item) => item.kelurahanId === kelurahanId)
		.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function wargaOf(state: AppState, kelurahanId: string): User[] {
	return state.users.filter((item) => item.role === 'warga' && item.kelurahanId === kelurahanId);
}

function ensureStaff(state: AppState, actorId: string, kelurahanId: string): Result<User> {
	const actor = userById(state, actorId);
	if (!actor) return fail('Akun tidak ditemukan.');
	if (actor.role === 'warga') return fail('Hanya ketua RT atau relawan yang dapat melakukan ini.');
	if (actor.kelurahanId !== kelurahanId) return fail('Bukan kelurahan Anda.');
	return { ok: true, data: actor };
}

function blankCheckin(eventId: string, userId: string, at: string): Checkin {
	return {
		id: randomUUID(),
		eventId,
		userId,
		status: 'belum',
		priorStatus: null,
		helpType: null,
		note: '',
		lat: null,
		lng: null,
		locationLabel: '',
		claimedBy: null,
		claimedAt: null,
		updatedAt: at
	};
}

export function startSimulation(
	state: AppState,
	actorId: string,
	scenario: Extract<Scenario, 'hujan_lebat' | 'gempa_dirasakan'>
): Result<AlertEvent> {
	const actor = userById(state, actorId);
	if (!actor?.kelurahanId) return fail('Pilih kelurahan terlebih dahulu.');
	const staff = ensureStaff(state, actorId, actor.kelurahanId);
	if (!staff.ok) return staff;
	const now = new Date().toISOString();
	for (const event of state.events) {
		if (event.kelurahanId === actor.kelurahanId && event.relevant && !event.endedAt) {
			event.endedAt = now;
		}
	}
	const path = wilayahPath(state.wilayah, actor.kelurahanId);
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
	state.events.unshift(event);
	for (const resident of wargaOf(state, actor.kelurahanId)) {
		state.checkins.push(blankCheckin(event.id, resident.id, now));
	}
	return { ok: true, data: event };
}

export function markIrrelevant(state: AppState, actorId: string, eventId: string): Result<AlertEvent> {
	const event = state.events.find((item) => item.id === eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = ensureStaff(state, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	if (!event.relevant || event.endedAt) return fail('Kejadian ini sudah ditutup.');
	event.relevant = false;
	event.endedAt = new Date().toISOString();
	return { ok: true, data: event };
}

export function respond(
	state: AppState,
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
): Result<Checkin> {
	const user = userById(state, input.userId);
	const event = state.events.find((item) => item.id === input.eventId);
	if (!user || !event) return fail('Data siaga tidak ditemukan.');
	if (user.kelurahanId !== event.kelurahanId) return fail('Siaga ini bukan untuk kelurahan Anda.');
	if (!event.relevant || event.endedAt) return fail('Siaga ini sudah ditutup.');
	if (input.status === 'butuh' && !input.helpType) return fail('Pilih jenis bantuan.');
	let checkin = state.checkins.find((item) => item.eventId === event.id && item.userId === user.id);
	if (!checkin) {
		checkin = blankCheckin(event.id, user.id, event.startedAt);
		state.checkins.push(checkin);
	}
	const now = new Date().toISOString();
	checkin.status = input.status;
	checkin.helpType = input.status === 'butuh' ? input.helpType ?? null : null;
	checkin.note = input.status === 'butuh' ? (input.note ?? '').trim() : '';
	checkin.lat = input.lat ?? null;
	checkin.lng = input.lng ?? null;
	checkin.locationLabel = input.locationLabel || user.address || 'Lokasi tercatat';
	checkin.claimedBy = null;
	checkin.claimedAt = null;
	checkin.updatedAt = now;
	user.lastStatus = input.status;
	user.lastStatusAt = now;
	return { ok: true, data: checkin };
}

export function claim(state: AppState, actorId: string, eventId: string, residentId: string): Result<Checkin> {
	const event = state.events.find((item) => item.id === eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = ensureStaff(state, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	if (!event.relevant || event.endedAt) return fail('Siaga ini sudah ditutup.');
	const checkin = state.checkins.find((item) => item.eventId === eventId && item.userId === residentId);
	if (!checkin) return fail('Warga ini tidak ada pada siaga ini.');
	if (checkin.status === 'aman' || checkin.status === 'dibantu') {
		return fail('Warga ini sudah ditandai selesai.');
	}
	if (checkin.status === 'dicek' && checkin.claimedBy && checkin.claimedBy !== actorId) {
		return fail('Sedang dicek relawan lain.');
	}
	const now = new Date().toISOString();
	if (checkin.status !== 'dicek') checkin.priorStatus = checkin.status;
	checkin.status = 'dicek';
	checkin.claimedBy = actorId;
	checkin.claimedAt = now;
	checkin.updatedAt = now;
	return { ok: true, data: checkin };
}

export function cancelClaim(
	state: AppState,
	actorId: string,
	eventId: string,
	residentId: string
): Result<Checkin> {
	const event = state.events.find((item) => item.id === eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = ensureStaff(state, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	const checkin = state.checkins.find((item) => item.eventId === eventId && item.userId === residentId);
	if (!checkin || checkin.status !== 'dicek') return fail('Tidak ada klaim yang bisa dibatalkan.');
	checkin.status = checkin.priorStatus ?? 'belum';
	checkin.claimedBy = null;
	checkin.claimedAt = null;
	checkin.updatedAt = new Date().toISOString();
	return { ok: true, data: checkin };
}

export function resolveCheck(
	state: AppState,
	actorId: string,
	eventId: string,
	residentId: string,
	status: 'aman' | 'dibantu'
): Result<Checkin> {
	const event = state.events.find((item) => item.id === eventId);
	if (!event) return fail('Kejadian tidak ditemukan.');
	const staff = ensureStaff(state, actorId, event.kelurahanId);
	if (!staff.ok) return staff;
	const checkin = state.checkins.find((item) => item.eventId === eventId && item.userId === residentId);
	const resident = userById(state, residentId);
	if (!checkin || !resident) return fail('Data warga tidak ditemukan.');
	if (checkin.status !== 'dicek') return fail('Ketuk Saya cek terlebih dahulu.');
	const now = new Date().toISOString();
	checkin.status = status;
	if (status === 'aman') checkin.helpType = null;
	checkin.updatedAt = now;
	resident.lastStatus = status === 'dibantu' ? 'dibantu' : 'aman';
	resident.lastStatusAt = now;
	return { ok: true, data: checkin };
}

export function confirmShelter(state: AppState, actorId: string, facilityId: string): Result<Facility> {
	const facility = state.facilities.find((item) => item.id === facilityId);
	if (!facility) return fail('Fasilitas tidak ditemukan.');
	const staff = ensureStaff(state, actorId, facility.kelurahanId);
	if (!staff.ok) return staff;
	if (facility.kind !== 'calon_posko') return fail('Hanya calon posko yang dapat dikonfirmasi.');
	facility.shelterConfirmed = true;
	facility.confirmedBy = actorId;
	facility.confirmedAt = new Date().toISOString();
	return { ok: true, data: facility };
}

export function addAnnouncement(
	state: AppState,
	actorId: string,
	input: { body: string; audience: Audience }
): Result<Announcement> {
	const actor = userById(state, actorId);
	if (!actor?.kelurahanId) return fail('Kelurahan belum dipilih.');
	const staff = ensureStaff(state, actorId, actor.kelurahanId);
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
	state.announcements.unshift(item);
	return { ok: true, data: item };
}

export function replaceFacilities(state: AppState, kelurahanId: string, facilities: Facility[]) {
	state.facilities = state.facilities.filter((item) => item.kelurahanId !== kelurahanId).concat(facilities);
}

export function saveForecast(state: AppState, kelurahanId: string, days: ForecastDay[]) {
	state.forecasts[kelurahanId] = { at: new Date().toISOString(), days };
}

export function rememberExternal(state: AppState, key: string): boolean {
	if (state.seenKeys.includes(key)) return false;
	state.seenKeys.push(key);
	return true;
}

export function createExternalAlert(
	state: AppState,
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
): AlertEvent | null {
	const key = `${input.kind}:${input.externalId}:${input.kelurahanId}`;
	if (!rememberExternal(state, key)) return null;
	const now = new Date().toISOString();
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
	state.events.unshift(event);
	for (const resident of wargaOf(state, input.kelurahanId)) {
		state.checkins.push(blankCheckin(event.id, resident.id, now));
	}
	return event;
}

export function scenarioText(scenario: Scenario): string {
	return scenarioLabel(scenario);
}

export function resetDemo(state: AppState): AppState {
	const next = seedState();
	state.version = next.version;
	state.users = next.users;
	state.events = next.events;
	state.checkins = next.checkins;
	state.facilities = next.facilities;
	state.announcements = next.announcements;
	state.wilayah = next.wilayah;
	state.seenKeys = next.seenKeys;
	state.forecasts = next.forecasts;
	return state;
}
