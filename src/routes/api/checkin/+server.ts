import { sendStatus } from '#lib/server/db';
import type { HelpType } from '#lib/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Masuk terlebih dahulu.' }, { status: 401 });
	const form = await request.formData();
	const status = String(form.get('status') ?? '');
	if (status !== 'aman' && status !== 'butuh') return json({ error: 'Status tidak dikenal.' }, { status: 400 });
	const latRaw = String(form.get('lat') ?? '');
	const lngRaw = String(form.get('lng') ?? '');
	const result = await sendStatus({
		userId: locals.user.id,
		eventId: String(form.get('eventId') ?? ''),
		status,
		helpType: (String(form.get('helpType') ?? '') || null) as HelpType | null,
		note: String(form.get('note') ?? ''),
		lat: latRaw ? Number(latRaw) : null,
		lng: lngRaw ? Number(lngRaw) : null,
		locationLabel: String(form.get('locationLabel') ?? '')
	});
	if (!result.ok) return json({ error: result.error }, { status: 400 });
	return json({ ok: true });
};
