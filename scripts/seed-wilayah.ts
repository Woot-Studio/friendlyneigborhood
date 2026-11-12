/**
 * Impor wilayah Kemendagri sekali ke Cloudflare D1 (default) atau Supabase Postgres.
 * Tanpa API_INDONESIA_KEY, skrip berhenti: fixture Kel. Tomang sudah ada di aplikasi.
 * Endpoint resmi yang dipakai:
 *   GET /api/v1/wilayah/provinsi
 *   GET /api/v1/wilayah/kabupaten
 *   GET /api/v1/wilayah/kecamatan
 *   GET /api/v1/wilayah/kelurahan
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const key = process.env.API_INDONESIA_KEY;
const url = process.env.PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const remoteFlag = process.argv.includes('--remote') ? '--remote' : '--local';

if (!key) {
	console.log('API_INDONESIA_KEY kosong. Impor dilewati. Aplikasi memakai fixture wilayah.');
	process.exit(0);
}

const BASE = 'https://use.apiindonesia.id';

interface Row {
	id?: string;
	code?: string;
	name: string;
	alt_name?: string;
	lat?: number | null;
	lng?: number | null;
	province_id?: string;
	regency_id?: string;
	kabupaten_id?: string;
	kecamatan_id?: string;
	parent_id?: string;
}

async function page(path: string, query: Record<string, string> = {}) {
	const rows: Row[] = [];
	let current = 1;
	let total = 1;
	while (current <= total) {
		const target = new URL(path, BASE);
		target.searchParams.set('page', String(current));
		target.searchParams.set('per_page', '100');
		for (const [name, value] of Object.entries(query)) target.searchParams.set(name, value);
		const response = await fetch(target, { headers: { 'x-api-key': key!, accept: 'application/json' } });
		if (!response.ok) throw new Error(`${response.status} ${path} halaman ${current}`);
		const payload = (await response.json()) as { data?: Row[]; meta?: { total_pages?: number } };
		rows.push(...(payload.data ?? []));
		total = payload.meta?.total_pages ?? 1;
		current += 1;
	}
	return rows;
}

function idOf(row: Row) {
	return String(row.code || row.id || '');
}

function sqlLit(val: string | number | null): string {
	if (val === null || val === undefined) return 'NULL';
	if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
	return `'${String(val).replaceAll("'", "''")}'`;
}

const provinsi = await page('/api/v1/wilayah/provinsi');
const kabupaten = await page('/api/v1/wilayah/kabupaten');
const kecamatan = await page('/api/v1/wilayah/kecamatan');
const kelurahan = await page('/api/v1/wilayah/kelurahan');

const records = [
	...provinsi.map((row) => ({
		id: idOf(row),
		parent_id: null,
		level: 'provinsi',
		name: row.name,
		alt_name: row.alt_name || row.name,
		lat: row.lat ?? null,
		lng: row.lng ?? null
	})),
	...kabupaten.map((row) => ({
		id: idOf(row),
		parent_id: row.province_id || row.parent_id || idOf(row).split('.').slice(0, 1).join('.'),
		level: 'kabupaten',
		name: row.name,
		alt_name: row.alt_name || row.name,
		lat: row.lat ?? null,
		lng: row.lng ?? null
	})),
	...kecamatan.map((row) => ({
		id: idOf(row),
		parent_id: row.kabupaten_id || row.regency_id || row.parent_id || idOf(row).split('.').slice(0, 2).join('.'),
		level: 'kecamatan',
		name: row.name,
		alt_name: row.alt_name || row.name,
		lat: row.lat ?? null,
		lng: row.lng ?? null
	})),
	...kelurahan.map((row) => ({
		id: idOf(row),
		parent_id: row.kecamatan_id || row.parent_id || idOf(row).split('.').slice(0, 3).join('.'),
		level: 'kelurahan',
		name: row.name,
		alt_name: row.alt_name || row.name,
		lat: row.lat ?? null,
		lng: row.lng ?? null
	}))
].filter((row) => row.id);

if (url && service) {
	const admin = createClient(url, service, { auth: { persistSession: false } });
	const chunk = 500;
	for (let index = 0; index < records.length; index += chunk) {
		const slice = records.slice(index, index + chunk);
		const { error } = await admin.from('wilayah').upsert(slice);
		if (error) throw error;
		console.log(`Tersimpan di Supabase ${Math.min(index + chunk, records.length)} / ${records.length}`);
	}
} else {
	const dir = mkdtempSync(join(tmpdir(), 'fn-wilayah-'));
	try {
		const chunk = 1000;
		for (let index = 0; index < records.length; index += chunk) {
			const slice = records.slice(index, index + chunk);
			const values = slice
				.map(
					(r) =>
						`(${sqlLit(r.id)}, ${sqlLit(r.parent_id)}, ${sqlLit(r.level)}, ${sqlLit(r.name)}, ${sqlLit(r.alt_name)}, ${sqlLit(r.lat)}, ${sqlLit(r.lng)})`
				)
				.join(',\n');
			const sqlFile = join(dir, `batch_${index}.sql`);
			writeFileSync(
				sqlFile,
				`INSERT OR REPLACE INTO wilayah (id, parent_id, level, name, alt_name, lat, lng) VALUES\n${values};\n`
			);
			const res = spawnSync('bunx', ['wrangler', 'd1', 'execute', 'DB', remoteFlag, '--file', sqlFile], {
				stdio: 'inherit'
			});
			if (res.status !== 0) throw new Error(`Gagal impor D1 pada batch ${index}`);
			console.log(`Tersimpan di D1 (${remoteFlag}) ${Math.min(index + chunk, records.length)} / ${records.length}`);
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

const requests = Math.ceil(38 / 100) + Math.ceil(514 / 100) + Math.ceil(7285 / 100) + Math.ceil(83762 / 100);
console.log(`Selesai. Perkiraan permintaan pada impor penuh: sekitar ${requests} × Rp2.`);
