import type { HelpType, Result } from './types';

interface CheckinInput {
	eventId: string;
	status: 'aman' | 'butuh';
	helpType: HelpType | null;
	note: string;
	lat: number | null;
	lng: number | null;
	locationLabel: string;
}

const HELP_TYPES: readonly HelpType[] = ['evakuasi', 'medis', 'logistik', 'lainnya'];

function isHelpType(value: string): value is HelpType {
	return HELP_TYPES.some((type) => type === value);
}

export function parseCheckinForm(form: FormData): Result<CheckinInput> {
	const fields = ['status', 'eventId', 'helpType', 'note', 'lat', 'lng', 'locationLabel'] as const;
	const values = new Map<string, string>();
	for (const field of fields) {
		const entries = form.getAll(field);
		if (entries.length > 1) return { ok: false, error: 'Format formulir tidak valid.' };
		const value = entries[0] ?? null;
		if (value !== null && typeof value !== 'string') {
			return { ok: false, error: 'Format formulir tidak valid.' };
		}
		values.set(field, value ?? '');
	}
	const status = values.get('status');
	if (status !== 'aman' && status !== 'butuh') return { ok: false, error: 'Status tidak dikenal.' };
	const eventId = (values.get('eventId') ?? '').trim();
	if (!eventId) return { ok: false, error: 'Data siaga tidak ditemukan.' };
	const rawHelp = values.get('helpType') ?? '';
	const helpType = isHelpType(rawHelp) ? rawHelp : null;
	if (status === 'butuh' && !helpType) return { ok: false, error: 'Pilih jenis bantuan yang valid.' };

	const latRaw = (values.get('lat') ?? '').trim();
	const lngRaw = (values.get('lng') ?? '').trim();
	const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
	if ((latRaw && !decimal.test(latRaw)) || (lngRaw && !decimal.test(lngRaw))) {
		return { ok: false, error: 'Koordinat lokasi tidak valid.' };
	}
	const lat = latRaw ? Number(latRaw) : null;
	const lng = lngRaw ? Number(lngRaw) : null;
	if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
		(lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) {
		return { ok: false, error: 'Koordinat lokasi tidak valid.' };
	}
	return {
		ok: true,
		data: {
			eventId, status, helpType: status === 'butuh' ? helpType : null,
			note: values.get('note') ?? '', lat, lng,
			locationLabel: values.get('locationLabel') ?? ''
		}
	};
}
