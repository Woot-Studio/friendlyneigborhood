import { sendStatus } from '#lib/server/db';
import type { HelpType } from '#lib/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Masuk terlebih dahulu.' }, { status: 401 });
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ error: 'Format formulir tidak valid.' }, { status: 400 });
	}
	const status = String(form.get('status') ?? '');
	if (status !== 'aman' && status !== 'butuh') return json({ error: 'Status tidak dikenal.' }, { status: 400 });
	const latRaw = String(form.get('lat') ?? '');
	const lngRaw = String(form.get('lng') ?? '');
	const helpType = String(form.get('helpType') ?? '');
	if (status === 'butuh' && !['evakuasi', 'medis', 'logistik', 'lainnya'].includes(helpType)) {
		return json({ error: 'Pilih jenis bantuan yang valid.' }, { status: 400 });
	}
	const lat = latRaw.trim() ? Number(latRaw) : null;
	const lng = lngRaw.trim() ? Number(lngRaw) : null;
	if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
		(lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) {
		return json({ error: 'Koordinat lokasi tidak valid.' }, { status: 400 });
	}
	const result = await sendStatus({
		userId: locals.user.id,
		eventId: String(form.get('eventId') ?? ''),
		status,
		helpType: status === 'butuh' ? (helpType as HelpType) : null,
		note: String(form.get('note') ?? ''),
		lat,
		lng,
		locationLabel: String(form.get('locationLabel') ?? '')
	});
	if (!result.ok) return json({ error: result.error }, { status: 400 });
	return json({ ok: true });
};
