import { countRows } from '#lib/domain';
import {
	claimResident,
	currentAlert,
	ignoreEvent,
	placePath,
	residentBoard,
	restoreDemo,
	roster
} from '#lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/masuk');
	if (locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	const [event, path, people] = await Promise.all([
		currentAlert(locals.user.kelurahanId),
		placePath(locals.user.kelurahanId),
		roster(locals.user.kelurahanId)
	]);
	const all = event ? await residentBoard(locals.user.kelurahanId, event.id) : [];
	const filter = url.searchParams.get('saring') ?? 'semua';
	const rows = all.filter((row) => {
		if (filter === 'belum') return row.status === 'belum' || (row.status === 'dicek' && !row.helpType);
		if (filter === 'butuh') return row.status === 'butuh' || (row.status === 'dicek' && Boolean(row.helpType));
		if (filter === 'aman') return row.status === 'aman' || row.status === 'dibantu';
		return true;
	});
	const kel = path.find((item) => item.level === 'kelurahan');
	return {
		event,
		rows,
		all,
		counts: countRows(all),
		filter,
		people,
		center: { lat: kel?.lat ?? -6.171, lng: kel?.lng ?? 106.797 }
	};
};

export const actions: Actions = {
	cek: async ({ request, locals }) => {
		if (!locals.user?.kelurahanId) redirect(303, '/masuk');
		const event = await currentAlert(locals.user.kelurahanId);
		if (!event) return fail(400, { message: 'Tidak ada siaga aktif.' });
		const form = await request.formData();
		const result = await claimResident(locals.user.id, event.id, String(form.get('userId') ?? ''));
		if (!result.ok) return fail(400, { message: result.error });
		return { ok: true };
	},
	abaikan: async ({ locals }) => {
		if (!locals.user?.kelurahanId) redirect(303, '/masuk');
		const event = await currentAlert(locals.user.kelurahanId);
		if (!event) return fail(400, { message: 'Tidak ada siaga aktif.' });
		const result = await ignoreEvent(locals.user.id, event.id);
		if (!result.ok) return fail(400, { message: result.error });
		return { ok: true };
	},
	reset: async ({ locals }) => {
		if (locals.user?.role !== 'rt') return fail(403, { message: 'Hanya ketua RT yang dapat mengembalikan data contoh.' });
		await restoreDemo();
		return { ok: true };
	}
};
