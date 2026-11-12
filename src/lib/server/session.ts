import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const COOKIE = 'fn_session';

function secret() {
	return process.env.SESSION_SECRET || 'fn-dev-session-secret-change-me';
}

export function signSession(id: string): string {
	const mac = createHmac('sha256', secret()).update(id).digest('base64url');
	return `${id}.${mac}`;
}

export function readSession(raw: string | undefined): string | null {
	if (!raw) return null;
	const index = raw.lastIndexOf('.');
	if (index <= 0) return null;
	const id = raw.slice(0, index);
	const mac = raw.slice(index + 1);
	const expected = createHmac('sha256', secret()).update(id).digest('base64url');
	const left = Buffer.from(mac);
	const right = Buffer.from(expected);
	if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
	return id;
}

export function setSession(cookies: Cookies, id: string) {
	cookies.set(COOKIE, signSession(id), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 60
	});
}

export function clearSession(cookies: Cookies) {
	cookies.delete(COOKIE, { path: '/' });
}

export function sessionUserId(cookies: Cookies): string | null {
	return readSession(cookies.get(COOKIE));
}
