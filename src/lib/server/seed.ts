import type { Announcement, AppState, Checkin, Facility, User } from '../types';
import { hashPassword } from './passwords';
import { SEED_VERSION, TOMANG_ID, wilayah } from './wilayah-data';

export const DEMO_PASSWORD = 'demo1234';

export const IDS = {
	sari: '11111111-1111-4111-8111-111111111101',
	hartono: '11111111-1111-4111-8111-111111111102',
	nur: '11111111-1111-4111-8111-111111111103',
	joko: '11111111-1111-4111-8111-111111111104',
	agus: '11111111-1111-4111-8111-111111111105',
	rina: '11111111-1111-4111-8111-111111111106',
	budi: '11111111-1111-4111-8111-111111111107',
	maya: '11111111-1111-4111-8111-111111111108',
	dina: '11111111-1111-4111-8111-111111111201',
	rudi: '11111111-1111-4111-8111-111111111202',
	hujan: '22222222-2222-4222-8222-222222222201',
	gempa: '22222222-2222-4222-8222-222222222202'
} as const;

const DEMO_HASH = hashPassword(DEMO_PASSWORD, 'fn-demo-salt-01');

function user(partial: Pick<User, 'id' | 'fullName' | 'phone' | 'role'> & Partial<User>): User {
	return {
		passwordHash: DEMO_HASH,
		setupStep: 'done',
		kelurahanId: TOMANG_ID,
		rt: '05',
		rw: '03',
		address: '',
		lat: null,
		lng: null,
		notifyEnabled: true,
		locationOnConfirm: true,
		pushSubscription: null,
		vulnerability: null,
		lastStatus: null,
		lastStatusAt: null,
		createdAt: '2026-09-01T02:00:00.000Z',
		...partial
	};
}

function consent(flags: { lansia?: boolean; disabilitas?: boolean; bayi?: boolean }) {
	return {
		lansia: Boolean(flags.lansia),
		disabilitas: Boolean(flags.disabilitas),
		bayi: Boolean(flags.bayi),
		consent: true,
		consentAt: '2026-09-02T03:00:00.000Z'
	};
}

function checkin(
	id: string,
	eventId: string,
	userId: string,
	status: Checkin['status'],
	updatedAt: string,
	extra: Partial<Checkin> = {}
): Checkin {
	return {
		id,
		eventId,
		userId,
		status,
		priorStatus: null,
		helpType: null,
		note: '',
		lat: null,
		lng: null,
		locationLabel: '',
		claimedBy: null,
		claimedAt: null,
		updatedAt,
		...extra
	};
}

const facilities: Facility[] = [
	{
		id: '33333333-3333-4333-8333-333333333301',
		kelurahanId: TOMANG_ID,
		externalId: 'pkm-tomang-contoh',
		kind: 'puskesmas',
		name: 'Puskesmas Contoh Tomang',
		lat: -6.169,
		lng: 106.792,
		distanceM: 450,
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'fixture'
	},
	{
		id: '33333333-3333-4333-8333-333333333302',
		kelurahanId: TOMANG_ID,
		externalId: 'polsek-grogol-contoh',
		kind: 'polisi',
		name: 'Kantor Polisi Sektor Contoh Grogol',
		lat: -6.174,
		lng: 106.79,
		distanceM: 800,
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'fixture'
	},
	{
		id: '33333333-3333-4333-8333-333333333303',
		kelurahanId: TOMANG_ID,
		externalId: 'damkar-tomang-contoh',
		kind: 'pemadam_kebakaran',
		name: 'Pos Pemadam Kebakaran Contoh',
		lat: -6.16,
		lng: 106.805,
		distanceM: 1200,
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'fixture'
	},
	{
		id: '33333333-3333-4333-8333-333333333304',
		kelurahanId: TOMANG_ID,
		externalId: 'spbu-tomang-contoh',
		kind: 'spbu',
		name: 'SPBU Contoh Tomang Raya',
		lat: -6.1715,
		lng: 106.804,
		distanceM: 950,
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'fixture'
	},
	{
		id: '33333333-3333-4333-8333-333333333305',
		kelurahanId: TOMANG_ID,
		externalId: 'masjid-hidayah-contoh',
		kind: 'calon_posko',
		name: 'Masjid Contoh Al-Hidayah',
		lat: -6.1688,
		lng: 106.798,
		distanceM: 200,
		shelterConfirmed: true,
		confirmedBy: IDS.dina,
		confirmedAt: '2026-11-03T10:20:00.000Z',
		source: 'fixture'
	},
	{
		id: '33333333-3333-4333-8333-333333333306',
		kelurahanId: TOMANG_ID,
		externalId: 'gereja-yosef-contoh',
		kind: 'calon_posko',
		name: 'Gereja Contoh Santo Yosef',
		lat: -6.173,
		lng: 106.802,
		distanceM: 600,
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'fixture'
	},
	{
		id: '33333333-3333-4333-8333-333333333307',
		kelurahanId: TOMANG_ID,
		externalId: 'vihara-dharma-contoh',
		kind: 'calon_posko',
		name: 'Vihara Contoh Dharma Bakti',
		lat: -6.162,
		lng: 106.7905,
		distanceM: 1100,
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'fixture'
	}
];

const announcements: Announcement[] = [];

export function seedState(): AppState {
	const users: User[] = [
		user({
			id: IDS.sari,
			fullName: 'Sari Lestari',
			phone: '081234567890',
			role: 'warga',
			address: 'Jl. Contoh Tomang Raya No. 8',
			lat: -6.1702,
			lng: 106.7988,
			vulnerability: consent({ bayi: true }),
			lastStatus: 'aman',
			lastStatusAt: '2026-11-10T12:40:00.000Z'
		}),
		user({
			id: IDS.hartono,
			fullName: 'Hartono Wijaya',
			phone: '081211110001',
			role: 'warga',
			address: 'Jl. Contoh Tomang IV No. 12',
			lat: -6.1672,
			lng: 106.799,
			vulnerability: consent({ lansia: true })
		}),
		user({
			id: IDS.nur,
			fullName: 'Nur Aisyah',
			phone: '081211110002',
			role: 'warga',
			rt: '03',
			address: 'Jl. Contoh Prof. Tabrani No. 5',
			lat: -6.1695,
			lng: 106.7955,
			vulnerability: consent({ disabilitas: true })
		}),
		user({
			id: IDS.joko,
			fullName: 'Joko Susilo',
			phone: '081211110003',
			role: 'warga',
			rt: '01',
			address: 'Jl. Contoh Kemanggisan No. 3',
			lat: -6.1668,
			lng: 106.7948,
			vulnerability: consent({ lansia: true })
		}),
		user({
			id: IDS.agus,
			fullName: 'Agus Pratama',
			phone: '081211110004',
			role: 'warga',
			rt: '03',
			address: 'Jl. Contoh Jend. S. Parman No. 20',
			lat: -6.171,
			lng: 106.801
		}),
		user({
			id: IDS.rina,
			fullName: 'Rina Kusuma',
			phone: '081211110005',
			role: 'warga',
			rt: '03',
			address: 'Jl. Contoh Relasi No. 9',
			lat: -6.168,
			lng: 106.7935
		}),
		user({
			id: IDS.budi,
			fullName: 'Budi Santoso',
			phone: '081211110006',
			role: 'warga',
			address: 'Jl. Contoh Tomang Raya No. 21',
			lat: -6.172,
			lng: 106.7968
		}),
		user({
			id: IDS.maya,
			fullName: 'Maya Anggraini',
			phone: '081211110007',
			role: 'warga',
			rt: '01',
			address: 'Jl. Contoh Tanjung Duren No. 4',
			lat: -6.1658,
			lng: 106.8002
		}),
		user({
			id: IDS.dina,
			fullName: 'Dina Rahmawati',
			phone: '081300000001',
			role: 'rt',
			address: 'Jl. Contoh Pos RT 05',
			lat: -6.1684,
			lng: 106.7964
		}),
		user({
			id: IDS.rudi,
			fullName: 'Rudi Hartanto',
			phone: '081300000002',
			role: 'relawan',
			address: 'Jl. Contoh Relawan No. 2',
			lat: -6.1698,
			lng: 106.7974
		})
	];

	const hujanStart = '2026-11-03T09:20:00.000Z';
	const hujanEnd = '2026-11-03T11:05:00.000Z';
	const gempaStart = '2026-10-10T12:10:00.000Z';
	const gempaEnd = '2026-10-10T13:00:00.000Z';

	const hujanCheckins: Checkin[] = [
		checkin('c-h-sari', IDS.hujan, IDS.sari, 'aman', '2026-11-03T09:22:00.000Z', {
			locationLabel: 'Jl. Contoh Tomang Raya No. 8'
		}),
		checkin('c-h-hartono', IDS.hujan, IDS.hartono, 'aman', '2026-11-03T09:40:00.000Z', {
			claimedBy: IDS.rudi,
			claimedAt: '2026-11-03T09:30:00.000Z',
			priorStatus: 'belum'
		}),
		checkin('c-h-nur', IDS.hujan, IDS.nur, 'aman', '2026-11-03T09:48:00.000Z', {
			claimedBy: IDS.dina,
			claimedAt: '2026-11-03T09:35:00.000Z',
			priorStatus: 'belum'
		}),
		checkin('c-h-joko', IDS.hujan, IDS.joko, 'butuh', '2026-11-03T09:55:00.000Z', {
			helpType: 'medis',
			note: 'Perlu diperiksa tekanan darah.'
		}),
		checkin('c-h-agus', IDS.hujan, IDS.agus, 'aman', '2026-11-03T10:05:00.000Z'),
		checkin('c-h-rina', IDS.hujan, IDS.rina, 'aman', '2026-11-03T10:12:00.000Z'),
		checkin('c-h-budi', IDS.hujan, IDS.budi, 'aman', '2026-11-03T10:20:00.000Z'),
		checkin('c-h-maya', IDS.hujan, IDS.maya, 'belum', hujanStart)
	];

	const gempaCheckins: Checkin[] = users
		.filter((item) => item.role === 'warga')
		.map((item, index) =>
			checkin(`c-g-${index}`, IDS.gempa, item.id, 'aman', '2026-10-10T12:20:00.000Z')
		);

	return {
		version: SEED_VERSION,
		users,
		wilayah,
		facilities,
		announcements,
		seenKeys: [],
		forecasts: {
			[TOMANG_ID]: {
				at: '2026-11-11T00:00:00.000Z',
				days: [
					{ label: 'Hari ini', weather: 'Berawan', tempC: 28 },
					{ label: 'Besok', weather: 'Hujan ringan', tempC: 26 },
					{ label: 'Lusa', weather: 'Cerah berawan', tempC: 29 }
				]
			}
		},
		events: [
			{
				id: IDS.hujan,
				kelurahanId: TOMANG_ID,
				kind: 'cuaca',
				scenario: 'hujan_lebat',
				title: 'Peringatan dini cuaca: hujan lebat',
				headline: 'BMKG mengeluarkan peringatan dini cuaca untuk DKI Jakarta.',
				areaLabel: 'DKI Jakarta',
				coverageNote: 'Tingkat provinsi, DKI Jakarta',
				sourceLabel: 'BMKG melalui API Indonesia',
				isSimulation: false,
				relevant: true,
				startedAt: hujanStart,
				endedAt: hujanEnd,
				externalId: 'contoh-hujan-2026-11-03'
			},
			{
				id: IDS.gempa,
				kelurahanId: TOMANG_ID,
				kind: 'simulasi',
				scenario: 'gempa_dirasakan',
				title: 'Simulasi: gempa dirasakan',
				headline: 'Simulasi: gempa dirasakan untuk DKI Jakarta.',
				areaLabel: 'DKI Jakarta',
				coverageNote: 'Bukan peringatan instan',
				sourceLabel: 'Simulasi oleh Ketua RT, bukan BMKG',
				isSimulation: true,
				relevant: true,
				startedAt: gempaStart,
				endedAt: gempaEnd,
				externalId: null
			}
		],
		checkins: [...hujanCheckins, ...gempaCheckins]
	};
}
