import { childrenOf, getUser, getWilayah, setKelurahan } from '#lib/server/db';
import type { WilayahLevel } from '#lib/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const prov = url.searchParams.get('prov');
	const kab = url.searchParams.get('kab');
	const kec = url.searchParams.get('kec');
	const q = url.searchParams.get('q') ?? '';
	const pilih = url.searchParams.get('pilih');
	let level: WilayahLevel = 'provinsi';
	let parent: string | null = null;
	if (prov && kab && kec) {
		level = 'kelurahan';
		parent = kec;
	} else if (prov && kab) {
		level = 'kecamatan';
		parent = kab;
	} else if (prov) {
		level = 'kabupaten';
		parent = prov;
	}
	const [items, rawSelected] = await Promise.all([
		childrenOf(parent, level, q),
		Promise.all([prov, kab, kec].map((id) => getWilayah(id)))
	]);
	const selected = rawSelected.filter((item) => item != null);
	return { items, level, prov, kab, kec, q, pilih, selected };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const result = await setKelurahan(locals.user.id, String(form.get('kelurahanId') ?? ''));
		if (!result.ok) return fail(400, { message: result.error });
		const user = await getUser(locals.user.id);
		redirect(303, user?.setupStep === 'done' ? '/profil' : '/kerentanan');
	}
};
