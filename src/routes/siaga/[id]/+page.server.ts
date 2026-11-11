import { shortName } from '#lib/domain';
import { currentAlert, fullUser, getEvent, myCheckin, placePath } from '#lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user) redirect(303, '/masuk');
	const event = getEvent(params.id);
	if (!event || event.kelurahanId !== locals.user.kelurahanId) error(404, 'Siaga tidak ditemukan.');
	const checkin = myCheckin(event.id, locals.user.id);
	const claimer = checkin?.claimedBy ? fullUser(checkin.claimedBy) : null;
	const active = currentAlert(locals.user.kelurahanId);
	return {
		event,
		checkin,
		claimerName: claimer ? shortName(claimer.fullName) : null,
		closed: Boolean(event.endedAt || !event.relevant),
		path: placePath(event.kelurahanId),
		stillActive: active?.id === event.id
	};
};
