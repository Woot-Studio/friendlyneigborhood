import { login } from '#lib/server/db';
import { setSession } from '#lib/server/session';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const result = await login(String(form.get('phone') ?? ''), String(form.get('password') ?? ''));
		if (!result.ok) return fail(400, { message: result.error, phone: String(form.get('phone') ?? '') });
		setSession(cookies, result.data.id);
		if (result.data.setupStep !== 'done') {
			const dest =
				result.data.setupStep === 'wilayah'
					? '/wilayah'
					: result.data.setupStep === 'kerentanan'
						? '/kerentanan'
						: '/izin';
			redirect(303, dest);
		}
		const nextRaw = String(form.get('next') ?? '');
		const safeNext = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '';
		redirect(303, result.data.role === 'warga' ? '/beranda' : safeNext || '/rt');
	}
};
