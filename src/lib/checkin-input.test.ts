import { describe, expect, test } from 'bun:test';
import { parseCheckinForm } from './checkin-input';

function form(overrides: Record<string, string> = {}): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries({ eventId: 'event-1', status: 'aman', ...overrides })) {
		data.set(key, value);
	}
	return data;
}

describe('validasi formulir check-in', () => {
	test('menerima status aman tanpa lokasi dan mengabaikan jenis bantuan', () => {
		const result = parseCheckinForm(form({ helpType: 'medis', lat: '  ', lng: '' }));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toMatchObject({ helpType: null, lat: null, lng: null });
	});
	test('menerima bantuan valid dan koordinat nol', () => {
		const result = parseCheckinForm(form({ status: 'butuh', helpType: 'medis', lat: '0', lng: '0' }));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toMatchObject({ helpType: 'medis', lat: 0, lng: 0 });
	});
	test('menolak status, jenis bantuan, atau ID kejadian yang tidak valid', () => {
		for (const invalid of [
			{ status: 'dicek' }, { status: 'butuh', helpType: 'unknown' },
			{ status: 'butuh' }, { eventId: '  ' }
		]) expect(parseCheckinForm(form(invalid)).ok).toBe(false);
	});
	test('menolak koordinat di luar rentang atau tidak finite', () => {
		for (const invalid of [
			{ lat: '90.1' }, { lng: '-180.1' }, { lat: 'NaN' }, { lng: 'Infinity' }
		]) expect(parseCheckinForm(form(invalid)).ok).toBe(false);
	});
	test('menolak unggahan file pada field teks', () => {
		const data = form();
		data.set('eventId', new Blob(['event-1']), 'event.txt');
		expect(parseCheckinForm(data).ok).toBe(false);
	});
});
