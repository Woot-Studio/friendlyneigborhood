import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { buildRows, groupByRt, slaState, sortRows } from '../domain';
import {
	d1BeginSimulation,
	d1BreachSla,
	d1ClaimResident,
	d1FinishCheck,
	d1Login,
	d1ResidentBoard,
	d1SendStatus,
	ensureD1Ready
} from './d1';
import type { D1DatabaseLike, D1PreparedStatementLike } from './env';
import { claim, resolveCheck, startSimulation } from './logic';
import { toPublic } from './memory';
import { DEMO_PASSWORD, IDS, seedState } from './seed';
import { TOMANG_ID } from './wilayah-data';

function createSqliteD1(): D1DatabaseLike {
	const sqlite = new Database(':memory:');

	function makeStmt(sql: string, values: unknown[] = []): D1PreparedStatementLike {
		const normalized = sql.replace(/\?(\d+)/g, (_, idx) => `?${idx}`);
		return {
			bind(...next: unknown[]) {
				return makeStmt(normalized, next);
			},
			async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
				const row = sqlite.query(normalized).get(...(values as never[])) as Record<string, unknown> | null;
				if (!row) return null;
				if (colName) return (row[colName] as T) ?? null;
				return row as T;
			},
			async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
				const rows = sqlite.query(normalized).all(...(values as never[])) as T[];
				return { results: rows };
			},
			async run() {
				const res = sqlite.query(normalized).run(...(values as never[]));
				return {
					success: true,
					meta: {
						changes: res.changes,
						last_row_id: Number(res.lastInsertRowid)
					}
				};
			}
		};
	}

	return {
		prepare(query: string) {
			return makeStmt(query);
		},
		async batch(statements: D1PreparedStatementLike[]) {
			const out: unknown[] = [];
			sqlite.exec('BEGIN');
			try {
				for (const stmt of statements) {
					out.push(await stmt.run());
				}
				sqlite.exec('COMMIT');
			} catch (err) {
				sqlite.exec('ROLLBACK');
				throw err;
			}
			return out;
		},
		async exec(query: string) {
			sqlite.exec(query);
			return { ok: true };
		}
	};
}

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

	test('backend Cloudflare D1: auto-seed, login, simulasi, klaim atomik anti-bentrok, dan warga lapor', async () => {
		const d1 = createSqliteD1();
		await ensureD1Ready(d1);

		const auth = await d1Login(d1, '081300000001', DEMO_PASSWORD);
		expect(auth.ok).toBe(true);

		const started = await d1BeginSimulation(d1, IDS.dina, 'hujan_lebat');
		expect(started.ok).toBe(true);
		if (!started.ok) return;

		const boardBefore = await d1ResidentBoard(d1, TOMANG_ID, started.data.id);
		expect(boardBefore[0].userId).toBe(IDS.hartono);
		expect(boardBefore[0].status).toBe('belum');

		const firstClaim = await d1ClaimResident(d1, IDS.dina, started.data.id, IDS.hartono);
		expect(firstClaim.ok).toBe(true);

		const rivalClaim = await d1ClaimResident(d1, IDS.rudi, started.data.id, IDS.hartono);
		expect(rivalClaim.ok).toBe(false);
		if (!rivalClaim.ok) {
			expect(rivalClaim.error).toBe('Sedang dicek relawan lain.');
		}

		const done = await d1FinishCheck(d1, IDS.dina, started.data.id, IDS.hartono, 'aman');
		expect(done.ok).toBe(true);

		const help = await d1SendStatus(d1, {
			userId: IDS.sari,
			eventId: started.data.id,
			status: 'butuh',
			helpType: 'evakuasi',
			note: 'Air mulai masuk teras',
			lat: -6.1702,
			lng: 106.7988
		});
		expect(help.ok).toBe(true);

		const boardMid = await d1ResidentBoard(d1, TOMANG_ID, started.data.id);
		expect(groupByRt(boardMid).map((g) => g.rt).sort()).toEqual(['01', '03', '05']);
		expect(slaState(started.data, boardMid).breached).toBe(false);

		const breached = await d1BreachSla(d1, IDS.dina, started.data.id);
		expect(breached.ok).toBe(true);
		if (!breached.ok) return;
		const afterBreach = slaState(breached.data, boardMid);
		expect(afterBreach.breached).toBe(true);
		expect(afterBreach.escalated.some((r) => r.userId === IDS.sari)).toBe(true);
		expect(afterBreach.escalated.some((r) => r.userId === IDS.hartono)).toBe(false);
	});
});
