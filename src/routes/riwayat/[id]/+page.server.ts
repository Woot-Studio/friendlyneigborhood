import { countRows, durationLabel, firstResponseMinutes, homesChecked } from '#lib/domain';
import { checkinsFor, facilities, getEvent, history, residentBoard } from '#lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const event = await getEvent(params.id);
	if (!event || event.kelurahanId !== locals.user.kelurahanId) error(404, 'Kejadian tidak ditemukan.');
	const [rows, checkins, facList, events] = await Promise.all([
		residentBoard(event.kelurahanId, event.id),
		checkinsFor(event.id),
		facilities(event.kelurahanId),
		history(locals.user.kelurahanId)
	]);
	const counts = countRows(rows);
	const shelter = facList.find((item) => item.shelterConfirmed);
	return {
		event,
		counts,
		duration: durationLabel(event.startedAt, event.endedAt),
		first: firstResponseMinutes(event, checkins),
		checked: homesChecked(checkins),
		shelterName: shelter?.name ?? null,
		events
	};
};
