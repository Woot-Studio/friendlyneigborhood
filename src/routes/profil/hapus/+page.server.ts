import { removeAccount } from '#lib/server/db';
import { clearSession } from '#lib/server/session';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, cookies, request }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		if (form.get('yakin') !== 'ya') return fail(400, { message: 'Centang konfirmasi untuk menghapus data.' });
		const result = removeAccount(locals.user.id);
		if (!result.ok) return fail(400, { message: result.error });
		clearSession(cookies);
		redirect(303, '/');
	}
};
