import { facilityKindLabel, formatDistance, shortName } from '#lib/domain';
import { currentAlert, ensureFacilities, fullUser, getEvent, myCheckin, placePath } from '#lib/server/db';
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
	const kel = path.find((item) => item.level === 'kelurahan');
	const nearby = (await ensureFacilities(event.kelurahanId))
		.slice()
		.sort((a, b) => a.distanceM - b.distanceM)
		.slice(0, 4)
		.map((item) => ({
			id: item.id,
			name: item.name,
			kind: facilityKindLabel(item.kind),
			distance: formatDistance(item.distanceM),
			lat: item.lat,
			lng: item.lng,
			confirmed: item.shelterConfirmed
		}));
	return {
		event,
		checkin,
		claimerName: claimer ? shortName(claimer.fullName) : null,
		closed: Boolean(event.endedAt || !event.relevant),
		path,
		stillActive: active?.id === event.id,
		nearby,
		center: {
			lat: locals.user.lat ?? kel?.lat ?? -6.171,
			lng: locals.user.lng ?? kel?.lng ?? 106.797
		}
	};
};
