import { placePath, setProfile } from '#lib/server/db';
import { clearSession } from '#lib/server/session';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/masuk');
	return { path: locals.user.kelurahanId ? await placePath(locals.user.kelurahanId) : [] };
};

export const actions: Actions = {
	simpan: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const result = await setProfile(locals.user.id, {
			rt: String(form.get('rt') ?? ''),
			rw: String(form.get('rw') ?? ''),
			address: String(form.get('address') ?? ''),
			notifyEnabled: form.get('notify') === 'ya',
			locationOnConfirm: form.get('lokasi') === 'ya'
		});
		if (!result.ok) return fail(400, { message: result.error });
		return { message: 'Pengaturan disimpan.' };
	},
	keluar: async ({ cookies }) => {
		clearSession(cookies);
		redirect(303, '/');
	}
};
