import { childrenOf, getUser, setKelurahan } from '#lib/server/db';
import { findWilayah, wilayah as allWilayah } from '#lib/server/wilayah-data';
import type { WilayahLevel } from '#lib/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
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
	const items = childrenOf(parent, level, q);
	const selected = [prov, kab, kec].map((id) => findWilayah(allWilayah, id)).filter((item) => item != null);
	return { items, level, prov, kab, kec, q, pilih, selected };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/masuk');
		const form = await request.formData();
		const result = setKelurahan(locals.user.id, String(form.get('kelurahanId') ?? ''));
		if (!result.ok) return fail(400, { message: result.error });
		const user = getUser(locals.user.id);
		redirect(303, user?.setupStep === 'done' ? '/profil' : '/kerentanan');
	}
};
