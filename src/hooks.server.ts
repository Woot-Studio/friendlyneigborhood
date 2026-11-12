import { getUser } from '#lib/server/db';
import { initRuntimeEnv } from '#lib/server/env';
import { sessionUserId } from '#lib/server/session';
import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	await initRuntimeEnv();
	event.locals.user = await getUser(sessionUserId(event.cookies));
	return resolve(event);
};
