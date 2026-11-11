import { buildRows, isVulnerable, sortRows } from '#lib/domain';
import type {
	AlertEvent,
	Announcement,
	Audience,
	Facility,
	ForecastDay,
	HelpType,
	LiveMessage,
	PublicUser,
	Result,
	Role,
	Scenario,
	User
} from '#lib/types';
import {
	activeEvent,
	addAnnouncement,
	authenticate,
	cancelClaim,
	claim,
	confirmShelter,
	createExternalAlert,
	deleteAccount,
	eventsFor,
	listWilayah,
	markIrrelevant,
	registerUser,
	replaceFacilities,
	resetDemo,
	resolveCheck,
	respond,
	saveForecast,
	saveKelurahan,
	savePrefs,
	savePush,
	saveVulnerability,
	startSimulation,
	updateProfile
} from './logic';
import { emit, state, subscribe, toPublic } from './memory';
import { findWilayah, wilayahPath } from './wilayah-data';

export { subscribe, toPublic };

function commit<T>(result: Result<T>, message?: LiveMessage): Result<T> {
	if (result.ok) emit(message ?? { type: 'update', at: new Date().toISOString() });
	return result;
}

export function getUser(id: string | null): PublicUser | null {
	if (!id) return null;
	const user = state().users.find((item) => item.id === id);
	return user ? toPublic(user) : null;
}

export function fullUser(id: string): User | null {
	return state().users.find((item) => item.id === id) ?? null;
}

export function login(phone: string, password: string) {
	return authenticate(state(), phone, password);
}

export function register(input: { fullName: string; phone: string; password: string; role: Role }) {
	return commit(registerUser(state(), input));
}

export function setKelurahan(userId: string, kelurahanId: string) {
	return commit(saveKelurahan(state(), userId, kelurahanId));
}

export function setVulnerability(
	userId: string,
	input: { lansia: boolean; disabilitas: boolean; bayi: boolean; consent: boolean },
	skip: boolean
) {
	return commit(saveVulnerability(state(), userId, input, skip));
}

export function setPrefs(userId: string, input: { notifyEnabled: boolean; locationOnConfirm: boolean }) {
	return commit(savePrefs(state(), userId, input));
}

export function setProfile(
	userId: string,
	input: { rt?: string; rw?: string; address?: string; notifyEnabled?: boolean; locationOnConfirm?: boolean }
) {
	return commit(updateProfile(state(), userId, input));
}

export function setPush(userId: string, subscription: User['pushSubscription']) {
	return commit(savePush(state(), userId, subscription));
}

export function removeAccount(userId: string) {
	return commit(deleteAccount(state(), userId));
}

export function currentAlert(kelurahanId: string | null) {
	return activeEvent(state(), kelurahanId);
}

export function history(kelurahanId: string) {
	return eventsFor(state(), kelurahanId);
}

export function getEvent(id: string) {
	return state().events.find((item) => item.id === id) ?? null;
}

export function checkinsFor(eventId: string) {
	return state().checkins.filter((item) => item.eventId === eventId);
}

export function myCheckin(eventId: string, userId: string) {
	return state().checkins.find((item) => item.eventId === eventId && item.userId === userId) ?? null;
}

export function roster(kelurahanId: string) {
	return state()
		.users.filter((item) => item.role === 'warga' && item.kelurahanId === kelurahanId)
		.map(toPublic)
		.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
}

export function residentBoard(kelurahanId: string, eventId: string | null) {
	const names = new Map(state().users.map((item) => [item.id, item.fullName]));
	const warga = state()
		.users.filter((item) => item.role === 'warga' && item.kelurahanId === kelurahanId)
		.map(toPublic);
	const checkins = eventId ? checkinsFor(eventId) : [];
	return sortRows(buildRows(warga, checkins, names));
}

export function placeLabel(kelurahanId: string | null): string {
	const kel = findWilayah(state().wilayah, kelurahanId);
	return kel ? `Kel. ${kel.altName}` : 'kelurahan Anda';
}

export function placePath(kelurahanId: string | null) {
	return wilayahPath(state().wilayah, kelurahanId);
}

export function childrenOf(parentId: string | null, level: 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan', q = '') {
	return listWilayah(state(), parentId, level, q);
}

export function beginSimulation(actorId: string, scenario: Extract<Scenario, 'hujan_lebat' | 'gempa_dirasakan'>) {
	const result = startSimulation(state(), actorId, scenario);
	if (!result.ok) return result;
	const event = result.data;
	emit({
		type: 'alert',
		at: event.startedAt,
		title: event.isSimulation ? `SIMULASI · ${event.title}` : event.title,
		body: event.isSimulation
			? 'Ini simulasi oleh Ketua RT, bukan peringatan BMKG asli. Ketuk untuk memberi kabar.'
			: `${event.areaLabel}. Ketuk untuk memberi kabar.`,
		url: `/siaga/${event.id}`,
		simulation: event.isSimulation
	});
	return result;
}

export function ignoreEvent(actorId: string, eventId: string) {
	return commit(markIrrelevant(state(), actorId, eventId));
}

export function sendStatus(input: {
	userId: string;
	eventId: string;
	status: 'aman' | 'butuh';
	helpType?: HelpType | null;
	note?: string;
	lat?: number | null;
	lng?: number | null;
	locationLabel?: string;
}) {
	return commit(respond(state(), input));
}

export function claimResident(actorId: string, eventId: string, residentId: string) {
	return commit(claim(state(), actorId, eventId, residentId));
}

export function unclaimResident(actorId: string, eventId: string, residentId: string) {
	return commit(cancelClaim(state(), actorId, eventId, residentId));
}

export function finishCheck(actorId: string, eventId: string, residentId: string, status: 'aman' | 'dibantu') {
	return commit(resolveCheck(state(), actorId, eventId, residentId, status));
}

export function facilities(kelurahanId: string): Facility[] {
	return state()
		.facilities.filter((item) => item.kelurahanId === kelurahanId)
		.sort((a, b) => a.distanceM - b.distanceM);
}

export function setFacilities(kelurahanId: string, items: Facility[]) {
	replaceFacilities(state(), kelurahanId, items);
	emit();
}

export function shelter(actorId: string, facilityId: string) {
	return commit(confirmShelter(state(), actorId, facilityId));
}

export function announcementsFor(kelurahanId: string, viewer: PublicUser | null): Announcement[] {
	return state()
		.announcements.filter((item) => item.kelurahanId === kelurahanId)
		.filter((item) => {
			if (!viewer) return false;
			if (viewer.role !== 'warga') return true;
			if (item.audience === 'semua') return true;
			return isVulnerable(viewer.vulnerability);
		});
}

export function publishAnnouncement(actorId: string, input: { body: string; audience: Audience }) {
	const result = addAnnouncement(state(), actorId, input);
	if (!result.ok) return result;
	emit({
		type: 'alert',
		at: result.data.createdAt,
		title: 'Pengumuman ketua RT',
		body: result.data.body,
		url: '/beranda',
		simulation: false
	});
	return result;
}

export function forecast(kelurahanId: string): ForecastDay[] {
	return (
		state().forecasts[kelurahanId]?.days ?? [
			{ label: 'Hari ini', weather: 'Belum ada data', tempC: 0 },
			{ label: 'Besok', weather: 'Belum ada data', tempC: 0 },
			{ label: 'Lusa', weather: 'Belum ada data', tempC: 0 }
		]
	);
}

export function setForecastDays(kelurahanId: string, days: ForecastDay[]) {
	saveForecast(state(), kelurahanId, days);
	emit();
}

export function forecastAge(kelurahanId: string): string | null {
	return state().forecasts[kelurahanId]?.at ?? null;
}

export function openExternal(input: Parameters<typeof createExternalAlert>[1]): AlertEvent | null {
	const event = createExternalAlert(state(), input);
	if (!event) return null;
	emit({
		type: 'alert',
		at: event.startedAt,
		title: event.title,
		body: `${event.areaLabel}. Ketuk untuk memberi kabar.`,
		url: `/siaga/${event.id}`,
		simulation: false
	});
	return event;
}

export function restoreDemo() {
	resetDemo(state());
	emit();
}

export function kelurahanWithResidents() {
	const ids = [
		...new Set(
			state()
				.users.filter((item) => item.role === 'warga' && item.kelurahanId)
				.map((item) => item.kelurahanId as string)
		)
	];
	return ids.map((id) => ({
		id,
		path: wilayahPath(state().wilayah, id),
		center: findWilayah(state().wilayah, id)
	}));
}

export function subscribers(kelurahanId: string) {
	return state().users.filter(
		(item) => item.kelurahanId === kelurahanId && item.notifyEnabled && item.pushSubscription
	);
}

export async function ensureFacilities(kelurahanId: string) {
	const { fetchFacilitiesNear, hasApiKey } = await import('./providers');
	const current = facilities(kelurahanId);
	if (!hasApiKey() || current.some((item) => item.source === 'api')) return current;
	const kelurahan = findWilayah(state().wilayah, kelurahanId);
	if (!kelurahan) return current;
	try {
		const live = await fetchFacilitiesNear(kelurahan);
		if (!live?.length) return current;
		const confirmed = new Map(current.filter((item) => item.shelterConfirmed).map((item) => [item.externalId, item]));
		for (const item of live) {
			const previous = confirmed.get(item.externalId);
			if (previous) {
				item.shelterConfirmed = true;
				item.confirmedBy = previous.confirmedBy;
				item.confirmedAt = previous.confirmedAt;
				item.id = previous.id;
			}
		}
		setFacilities(kelurahanId, live);
	} catch {
		return current;
	}
	return facilities(kelurahanId);
}

export async function ensureForecast(kelurahanId: string) {
	const { fetchForecast, hasApiKey } = await import('./providers');
	const cachedAt = forecastAge(kelurahanId);
	const fresh = cachedAt ? Date.now() - new Date(cachedAt).getTime() < 6 * 60 * 60 * 1000 : false;
	if (!hasApiKey() || fresh) return forecast(kelurahanId);
	const kelurahan = findWilayah(state().wilayah, kelurahanId);
	if (!kelurahan) return forecast(kelurahanId);
	try {
		const days = await fetchForecast(kelurahan.id);
		if (days?.length) setForecastDays(kelurahanId, days);
	} catch {
		return forecast(kelurahanId);
	}
	return forecast(kelurahanId);
}
