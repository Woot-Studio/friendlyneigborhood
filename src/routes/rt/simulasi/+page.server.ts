import { beginSimulation } from '#lib/server/db';
import { notifyKelurahan } from '#lib/server/push';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
		const form = await request.formData();
		const scenario = String(form.get('scenario') ?? '');
		if (scenario !== 'hujan_lebat' && scenario !== 'gempa_dirasakan') {
			return fail(400, { message: 'Pilih satu skenario.' });
		}
		const result = beginSimulation(locals.user.id, scenario);
		if (!result.ok) return fail(400, { message: result.error });
		await notifyKelurahan(result.data.kelurahanId, {
			title: `SIMULASI · ${result.data.title}`,
			body: 'Ini simulasi oleh Ketua RT, bukan peringatan BMKG asli. Ketuk untuk memberi kabar.',
			url: `/siaga/${result.data.id}`,
			simulation: true
		});
		redirect(303, '/rt');
	}
};
