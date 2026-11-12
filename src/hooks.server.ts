import { getUser } from '#lib/server/db';
import { sessionUserId } from '#lib/server/session';
import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = getUser(sessionUserId(event.cookies));
	return resolve(event);
};
