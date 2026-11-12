import { getUser, setVulnerability } from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const result = await setVulnerability(
			locals.user.id,
			{
				lansia: form.get('lansia') === 'ya',
				disabilitas: form.get('disabilitas') === 'ya',
				bayi: form.get('bayi') === 'ya',
				consent: form.get('consent') === 'ya'
			},
			form.get('lewati') === 'ya'
		);
		if (!result.ok) return fail(400, { message: result.error });
		const user = await getUser(locals.user.id);
		redirect(303, user?.setupStep === 'done' ? '/profil' : '/izin');
	}
};
