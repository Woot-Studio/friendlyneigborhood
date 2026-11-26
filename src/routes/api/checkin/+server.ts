import { parseCheckinForm } from '#lib/checkin-input';
import { sendStatus } from '#lib/server/db';
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
	const parsed = parseCheckinForm(form);
	if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });
	const result = await sendStatus({ userId: locals.user.id, ...parsed.data });
	if (!result.ok) return json({ error: result.error }, { status: 400 });
	return json({ ok: true });
};
