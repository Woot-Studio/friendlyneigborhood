import { summarizeKelurahan } from '#lib/server/ai';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	const summary = await summarizeKelurahan(locals.user.kelurahanId);
	return { summary, at: new Date().toISOString() };
};
