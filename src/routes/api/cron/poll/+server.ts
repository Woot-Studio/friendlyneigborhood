import { pollWarnings } from '#lib/server/poll';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function allowed(request: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) return process.env.NODE_ENV !== 'production';
	return request.headers.get('authorization') === `Bearer ${secret}`;
}

const run: RequestHandler = async ({ request }) => {
	if (!allowed(request)) return json({ error: 'Tidak diizinkan.' }, { status: 401 });
	return json(await pollWarnings());
};

export const GET = run;
export const POST = run;
