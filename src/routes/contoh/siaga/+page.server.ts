import { facilityKindLabel, formatDistance } from '#lib/domain';
import { ensureFacilities, placePath } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const path = await placePath(locals.user.kelurahanId);
	const kel = path.find((item) => item.level === 'kelurahan');
	const nearby = (await ensureFacilities(locals.user.kelurahanId))
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
		nearby,
		center: {
			lat: locals.user.lat ?? kel?.lat ?? -6.171,
			lng: locals.user.lng ?? kel?.lng ?? 106.797
		}
	};
};
