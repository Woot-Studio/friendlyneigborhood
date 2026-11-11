import { currentAlert, ensureForecast, placePath } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const days = await ensureForecast(locals.user.kelurahanId);
	const event = currentAlert(locals.user.kelurahanId);
	const path = placePath(locals.user.kelurahanId);
	return { days, event, path };
};
