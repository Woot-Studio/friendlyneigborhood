import { ensureFacilities, placePath } from '#lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.kelurahanId) redirect(303, '/wilayah');
	const order = ['puskesmas', 'polisi', 'pemadam_kebakaran', 'spbu', 'calon_posko'];
	const items = (await ensureFacilities(locals.user.kelurahanId)).sort(
		(a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.distanceM - b.distanceM
	);
	const path = placePath(locals.user.kelurahanId);
	const kel = path.find((item) => item.level === 'kelurahan');
	return {
		items,
		center: { lat: kel?.lat ?? -6.171, lng: kel?.lng ?? 106.797 },
		fromApi: items.some((item) => item.source === 'api')
	};
};
