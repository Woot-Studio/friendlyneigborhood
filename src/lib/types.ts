export type Role = 'warga' | 'rt' | 'relawan';
export type SetupStep = 'wilayah' | 'kerentanan' | 'izin' | 'done';
export type WilayahLevel = 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan';
export type CheckStatus = 'belum' | 'aman' | 'butuh' | 'dicek' | 'dibantu';
export type HelpType = 'evakuasi' | 'medis' | 'logistik' | 'lainnya';
export type FacilityKind = 'puskesmas' | 'polisi' | 'pemadam_kebakaran' | 'spbu' | 'calon_posko';
export type Audience = 'semua' | 'rentan';
export type Scenario = 'hujan_lebat' | 'gempa_dirasakan' | 'cuaca' | 'gempa';

export interface Wilayah {
	id: string;
	parentId: string | null;
	level: WilayahLevel;
	name: string;
	altName: string;
	lat: number | null;
	lng: number | null;
}

export interface Vulnerability {
	lansia: boolean;
	disabilitas: boolean;
	bayi: boolean;
	consent: boolean;
	consentAt: string | null;
}

export interface PushSub {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export interface User {
	id: string;
	fullName: string;
	phone: string;
	passwordHash: string;
	role: Role;
	setupStep: SetupStep;
	kelurahanId: string | null;
	rt: string;
	rw: string;
	address: string;
	lat: number | null;
	lng: number | null;
	notifyEnabled: boolean;
	locationOnConfirm: boolean;
	pushSubscription: PushSub | null;
	vulnerability: Vulnerability | null;
	lastStatus: CheckStatus | null;
	lastStatusAt: string | null;
	createdAt: string;
}

export type PublicUser = Omit<User, 'passwordHash' | 'pushSubscription'>;

export interface AlertEvent {
	id: string;
	kelurahanId: string;
	kind: 'cuaca' | 'gempa' | 'simulasi';
	scenario: Scenario;
	title: string;
	headline: string;
	areaLabel: string;
	coverageNote: string;
	sourceLabel: string;
	isSimulation: boolean;
	relevant: boolean;
	startedAt: string;
	endedAt: string | null;
	externalId: string | null;
}

export interface Checkin {
	id: string;
	eventId: string;
	userId: string;
	status: CheckStatus;
	priorStatus: CheckStatus | null;
	helpType: HelpType | null;
	note: string;
	lat: number | null;
	lng: number | null;
	locationLabel: string;
	claimedBy: string | null;
	claimedAt: string | null;
	updatedAt: string;
}

export interface Facility {
	id: string;
	kelurahanId: string;
	externalId: string;
	kind: FacilityKind;
	name: string;
	lat: number;
	lng: number;
	distanceM: number;
	shelterConfirmed: boolean;
	confirmedBy: string | null;
	confirmedAt: string | null;
	source: 'fixture' | 'api';
}

export interface Announcement {
	id: string;
	kelurahanId: string;
	authorId: string;
	body: string;
	audience: Audience;
	createdAt: string;
}

export interface ForecastDay {
	label: string;
	weather: string;
	tempC: number;
}

export interface AppState {
	version: number;
	users: User[];
	events: AlertEvent[];
	checkins: Checkin[];
	facilities: Facility[];
	announcements: Announcement[];
	wilayah: Wilayah[];
	seenKeys: string[];
	forecasts: Record<string, { at: string; days: ForecastDay[] }>;
}

export interface ResidentRow {
	userId: string;
	name: string;
	initials: string;
	phone: string;
	address: string;
	rt: string;
	rw: string;
	lat: number | null;
	lng: number | null;
	vulnerability: Vulnerability | null;
	vulnerable: boolean;
	vulnLabels: string[];
	status: CheckStatus;
	helpType: HelpType | null;
	note: string;
	locationLabel: string;
	claimedBy: string | null;
	claimedByShort: string | null;
	claimedAt: string | null;
	updatedAt: string | null;
}

export interface Counts {
	total: number;
	aman: number;
	butuh: number;
	belum: number;
	dicek: number;
	rentanBelum: number;
}

export interface RtBreakdown extends Counts {
	rt: string;
	rw: string;
}

export interface Aggregate {
	is_simulation: boolean;
	scenario: Scenario | 'tidak_ada';
	warga_terdaftar: number;
	aman: number;
	butuh_bantuan: number;
	belum_merespons: number;
	sedang_dicek: number;
	rentan_belum_merespons: number;
	calon_posko_menunggu: number;
}

export interface LiveMessage {
	type: 'update' | 'alert';
	at: string;
	title?: string;
	body?: string;
	url?: string;
	simulation?: boolean;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
