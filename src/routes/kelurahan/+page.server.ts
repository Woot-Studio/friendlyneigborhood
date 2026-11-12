import { countRows, groupByRt, SLA_MINUTES, slaState } from '#lib/domain';
import { summarizeKelurahan } from '#lib/server/ai';
import {
	beginSimulation,
	claimResident,
	currentAlert,
	escalateSlaNow,
	facilities,
	placePath,
	residentBoard,
	roster
} from '#lib/server/db';
import { notifyKelurahan } from '#lib/server/push';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/masuk');
	if (locals.user.role === 'warga') redirect(303, '/beranda');
	if (!locals.user.kelurahanId) redirect(303, '/wilayah');

	const kelId = locals.user.kelurahanId;
	const [event, path, facList, people, summary] = await Promise.all([
		currentAlert(kelId),
		placePath(kelId),
		facilities(kelId),
		roster(kelId),
		summarizeKelurahan(kelId)
	]);

	const rows = event
		? await residentBoard(kelId, event.id)
		: await residentBoard(kelId, null);
	const kel = path.find((item) => item.level === 'kelurahan');
	const poskoCandidates = facList.filter((item) => item.kind === 'calon_posko');

	return {
		event,
		rows,
		counts: countRows(rows),
		rtGroups: groupByRt(rows),
		sla: slaState(event, rows),
		slaMinutes: SLA_MINUTES,
		summary,
		summaryAt: new Date().toISOString(),
		peopleCount: people.length,
		poskoReady: poskoCandidates.filter((item) => item.shelterConfirmed).length,
		poskoPending: poskoCandidates.filter((item) => !item.shelterConfirmed).length,
		center: { lat: kel?.lat ?? -6.171, lng: kel?.lng ?? 106.797 }
	};
};

export const actions: Actions = {
	simulasiSla: async ({ locals }) => {
		if (!locals.user?.kelurahanId || locals.user.role === 'warga') redirect(303, '/masuk');
		const event = await currentAlert(locals.user.kelurahanId);
		if (!event) return fail(400, { message: 'Mulai simulasi siaga terlebih dahulu.' });
		const result = await escalateSlaNow(locals.user.id, event.id);
		if (!result.ok) return fail(400, { message: result.error });
		return { ok: true };
	},
	cek: async ({ request, locals }) => {
		if (!locals.user?.kelurahanId || locals.user.role === 'warga') redirect(303, '/masuk');
		const event = await currentAlert(locals.user.kelurahanId);
		if (!event) return fail(400, { message: 'Tidak ada siaga aktif.' });
		const form = await request.formData();
		const result = await claimResident(locals.user.id, event.id, String(form.get('userId') ?? ''));
		if (!result.ok) return fail(400, { message: result.error });
		return { ok: true };
	},
	mulaiSimulasi: async ({ locals }) => {
		if (!locals.user?.kelurahanId || locals.user.role === 'warga') redirect(303, '/masuk');
		const started = await beginSimulation(locals.user.id, 'hujan_lebat');
		if (!started.ok) return fail(400, { message: started.error });
		await notifyKelurahan(started.data.kelurahanId, {
			title: `SIMULASI · ${started.data.title}`,
			body: 'Ini simulasi siaga kelurahan, bukan peringatan BMKG asli. Ketuk untuk memberi kabar.',
			url: `/siaga/${started.data.id}`,
			simulation: true
		});
		return { ok: true };
	}
};
