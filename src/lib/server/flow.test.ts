import { describe, expect, test } from 'bun:test';
import { buildRows, sortRows } from '../domain';
import { claim, resolveCheck, startSimulation } from './logic';
import { toPublic } from './memory';
import { IDS, seedState } from './seed';

describe('skrip demo simulasi', () => {
	test('lansia di urutan atas, lalu sedang dicek, lalu aman', () => {
		const state = seedState();
		const started = startSimulation(state, IDS.dina, 'hujan_lebat');
		expect(started.ok).toBe(true);
		if (!started.ok) return;
		const warga = state.users.filter((item) => item.role === 'warga').map(toPublic);
		const names = new Map(state.users.map((item) => [item.id, item.fullName]));
		const rows = sortRows(
			buildRows(
				warga,
				state.checkins.filter((item) => item.eventId === started.data.id),
				names
			)
		);
		expect(rows[0].userId).toBe(IDS.hartono);
		expect(rows[0].status).toBe('belum');
		expect(rows[0].vulnLabels).toContain('Lansia');

		const claimed = claim(state, IDS.rudi, started.data.id, IDS.hartono);
		expect(claimed.ok).toBe(true);
		if (!claimed.ok) return;
		expect(claimed.data.status).toBe('dicek');
		expect(claimed.data.claimedBy).toBe(IDS.rudi);

		const resolved = resolveCheck(state, IDS.rudi, started.data.id, IDS.hartono, 'aman');
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.status).toBe('aman');
	});

	test('simulasi tidak memanggil jaringan', async () => {
		const state = seedState();
		const calls: string[] = [];
		const original = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			calls.push(String(input));
			return new Response('{}');
		}) as typeof fetch;
		try {
			startSimulation(state, IDS.dina, 'gempa_dirasakan');
		} finally {
			globalThis.fetch = original;
		}
		expect(calls).toEqual([]);
		expect(state.events[0].isSimulation).toBe(true);
	});
});
