import { randomUUID } from 'node:crypto';
import type { Facility, FacilityKind, ForecastDay, Wilayah } from '#lib/types';

const BASE = 'https://use.apiindonesia.id';

export interface NowcastWarning {
	id: string;
	headline: string;
	area: string;
	province: string;
	event: string;
	description: string;
}

export interface Autogempa {
	DateTime: string;
	Magnitude: string;
	Wilayah: string;
	Dirasakan: string;
	Potensi: string;
	Jam: string;
	Tanggal: string;
	Coordinates: string;
}

interface ApiList<T> {
	data?: T;
}

export function hasApiKey() {
	return Boolean(process.env.API_INDONESIA_KEY);
}

export async function apiGet<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
	const key = process.env.API_INDONESIA_KEY;
	if (!key) throw new Error('API_INDONESIA_KEY belum diisi');
	const url = new URL(path, BASE);
	for (const [name, value] of Object.entries(query ?? {})) {
		if (value != null && value !== '') url.searchParams.set(name, String(value));
	}
	const response = await fetch(url, { headers: { 'x-api-key': key, accept: 'application/json' } });
	if (!response.ok) {
		throw new Error(`API Indonesia ${response.status} pada ${path}`);
	}
	return (await response.json()) as T;
}

export async function fetchWarnings(province: string): Promise<NowcastWarning[]> {
	if (!hasApiKey()) return [];
	const payload = await apiGet<ApiList<NowcastWarning[]>>('/api/v1/peringatan-dini', { provinsi: province });
	return payload.data ?? [];
}

export async function fetchAutogempa(): Promise<Autogempa | null> {
	const response = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', {
		headers: { accept: 'application/json' }
	});
	if (!response.ok) throw new Error('Umpan gempa BMKG tidak terjangkau');
	const payload = (await response.json()) as { Infogempa?: { gempa?: Autogempa } };
	return payload.Infogempa?.gempa ?? null;
}

interface CuacaRow {
	local_datetime?: string;
	datetime?: string;
	weather_desc?: string;
	weather?: string;
	temperature_c?: number;
}

export async function fetchForecast(adm4: string): Promise<ForecastDay[] | null> {
	if (!hasApiKey()) return null;
	const payload = await apiGet<ApiList<CuacaRow[]>>('/api/v1/cuaca', { adm4 });
	const rows = payload.data ?? [];
	if (!rows.length) return null;
	return summarizeForecast(rows);
}

export function summarizeForecast(rows: CuacaRow[]): ForecastDay[] {
	const byDay = new Map<string, CuacaRow>();
	for (const row of rows) {
		const raw = row.local_datetime || row.datetime;
		if (!raw) continue;
		const day = raw.slice(0, 10);
		const hour = Number(raw.slice(11, 13));
		const current = byDay.get(day);
		const currentHour = current ? Number((current.local_datetime || current.datetime || '').slice(11, 13)) : 99;
		if (!current || Math.abs(hour - 12) < Math.abs(currentHour - 12)) byDay.set(day, row);
	}
	const labels = ['Hari ini', 'Besok', 'Lusa'];
	return [...byDay.values()].slice(0, 3).map((row, index) => ({
		label: labels[index] ?? `Hari ${index + 1}`,
		weather: row.weather_desc || row.weather || 'Tidak diketahui',
		tempC: Math.round(row.temperature_c ?? 0)
	}));
}

interface FacilityRow {
	id: string;
	kategori: string;
	nama: string;
	lat: number | null;
	lng: number | null;
	distance_m?: number;
}

const KINDS: FacilityKind[] = ['puskesmas', 'polisi', 'pemadam_kebakaran', 'spbu'];

export async function fetchFacilitiesNear(kelurahan: Wilayah): Promise<Facility[] | null> {
	if (!hasApiKey() || kelurahan.lat == null || kelurahan.lng == null) return null;
	const collected: Facility[] = [];
	for (const kind of KINDS) {
		const payload = await apiGet<ApiList<FacilityRow[]>>('/api/v1/fasilitas/nearby', {
			lat: kelurahan.lat,
			lng: kelurahan.lng,
			radius: 5000,
			limit: 5,
			kategori: kind
		});
		for (const row of payload.data ?? []) {
			if (row.lat == null || row.lng == null) continue;
			collected.push(toFacility(kelurahan.id, row, kind));
		}
	}
	const worship = await apiGet<ApiList<FacilityRow[]>>('/api/v1/fasilitas/nearby', {
		lat: kelurahan.lat,
		lng: kelurahan.lng,
		radius: 3000,
		limit: 6,
		kategori: 'ibadah'
	});
	for (const row of worship.data ?? []) {
		if (row.lat == null || row.lng == null) continue;
		collected.push(toFacility(kelurahan.id, row, 'calon_posko'));
	}
	return collected;
}

function toFacility(kelurahanId: string, row: FacilityRow, kind: FacilityKind): Facility {
	return {
		id: randomUUID(),
		kelurahanId,
		externalId: row.id,
		kind,
		name: row.nama,
		lat: row.lat ?? 0,
		lng: row.lng ?? 0,
		distanceM: Math.round(row.distance_m ?? 0),
		shelterConfirmed: false,
		confirmedBy: null,
		confirmedAt: null,
		source: 'api'
	};
}

export async function fetchWilayahPage(path: string, page: number) {
	return apiGet<ApiList<Array<Record<string, unknown>>> & { meta?: { total_pages?: number } }>(path, {
		page,
		per_page: 100
	});
}
