import { announcementsFor, currentAlert, ensureForecast, myCheckin, placePath } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const event = currentAlert(locals.user.kelurahanId);
	const days = await ensureForecast(locals.user.kelurahanId);
	const news = announcementsFor(locals.user.kelurahanId, locals.user);
	const checkin = event ? myCheckin(event.id, locals.user.id) : null;
	const path = placePath(locals.user.kelurahanId);
	return { event, days, news, checkin, path };
};
