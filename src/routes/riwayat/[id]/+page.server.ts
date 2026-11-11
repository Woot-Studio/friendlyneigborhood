import { countRows, durationLabel, firstResponseMinutes, homesChecked } from '#lib/domain';
import { checkinsFor, facilities, getEvent, residentBoard } from '#lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const event = getEvent(params.id);
	if (!event || event.kelurahanId !== locals.user.kelurahanId) error(404, 'Kejadian tidak ditemukan.');
	const rows = residentBoard(event.kelurahanId, event.id);
	const counts = countRows(rows);
	const checkins = checkinsFor(event.id);
	const shelter = facilities(event.kelurahanId).find((item) => item.shelterConfirmed);
	return {
		event,
		counts,
		duration: durationLabel(event.startedAt, event.endedAt),
		first: firstResponseMinutes(event, checkins),
		checked: homesChecked(checkins),
		shelterName: shelter?.name ?? null
	};
};
