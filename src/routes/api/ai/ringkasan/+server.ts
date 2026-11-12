import { summarizeKelurahan } from '#lib/server/ai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const secret = process.env.CRON_SECRET;
	const bearer = request.headers.get('authorization') === `Bearer ${secret}`;
	const staff = locals.user && locals.user.role !== 'warga' ? locals.user : null;
	if (!staff && !(secret && bearer)) return json({ error: 'Tidak diizinkan.' }, { status: 401 });
	const body = (await request.json().catch(() => ({}))) as { kelurahanId?: string };
	const kelurahanId = staff?.kelurahanId || body.kelurahanId;
	if (!kelurahanId) return json({ error: 'Kelurahan tidak ada.' }, { status: 400 });
	const summary = await summarizeKelurahan(kelurahanId);
	return json({ text: summary.text, source: summary.source, aggregate: summary.aggregate });
};
