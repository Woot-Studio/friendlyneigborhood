import { setPrefs } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		setPrefs(locals.user.id, {
			notifyEnabled: form.get('notify') === 'ya',
			locationOnConfirm: form.get('lokasi') === 'ya'
		});
		redirect(303, locals.user.role === 'warga' ? '/beranda' : '/rt');
	}
};
