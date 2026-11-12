import { register } from '#lib/server/db';
import { setSession } from '#lib/server/session';
import type { Role } from '#lib/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const role = String(form.get('role') ?? 'warga') as Role;
		const fullName = String(form.get('fullName') ?? '');
		const phone = String(form.get('phone') ?? '');
		const result = await register({
			fullName,
			phone,
			password: String(form.get('password') ?? ''),
			role
		});
		if (!result.ok) return fail(400, { message: result.error, fullName, phone, role });
		setSession(cookies, result.data.id);
		redirect(303, '/wilayah');
	}
};
