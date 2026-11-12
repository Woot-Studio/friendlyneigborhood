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
	User,
	Wilayah,
	WilayahLevel
} from '#lib/types';
import {
	d1AnnouncementsFor,
	d1BeginSimulation,
	d1BreachSla,
	d1CheckinsFor,
	d1ChildrenOf,
	d1ClaimResident,
	d1CurrentAlert,
	d1Facilities,
	d1FinishCheck,
	d1Forecast,
	d1ForecastAge,
	d1FullUser,
	d1GetEvent,
	d1GetUser,
	d1GetWilayah,
	d1History,
	d1IgnoreEvent,
	d1KelurahanWithResidents,
	d1LatestLiveEventId,
	d1LiveEventsAfter,
	d1Login,
	d1MyCheckin,
	d1OpenExternal,
	d1PlaceLabel,
	d1PlacePath,
	d1PublishAnnouncement,
	d1RecordLiveEvent,
	d1Register,
	d1RemoveAccount,
	d1ResidentBoard,
	d1Roster,
	d1SendStatus,
	d1SetFacilities,
	d1SetForecastDays,
	d1SetKelurahan,
	d1SetPrefs,
	d1SetProfile,
	d1SetPush,
	d1SetVulnerability,
	d1Shelter,
	d1Subscribers,
	d1UnclaimResident,
	ensureD1Ready,
	seedD1
} from './d1';
import { getD1 } from './env';
import {
	activeEvent,
	addAnnouncement,
	authenticate,
	breachSla,
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

async function broadcast(message: LiveMessage = { type: 'update', at: new Date().toISOString() }) {
	const d1 = await getD1();
	const id = d1 ? await d1RecordLiveEvent(d1, message) : null;
	emit(message, id ?? undefined);
}

async function commit<T>(result: Result<T>, message?: LiveMessage): Promise<Result<T>> {
	if (result.ok) await broadcast(message ?? { type: 'update', at: new Date().toISOString() });
	return result;
}

export async function storageBackend(): Promise<'d1' | 'memory'> {
	const d1 = await getD1();
	if (!d1) return 'memory';
	await ensureD1Ready(d1);
	return 'd1';
}

export async function getUser(id: string | null): Promise<PublicUser | null> {
	if (!id) return null;
	const d1 = await getD1();
	if (d1) return d1GetUser(d1, id);
	const user = state().users.find((item) => item.id === id);
	return user ? toPublic(user) : null;
}

export async function fullUser(id: string): Promise<User | null> {
	const d1 = await getD1();
	if (d1) return d1FullUser(d1, id);
	return state().users.find((item) => item.id === id) ?? null;
}

export async function login(phone: string, password: string): Promise<Result<User>> {
	const d1 = await getD1();
	if (d1) return d1Login(d1, phone, password);
	return authenticate(state(), phone, password);
}

export async function register(input: {
	fullName: string;
	phone: string;
	password: string;
	role: Role;
}): Promise<Result<User>> {
	const d1 = await getD1();
	const result = d1 ? await d1Register(d1, input) : registerUser(state(), input);
	return commit(result);
}

export async function setKelurahan(userId: string, kelurahanId: string): Promise<Result<User>> {
	const d1 = await getD1();
	const result = d1 ? await d1SetKelurahan(d1, userId, kelurahanId) : saveKelurahan(state(), userId, kelurahanId);
	return commit(result);
}

export async function setVulnerability(
	userId: string,
	input: { lansia: boolean; disabilitas: boolean; bayi: boolean; consent: boolean },
	skip: boolean
): Promise<Result<User>> {
	const d1 = await getD1();
	const result = d1
		? await d1SetVulnerability(d1, userId, input, skip)
		: saveVulnerability(state(), userId, input, skip);
	return commit(result);
}

export async function setPrefs(
	userId: string,
	input: { notifyEnabled: boolean; locationOnConfirm: boolean }
): Promise<Result<User>> {
	const d1 = await getD1();
	const result = d1 ? await d1SetPrefs(d1, userId, input) : savePrefs(state(), userId, input);
	return commit(result);
}

export async function setProfile(
	userId: string,
	input: { rt?: string; rw?: string; address?: string; notifyEnabled?: boolean; locationOnConfirm?: boolean }
): Promise<Result<User>> {
	const d1 = await getD1();
	const result = d1 ? await d1SetProfile(d1, userId, input) : updateProfile(state(), userId, input);
	return commit(result);
}

export async function setPush(userId: string, subscription: User['pushSubscription']): Promise<Result<User>> {
	const d1 = await getD1();
	const result = d1 ? await d1SetPush(d1, userId, subscription) : savePush(state(), userId, subscription);
	return commit(result);
}

export async function removeAccount(userId: string): Promise<Result<true>> {
	const d1 = await getD1();
	const result = d1 ? await d1RemoveAccount(d1, userId) : deleteAccount(state(), userId);
	return commit(result);
}

export async function currentAlert(kelurahanId: string | null): Promise<AlertEvent | null> {
	const d1 = await getD1();
	if (d1) return d1CurrentAlert(d1, kelurahanId);
	return activeEvent(state(), kelurahanId);
}

export async function history(kelurahanId: string): Promise<AlertEvent[]> {
	const d1 = await getD1();
	if (d1) return d1History(d1, kelurahanId);
	return eventsFor(state(), kelurahanId);
}

export async function getEvent(id: string): Promise<AlertEvent | null> {
	const d1 = await getD1();
	if (d1) return d1GetEvent(d1, id);
	return state().events.find((item) => item.id === id) ?? null;
}

export async function checkinsFor(eventId: string) {
	const d1 = await getD1();
	if (d1) return d1CheckinsFor(d1, eventId);
	return state().checkins.filter((item) => item.eventId === eventId);
}

export async function myCheckin(eventId: string, userId: string) {
	const d1 = await getD1();
	if (d1) return d1MyCheckin(d1, eventId, userId);
	return state().checkins.find((item) => item.eventId === eventId && item.userId === userId) ?? null;
}

export async function roster(kelurahanId: string): Promise<PublicUser[]> {
	const d1 = await getD1();
	if (d1) return d1Roster(d1, kelurahanId);
	return state()
		.users.filter((item) => item.role === 'warga' && item.kelurahanId === kelurahanId)
		.map(toPublic)
		.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));
}

export async function residentBoard(kelurahanId: string, eventId: string | null) {
	const d1 = await getD1();
	if (d1) return d1ResidentBoard(d1, kelurahanId, eventId);
	const names = new Map(state().users.map((item) => [item.id, item.fullName]));
	const warga = state()
		.users.filter((item) => item.role === 'warga' && item.kelurahanId === kelurahanId)
		.map(toPublic);
	const checkins = eventId ? state().checkins.filter((item) => item.eventId === eventId) : [];
	return sortRows(buildRows(warga, checkins, names));
}

export async function getWilayah(id: string | null | undefined): Promise<Wilayah | null> {
	const d1 = await getD1();
	if (d1) return d1GetWilayah(d1, id);
	return findWilayah(state().wilayah, id);
}

export async function placeLabel(kelurahanId: string | null): Promise<string> {
	const d1 = await getD1();
	if (d1) return d1PlaceLabel(d1, kelurahanId);
	const kel = findWilayah(state().wilayah, kelurahanId);
	return kel ? `Kel. ${kel.altName}` : 'kelurahan Anda';
}

export async function placePath(kelurahanId: string | null): Promise<Wilayah[]> {
	const d1 = await getD1();
	if (d1) return d1PlacePath(d1, kelurahanId);
	return wilayahPath(state().wilayah, kelurahanId);
}

export async function childrenOf(parentId: string | null, level: WilayahLevel, q = ''): Promise<Wilayah[]> {
	const d1 = await getD1();
	if (d1) return d1ChildrenOf(d1, parentId, level, q);
	return listWilayah(state(), parentId, level, q);
}

export async function beginSimulation(
	actorId: string,
	scenario: Extract<Scenario, 'hujan_lebat' | 'gempa_dirasakan'>
): Promise<Result<AlertEvent>> {
	const d1 = await getD1();
	const result = d1 ? await d1BeginSimulation(d1, actorId, scenario) : startSimulation(state(), actorId, scenario);
	if (!result.ok) return result;
	const event = result.data;
	await broadcast({
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

export async function ignoreEvent(actorId: string, eventId: string): Promise<Result<AlertEvent>> {
	const d1 = await getD1();
	const result = d1 ? await d1IgnoreEvent(d1, actorId, eventId) : markIrrelevant(state(), actorId, eventId);
	return commit(result);
}

export async function escalateSlaNow(actorId: string, eventId: string): Promise<Result<AlertEvent>> {
	const d1 = await getD1();
	const result = d1 ? await d1BreachSla(d1, actorId, eventId) : breachSla(state(), actorId, eventId);
	if (!result.ok) return result;
	await broadcast({
		type: 'alert',
		at: new Date().toISOString(),
		title: 'ESKALASI SLA · Panel Kelurahan',
		body: 'Batas respon 15 menit RT terlampaui. Kasus warga rentan & butuh bantuan dinaikkan ke Kelurahan.',
		url: '/kelurahan',
		simulation: result.data.isSimulation
	});
	return result;
}

export async function sendStatus(input: {
	userId: string;
	eventId: string;
	status: 'aman' | 'butuh';
	helpType?: HelpType | null;
	note?: string;
	lat?: number | null;
	lng?: number | null;
	locationLabel?: string;
}) {
	const d1 = await getD1();
	const result = d1 ? await d1SendStatus(d1, input) : respond(state(), input);
	return commit(result);
}

export async function claimResident(actorId: string, eventId: string, residentId: string) {
	const d1 = await getD1();
	const result = d1
		? await d1ClaimResident(d1, actorId, eventId, residentId)
		: claim(state(), actorId, eventId, residentId);
	return commit(result);
}

export async function unclaimResident(actorId: string, eventId: string, residentId: string) {
	const d1 = await getD1();
	const result = d1
		? await d1UnclaimResident(d1, actorId, eventId, residentId)
		: cancelClaim(state(), actorId, eventId, residentId);
	return commit(result);
}

export async function finishCheck(
	actorId: string,
	eventId: string,
	residentId: string,
	status: 'aman' | 'dibantu'
) {
	const d1 = await getD1();
	const result = d1
		? await d1FinishCheck(d1, actorId, eventId, residentId, status)
		: resolveCheck(state(), actorId, eventId, residentId, status);
	return commit(result);
}

export async function facilities(kelurahanId: string): Promise<Facility[]> {
	const d1 = await getD1();
	if (d1) return d1Facilities(d1, kelurahanId);
	return state()
		.facilities.filter((item) => item.kelurahanId === kelurahanId)
		.sort((a, b) => a.distanceM - b.distanceM);
}

export async function setFacilities(kelurahanId: string, items: Facility[]) {
	const d1 = await getD1();
	if (d1) await d1SetFacilities(d1, kelurahanId, items);
	else replaceFacilities(state(), kelurahanId, items);
	await broadcast();
}

export async function shelter(actorId: string, facilityId: string): Promise<Result<Facility>> {
	const d1 = await getD1();
	const result = d1 ? await d1Shelter(d1, actorId, facilityId) : confirmShelter(state(), actorId, facilityId);
	return commit(result);
}

export async function announcementsFor(kelurahanId: string, viewer: PublicUser | null): Promise<Announcement[]> {
	const d1 = await getD1();
	if (d1) return d1AnnouncementsFor(d1, kelurahanId, viewer);
	return state()
		.announcements.filter((item) => item.kelurahanId === kelurahanId)
		.filter((item) => {
			if (!viewer) return false;
			if (viewer.role !== 'warga') return true;
			if (item.audience === 'semua') return true;
			return isVulnerable(viewer.vulnerability);
		});
}

export async function publishAnnouncement(
	actorId: string,
	input: { body: string; audience: Audience }
): Promise<Result<Announcement>> {
	const d1 = await getD1();
	const result = d1 ? await d1PublishAnnouncement(d1, actorId, input) : addAnnouncement(state(), actorId, input);
	if (!result.ok) return result;
	await broadcast({
		type: 'alert',
		at: result.data.createdAt,
		title: 'Pengumuman ketua RT',
		body: result.data.body,
		url: '/beranda',
		simulation: false
	});
	return result;
}

export async function forecast(kelurahanId: string): Promise<ForecastDay[]> {
	const d1 = await getD1();
	if (d1) return d1Forecast(d1, kelurahanId);
	return (
		state().forecasts[kelurahanId]?.days ?? [
			{ label: 'Hari ini', weather: 'Belum ada data', tempC: 0 },
			{ label: 'Besok', weather: 'Belum ada data', tempC: 0 },
			{ label: 'Lusa', weather: 'Belum ada data', tempC: 0 }
		]
	);
}

export async function setForecastDays(kelurahanId: string, days: ForecastDay[]) {
	const d1 = await getD1();
	if (d1) await d1SetForecastDays(d1, kelurahanId, days);
	else saveForecast(state(), kelurahanId, days);
	await broadcast();
}

export async function forecastAge(kelurahanId: string): Promise<string | null> {
	const d1 = await getD1();
	if (d1) return d1ForecastAge(d1, kelurahanId);
	return state().forecasts[kelurahanId]?.at ?? null;
}

export async function openExternal(input: Parameters<typeof createExternalAlert>[1]): Promise<AlertEvent | null> {
	const d1 = await getD1();
	const event = d1 ? await d1OpenExternal(d1, input) : createExternalAlert(state(), input);
	if (!event) return null;
	await broadcast({
		type: 'alert',
		at: event.startedAt,
		title: event.title,
		body: `${event.areaLabel}. Ketuk untuk memberi kabar.`,
		url: `/siaga/${event.id}`,
		simulation: false
	});
	return event;
}

export async function restoreDemo() {
	const d1 = await getD1();
	if (d1) await seedD1(d1, true);
	else resetDemo(state());
	await broadcast();
}

export async function kelurahanWithResidents() {
	const d1 = await getD1();
	if (d1) return d1KelurahanWithResidents(d1);
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

export async function subscribers(kelurahanId: string): Promise<User[]> {
	const d1 = await getD1();
	if (d1) return d1Subscribers(d1, kelurahanId);
	return state().users.filter(
		(item) => item.kelurahanId === kelurahanId && item.notifyEnabled && item.pushSubscription
	);
}

export async function latestLiveEventId(): Promise<number> {
	const d1 = await getD1();
	if (!d1) return 0;
	return d1LatestLiveEventId(d1);
}

export async function liveEventsAfter(afterId: number) {
	const d1 = await getD1();
	if (!d1) return [];
	return d1LiveEventsAfter(d1, afterId);
}

export async function ensureFacilities(kelurahanId: string) {
	const { fetchFacilitiesNear, hasApiKey } = await import('./providers');
	const current = await facilities(kelurahanId);
	if (!hasApiKey() || current.some((item) => item.source === 'api')) return current;
	const kelurahan = await getWilayah(kelurahanId);
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
		await setFacilities(kelurahanId, live);
	} catch {
		return current;
	}
	return facilities(kelurahanId);
}

export async function ensureForecast(kelurahanId: string) {
	const { fetchForecast, hasApiKey } = await import('./providers');
	const cachedAt = await forecastAge(kelurahanId);
	const fresh = cachedAt ? Date.now() - new Date(cachedAt).getTime() < 6 * 60 * 60 * 1000 : false;
	if (!hasApiKey() || fresh) return forecast(kelurahanId);
	const kelurahan = await getWilayah(kelurahanId);
	if (!kelurahan) return forecast(kelurahanId);
	try {
		const days = await fetchForecast(kelurahan.id);
		if (days?.length) await setForecastDays(kelurahanId, days);
	} catch {
		return forecast(kelurahanId);
	}
	return forecast(kelurahanId);
}
