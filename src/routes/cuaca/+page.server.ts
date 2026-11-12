import { currentAlert, ensureForecast, placePath } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const [days, event, path] = await Promise.all([
		ensureForecast(locals.user.kelurahanId),
		currentAlert(locals.user.kelurahanId),
		placePath(locals.user.kelurahanId)
	]);
	return { days, event, path };
};
