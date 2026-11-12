import { placeLabel } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const OPEN = new Set(['/', '/mulai', '/masuk', '/daftar']);

export const load: LayoutServerLoad = ({ locals, url }) => {
	const user = locals.user;
	const path = url.pathname;
	if (!user && !OPEN.has(path)) redirect(303, '/masuk');
	if (user && OPEN.has(path)) {
		redirect(303, user.role === 'warga' ? '/beranda' : '/rt');
	}
	if (user && user.setupStep !== 'done') {
		const dest =
			user.setupStep === 'wilayah' ? '/wilayah' : user.setupStep === 'kerentanan' ? '/kerentanan' : '/izin';
		if (path !== dest) redirect(303, dest);
	}
	return {
		user,
		kelurahanLabel: user?.kelurahanId ? placeLabel(user.kelurahanId) : '',
		contoh: !process.env.API_INDONESIA_KEY,
		vapidPublicKey: process.env.PUBLIC_VAPID_KEY ?? ''
	};
};
