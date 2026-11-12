import { shortName } from '#lib/domain';
import { currentAlert, fullUser, getEvent, myCheckin, placePath } from '#lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(303, '/masuk');
	const event = await getEvent(params.id);
	if (!event || event.kelurahanId !== locals.user.kelurahanId) error(404, 'Siaga tidak ditemukan.');
	const [checkin, active, path] = await Promise.all([
		myCheckin(event.id, locals.user.id),
		currentAlert(locals.user.kelurahanId),
		placePath(event.kelurahanId)
	]);
	const claimer = checkin?.claimedBy ? await fullUser(checkin.claimedBy) : null;
	return {
		event,
		checkin,
		claimerName: claimer ? shortName(claimer.fullName) : null,
		closed: Boolean(event.endedAt || !event.relevant),
		path,
		stillActive: active?.id === event.id
	};
};
