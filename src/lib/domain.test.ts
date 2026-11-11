import { describe, expect, test } from 'bun:test';
import {
	AGGREGATE_KEYS,
	buildAggregate,
	buildRows,
	countRows,
	formatWib,
	llmMessages,
	sortRows,
	templateSummary
} from './domain';
import type { PublicUser, ResidentRow, Vulnerability } from './types';

function vuln(partial: Partial<Vulnerability>): Vulnerability {
	return {
		lansia: false,
		disabilitas: false,
		bayi: false,
		consent: true,
		consentAt: '2026-11-01T00:00:00.000Z',
		...partial
	};
}

function user(id: string, name: string, vulnerability: Vulnerability | null): PublicUser {
	return {
		id,
		fullName: name,
		phone: '081200000000',
		role: 'warga',
		setupStep: 'done',
		kelurahanId: '31.73.04.1001',
		rt: '05',
		rw: '03',
		address: `Jl. Contoh ${name}`,
		lat: -6.17,
		lng: 106.79,
		notifyEnabled: true,
		locationOnConfirm: true,
		vulnerability,
		lastStatus: 'aman',
		lastStatusAt: '2026-11-10T12:40:00.000Z',
		createdAt: '2026-10-01T00:00:00.000Z'
	};
}

const people = [
	user('hartono', 'Hartono Wijaya', vuln({ lansia: true })),
	user('joko', 'Joko Susilo', vuln({ lansia: true })),
	user('nur', 'Nur Aisyah', vuln({ disabilitas: true })),
	user('sari', 'Sari Lestari', vuln({ bayi: true })),
	user('agus', 'Agus Pratama', null)
];

describe('format dan urutan dasbor', () => {
	test('memformat waktu WIB', () => {
		expect(formatWib('2026-11-11T14:50:00.000Z')).toBe('11 Nov 2026, 21.50 WIB');
	});

	test('lansia yang belum merespons ada di urutan teratas', () => {
		const rows = sortRows(buildRows(people, [], new Map()));
		expect(rows.map((row) => row.userId)).toEqual(['hartono', 'joko', 'nur', 'sari', 'agus']);
		expect(rows[0].vulnLabels).toEqual(['Lansia']);
		expect(rows[0].status).toBe('belum');
	});

	test('setelah diklaim status menjadi sedang dicek dan tetap di kelompok prioritas', () => {
		const rows = buildRows(
			people,
			[
				{
					id: 'c1',
					eventId: 'e1',
					userId: 'nur',
					status: 'dicek',
					priorStatus: 'belum',
					helpType: null,
					note: '',
					lat: null,
					lng: null,
					locationLabel: '',
					claimedBy: 'dina',
					claimedAt: '2026-11-11T15:14:00.000Z',
					updatedAt: '2026-11-11T15:14:00.000Z'
				}
			],
			new Map([['dina', 'Dina Rahmawati']])
		);
		const sorted = sortRows(rows);
		expect(sorted.find((row) => row.userId === 'nur')?.claimedByShort).toBe('Dina R.');
		expect(sorted.map((row) => row.userId).slice(0, 4)).toEqual(['hartono', 'joko', 'sari', 'nur']);
		const counts = countRows(sorted);
		expect(counts.belum).toBe(5);
		expect(counts.dicek).toBe(1);
	});
});

describe('ringkasan AI hanya angka agregat', () => {
	test('payload tidak memuat nama, alamat, lokasi, atau kerentanan individu', () => {
		const rows: ResidentRow[] = sortRows(buildRows(people, [], new Map()));
		const agg = buildAggregate(rows, null, 2);
		const payload = JSON.parse(llmMessages(agg)[1].content) as Record<string, unknown>;
		expect(Object.keys(payload).sort()).toEqual([...AGGREGATE_KEYS].sort());
		const blob = JSON.stringify(llmMessages(agg));
		for (const secret of ['Sari', 'Hartono', 'Nur', 'Joko', 'Agus', 'Tomang', 'Jl.', 'lansia', '-6.']) {
			expect(blob.includes(secret)).toBe(false);
		}
		expect(agg.warga_terdaftar).toBe(5);
		expect(agg.rentan_belum_merespons).toBe(4);
		const text = templateSummary(agg, 'Kel. Tomang', 'peringatan dini hujan lebat tingkat provinsi');
		expect(text).toContain('Kel. Tomang');
		expect(text).not.toContain('Sari');
	});
});
