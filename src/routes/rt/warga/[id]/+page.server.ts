import { formatWib } from '#lib/domain';
import {
	unclaimResident,
	claimResident,
	currentAlert,
	finishCheck,
	placePath,
	residentBoard,
	roster
} from '#lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user || locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');
	const person = roster(locals.user.kelurahanId).find((item) => item.id === params.id);
	if (!person) error(404, 'Warga tidak ditemukan.');
	const event = currentAlert(locals.user.kelurahanId);
	const row = event ? residentBoard(locals.user.kelurahanId, event.id).find((item) => item.userId === person.id) ?? null : null;
	const path = placePath(locals.user.kelurahanId);
	const kel = path.find((item) => item.level === 'kelurahan');
	return {
		person,
		row,
		event,
		when: row?.claimedAt ? formatWib(row.claimedAt) : null,
		center: { lat: row?.lat ?? person.lat ?? kel?.lat ?? -6.171, lng: row?.lng ?? person.lng ?? kel?.lng ?? 106.797 }
	};
};

function act(locals: App.Locals, eventId: string | undefined, residentId: string, kind: 'cek' | 'batal' | 'aman' | 'dibantu') {
	if (!locals.user || !eventId) return fail(400, { message: 'Tidak ada siaga aktif.' });
	const result =
		kind === 'cek'
			? claimResident(locals.user.id, eventId, residentId)
			: kind === 'batal'
				? unclaimResident(locals.user.id, eventId, residentId)
				: finishCheck(locals.user.id, eventId, residentId, kind);
	if (!result.ok) return fail(400, { message: result.error });
	return { ok: true };
}

export const actions: Actions = {
	cek: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'cek');
	},
	batal: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'batal');
	},
	aman: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'aman');
	},
	dibantu: async ({ locals, params }) => {
		const event = locals.user?.kelurahanId ? currentAlert(locals.user.kelurahanId) : null;
		return act(locals, event?.id, params.id, 'dibantu');
	}
};
