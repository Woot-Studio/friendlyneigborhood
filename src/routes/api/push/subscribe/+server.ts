import { setPush } from '#lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Masuk terlebih dahulu.' }, { status: 401 });
	const body = (await request.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
	if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
		return json({ error: 'Langganan push tidak lengkap.' }, { status: 400 });
	}
	const result = await setPush(locals.user.id, {
		endpoint: body.endpoint,
		keys: { p256dh: body.keys.p256dh, auth: body.keys.auth }
	});
	if (!result.ok) return json({ error: result.error }, { status: 400 });
	return json({ ok: true });
};
