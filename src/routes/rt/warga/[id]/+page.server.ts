import { formatWib } from '#lib/domain';
import {
	claimResident,
	currentAlert,
	finishCheck,
	placePath,
	residentBoard,
	roster,
	unclaimResident
} from '#lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	const [people, event, path] = await Promise.all([
		roster(locals.user.kelurahanId),
		currentAlert(locals.user.kelurahanId),
		placePath(locals.user.kelurahanId)
	]);
	const person = people.find((item) => item.id === params.id);
	if (!person) error(404, 'Warga tidak ditemukan.');
	const board = event ? await residentBoard(locals.user.kelurahanId, event.id) : [];
	const row = board.find((item) => item.userId === person.id) ?? null;
	const kel = path.find((item) => item.level === 'kelurahan');
	return {
		person,
		row,
		event,
		when: row?.claimedAt ? formatWib(row.claimedAt) : null,
		center: { lat: row?.lat ?? person.lat ?? kel?.lat ?? -6.171, lng: row?.lng ?? person.lng ?? kel?.lng ?? 106.797 }
	};
};

async function act(
	locals: App.Locals,
	eventId: string | undefined,
	residentId: string,
	kind: 'cek' | 'batal' | 'aman' | 'dibantu'
) {
	if (!locals.user || !eventId) return fail(400, { message: 'Tidak ada siaga aktif.' });
	const result =
		kind === 'cek'
			? await claimResident(locals.user.id, eventId, residentId)
			: kind === 'batal'
				? await unclaimResident(locals.user.id, eventId, residentId)
				: await finishCheck(locals.user.id, eventId, residentId, kind);
	if (!result.ok) return fail(400, { message: result.error });
	return { ok: true };
}

export const actions: Actions = {
	cek: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? await currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'cek');
	},
	batal: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? await currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'batal');
	},
	aman: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? await currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'aman');
	},
	dibantu: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? await currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'dibantu');
	}
};
