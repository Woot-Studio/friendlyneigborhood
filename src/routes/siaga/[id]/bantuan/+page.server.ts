import { getEvent } from '#lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user) redirect(303, '/masuk');
	const event = getEvent(params.id);
	if (!event || event.kelurahanId !== locals.user.kelurahanId) error(404, 'Siaga tidak ditemukan.');
	if (event.endedAt || !event.relevant) redirect(303, `/siaga/${event.id}`);
	return { event };
};
