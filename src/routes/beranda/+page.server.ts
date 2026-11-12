import { announcementsFor, currentAlert, ensureForecast, myCheckin, placePath } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const [event, days, news, path] = await Promise.all([
		currentAlert(locals.user.kelurahanId),
		ensureForecast(locals.user.kelurahanId),
		announcementsFor(locals.user.kelurahanId, locals.user),
		placePath(locals.user.kelurahanId)
	]);
	const checkin = event ? await myCheckin(event.id, locals.user.id) : null;
	return { event, days, news, checkin, path };
};
