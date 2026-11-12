import type {
	Aggregate,
	AlertEvent,
	Checkin,
	CheckStatus,
	Counts,
	FacilityKind,
	ForecastDay,
	HelpType,
	PublicUser,
	ResidentRow,
	RtBreakdown,
	Scenario,
	Vulnerability,
	Wilayah
} from './types';

export const SLA_MINUTES = 15;

export const AGGREGATE_KEYS = [
	'is_simulation',
	'scenario',
	'warga_terdaftar',
	'aman',
	'butuh_bantuan',
	'belum_merespons',
	'sedang_dicek',
	'rentan_belum_merespons',
	'calon_posko_menunggu'
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function normalizePhone(raw: string): string {
	let digits = raw.replace(/\D/g, '');
	if (digits.startsWith('62')) digits = `0${digits.slice(2)}`;
	return digits;
}

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function shortName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length <= 1) return parts[0] ?? '';
	return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function formatWib(iso: string): string {
	const date = new Date(iso);
	const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	const hh = String(wib.getUTCHours()).padStart(2, '0');
	const mm = String(wib.getUTCMinutes()).padStart(2, '0');
	return `${wib.getUTCDate()} ${MONTHS[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${hh}.${mm} WIB`;
}

export function formatDistance(meters: number): string {
	if (meters < 1000) return `${Math.round(meters)} m`;
	return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function durationLabel(startIso: string, endIso: string | null): string {
	if (!endIso) return 'Masih berlangsung';
	const minutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (hours && rest) return `${hours} jam ${rest} menit`;
	if (hours) return `${hours} jam`;
	return `${rest} menit`;
}

export function isVulnerable(v: Vulnerability | null | undefined): boolean {
	return Boolean(v && (v.lansia || v.disabilitas || v.bayi) && v.consent);
}

export function vulnLabels(v: Vulnerability | null | undefined): string[] {
	if (!isVulnerable(v) || !v) return [];
	const labels: string[] = [];
	if (v.lansia) labels.push('Lansia');
	if (v.disabilitas) labels.push('Disabilitas');
	if (v.bayi) labels.push('Punya bayi');
	return labels;
}

export function statusLabel(status: CheckStatus): string {
	switch (status) {
		case 'aman':
			return 'Aman';
		case 'butuh':
			return 'Butuh bantuan';
		case 'dicek':
			return 'Sedang dicek';
		case 'dibantu':
			return 'Sudah dibantu';
		default:
			return 'Belum merespons';
	}
}

export function helpLabel(help: HelpType): string {
	switch (help) {
		case 'evakuasi':
			return 'Evakuasi';
		case 'medis':
			return 'Medis';
		case 'logistik':
			return 'Air atau makanan';
		default:
			return 'Lainnya';
	}
}

export function facilityKindLabel(kind: FacilityKind): string {
	switch (kind) {
		case 'puskesmas':
			return 'Pelayanan kesehatan';
		case 'polisi':
			return 'Kepolisian';
		case 'pemadam_kebakaran':
			return 'Pemadam kebakaran';
		case 'spbu':
			return 'SPBU';
		default:
			return 'Calon posko';
	}
}

export function scenarioLabel(scenario: Scenario): string {
	switch (scenario) {
		case 'hujan_lebat':
			return 'peringatan dini hujan lebat tingkat provinsi';
		case 'gempa_dirasakan':
			return 'gempa dirasakan';
		case 'cuaca':
			return 'peringatan dini cuaca';
		default:
			return 'gempa';
	}
}

export function wilayahTitle(w: Wilayah): string {
	if (w.level === 'kelurahan') return `Kel. ${w.altName || w.name}`;
	if (w.level === 'kecamatan') return `Kec. ${w.altName || w.name}`;
	return w.altName || w.name;
}

export function roleLabel(role: PublicUser['role']): string {
	if (role === 'rt') return 'Ketua RT';
	if (role === 'relawan') return 'Relawan';
	return 'Warga';
}

function countsAsAman(status: CheckStatus): boolean {
	return status === 'aman' || status === 'dibantu';
}

function countsAsButuh(status: CheckStatus, helpType: HelpType | null): boolean {
	return status === 'butuh' || (status === 'dicek' && Boolean(helpType));
}

function countsAsBelum(status: CheckStatus, helpType: HelpType | null): boolean {
	return status === 'belum' || (status === 'dicek' && !helpType);
}

export function buildRows(
	warga: PublicUser[],
	checkins: Checkin[],
	names: Map<string, string>
): ResidentRow[] {
	return warga.map((user) => {
		const checkin = checkins.find((item) => item.userId === user.id);
		const status = checkin?.status ?? 'belum';
		const claimer = checkin?.claimedBy ? names.get(checkin.claimedBy) : null;
		return {
			userId: user.id,
			name: user.fullName,
			initials: initials(user.fullName),
			phone: user.phone,
			address: user.address,
			rt: user.rt,
			rw: user.rw,
			lat: checkin?.lat ?? user.lat,
			lng: checkin?.lng ?? user.lng,
			vulnerability: user.vulnerability,
			vulnerable: isVulnerable(user.vulnerability),
			vulnLabels: vulnLabels(user.vulnerability),
			status,
			helpType: checkin?.helpType ?? null,
			note: checkin?.note ?? '',
			locationLabel: checkin?.locationLabel ?? '',
			claimedBy: checkin?.claimedBy ?? null,
			claimedByShort: claimer ? shortName(claimer) : null,
			claimedAt: checkin?.claimedAt ?? null,
			updatedAt: checkin?.updatedAt ?? null
		};
	});
}

function vulnRank(row: ResidentRow): number {
	if (row.vulnerability?.lansia) return 0;
	if (row.vulnerability?.disabilitas) return 1;
	if (row.vulnerability?.bayi) return 2;
	return 3;
}

function rank(row: ResidentRow): number {
	const open = row.status === 'belum' || (row.status === 'dicek' && !row.helpType);
	if (row.vulnerable && open) return 0;
	if (countsAsButuh(row.status, row.helpType)) return 1;
	if (countsAsBelum(row.status, row.helpType)) return 2;
	return 3;
}

export function sortRows(rows: ResidentRow[]): ResidentRow[] {
	return [...rows].sort((a, b) => {
		const byRank = rank(a) - rank(b);
		if (byRank) return byRank;
		if (rank(a) === 0) {
			const belumFirst = Number(a.status !== 'belum') - Number(b.status !== 'belum');
			if (belumFirst) return belumFirst;
			const byVuln = vulnRank(a) - vulnRank(b);
			if (byVuln) return byVuln;
		}
		return a.name.localeCompare(b.name, 'id');
	});
}

export function countRows(rows: ResidentRow[]): Counts {
	const counts: Counts = { total: rows.length, aman: 0, butuh: 0, belum: 0, dicek: 0, rentanBelum: 0 };
	for (const row of rows) {
		if (countsAsAman(row.status)) counts.aman += 1;
		else if (countsAsButuh(row.status, row.helpType)) counts.butuh += 1;
		else counts.belum += 1;
		if (row.status === 'dicek') counts.dicek += 1;
		if (row.vulnerable && countsAsBelum(row.status, row.helpType)) counts.rentanBelum += 1;
	}
	return counts;
}

export function buildAggregate(
	rows: ResidentRow[],
	event: AlertEvent | null,
	pendingShelters: number
): Aggregate {
	const counts = countRows(rows);
	return {
		is_simulation: Boolean(event?.isSimulation),
		scenario: event?.scenario ?? 'tidak_ada',
		warga_terdaftar: counts.total,
		aman: counts.aman,
		butuh_bantuan: counts.butuh,
		belum_merespons: counts.belum,
		sedang_dicek: counts.dicek,
		rentan_belum_merespons: counts.rentanBelum,
		calon_posko_menunggu: pendingShelters
	};
}

export function templateSummary(agg: Aggregate, place: string, scenarioText: string): string {
	const intro = agg.is_simulation
		? `Simulasi siaga sedang berjalan di ${place} dengan skenario ${scenarioText}.`
		: agg.scenario === 'tidak_ada'
			? `Tidak ada siaga aktif di ${place}.`
			: `Siaga sedang berjalan di ${place} dengan skenario ${scenarioText}.`;
	const checked =
		agg.sedang_dicek > 0
			? ` ${agg.sedang_dicek} rumah sedang dicek relawan.`
			: '';
	return [
		intro,
		`${agg.warga_terdaftar} warga terdaftar: ${agg.aman} aman, ${agg.butuh_bantuan} butuh bantuan, ${agg.belum_merespons} belum merespons.${checked}`,
		`${agg.rentan_belum_merespons} dari ${agg.belum_merespons} warga yang belum merespons termasuk kelompok rentan. Mereka ditampilkan di urutan atas dasbor.`,
		`${agg.calon_posko_menunggu} calon posko menunggu konfirmasi petugas.`
	].join('\n\n');
}

export function llmMessages(agg: Aggregate): { role: 'system' | 'user'; content: string }[] {
	return [
		{
			role: 'system',
			content:
				'Anda merangkum angka kesiapsiagaan bencana. Gunakan hanya angka pada JSON. Jangan menyebut nama orang, alamat, koordinat, kelurahan, atau kerentanan per orang. Tulis 3 kalimat bahasa Indonesia, tenang, tanpa emoji.'
		},
		{ role: 'user', content: JSON.stringify(agg) }
	];
}

export function firstResponseMinutes(event: AlertEvent, checkins: Checkin[]): number | null {
	const times = checkins
		.filter((item) => item.status !== 'belum' || item.claimedAt)
		.map((item) => new Date(item.updatedAt).getTime());
	if (!times.length) return null;
	const start = new Date(event.startedAt).getTime();
	return Math.max(0, Math.round((Math.min(...times) - start) / 60000));
}

export function homesChecked(checkins: Checkin[]): number {
	return checkins.filter((item) => item.claimedBy).length;
}

export function forecastBlurb(days: ForecastDay[]): string {
	const today = days[0];
	if (!today) return 'Prakiraan belum tersedia.';
	return `${today.weather} · Suhu ${today.tempC}°C, untuk hari ini`;
}

export function eventPhase(event: AlertEvent): 'berjalan' | 'selesai' | 'tidak_relevan' {
	if (!event.relevant) return 'tidak_relevan';
	if (!event.endedAt) return 'berjalan';
	return 'selesai';
}

export function phaseLabel(phase: ReturnType<typeof eventPhase>): string {
	if (phase === 'berjalan') return 'Sedang berjalan';
	if (phase === 'tidak_relevan') return 'Tidak relevan';
	return 'Selesai';
}

export function elapsedMinutes(startedAt: string, nowMs = Date.now()): number {
	return Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 60000));
}

export function slaState(event: AlertEvent | null, rows: ResidentRow[], nowMs = Date.now()) {
	const active = Boolean(event && event.relevant && !event.endedAt);
	const elapsedMin = active && event ? elapsedMinutes(event.startedAt, nowMs) : 0;
	const remainingMin = Math.max(0, SLA_MINUTES - elapsedMin);
	const breached = active && elapsedMin >= SLA_MINUTES;
	// Kandidat eskalasi: warga butuh bantuan atau warga rentan belum merespons yang belum diklaim ('dicek') relawan RT
	const pendingCritical = rows.filter(
		(row) => row.status === 'butuh' || (row.status === 'belum' && row.vulnerable)
	);
	return {
		active,
		elapsedMin,
		remainingMin,
		breached,
		pendingCritical,
		escalated: breached ? pendingCritical : []
	};
}

export function groupByRt(rows: ResidentRow[]): RtBreakdown[] {
	const buckets = new Map<string, ResidentRow[]>();
	for (const row of rows) {
		const rt = row.rt || '00';
		const rw = row.rw || '00';
		const key = `${rt}:${rw}`;
		const list = buckets.get(key) ?? [];
		list.push(row);
		buckets.set(key, list);
	}
	return [...buckets.entries()]
		.map(([key, items]) => {
			const [rt, rw] = key.split(':');
			return { rt, rw, ...countRows(items) };
		})
		.sort((a, b) => b.rentanBelum + b.butuh - (a.rentanBelum + a.butuh) || a.rt.localeCompare(b.rt, 'id'));
}
