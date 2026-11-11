import { announcementsFor, publishAnnouncement } from '#lib/server/db';
import { notifyKelurahan } from '#lib/server/push';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	const draf = url.searchParams.get('draf');
	return {
		items: announcementsFor(locals.user.kelurahanId, locals.user),
		draft:
			draf === 'posko'
				? 'Posko sementara sudah dibuka di Masjid Contoh Al-Hidayah. Bawa obat pribadi dan dokumen penting.'
				: ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const audience = String(form.get('audience') ?? 'semua') === 'rentan' ? 'rentan' : 'semua';
		const result = publishAnnouncement(locals.user.id, {
			body: String(form.get('body') ?? ''),
			audience
		});
		if (!result.ok) return fail(400, { message: result.error, body: String(form.get('body') ?? ''), audience });
		await notifyKelurahan(result.data.kelurahanId, {
			title: 'Pengumuman ketua RT',
			body: result.data.body,
			url: '/beranda'
		});
		return { sent: true };
	}
};
