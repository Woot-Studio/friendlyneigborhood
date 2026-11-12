import { facilities, shelter } from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	return {
		items: facilities(locals.user.kelurahanId).filter((item) => item.kind === 'calon_posko')
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const result = shelter(locals.user.id, String(form.get('id') ?? ''));
		if (!result.ok) return fail(400, { message: result.error });
		return { ok: true };
	}
};
