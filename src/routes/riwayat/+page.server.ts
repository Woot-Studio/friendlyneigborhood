import { history } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	return { events: history(locals.user.kelurahanId) };
};
