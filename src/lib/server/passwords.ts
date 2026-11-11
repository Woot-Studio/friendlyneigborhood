import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
	const hash = scryptSync(password, salt, 32, PARAMS).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const next = scryptSync(password, salt, 32, PARAMS);
	const prev = Buffer.from(hash, 'hex');
	if (next.length !== prev.length) return false;
	return timingSafeEqual(next, prev);
}
