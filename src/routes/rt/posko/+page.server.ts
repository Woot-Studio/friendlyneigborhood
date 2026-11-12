import { facilities, shelter } from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	const all = await facilities(locals.user.kelurahanId);
	return {
		items: all.filter((item) => item.kind === 'calon_posko')
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const result = await shelter(locals.user.id, String(form.get('id') ?? ''));
		if (!result.ok) return fail(400, { message: result.error });
		return { ok: true };
	}
};
