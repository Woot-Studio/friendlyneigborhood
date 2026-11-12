import { setPush, subscribers } from './db';
import { envVar } from './env';

export interface PushPayload {
	title: string;
	body: string;
	url: string;
	simulation?: boolean;
}

export async function notifyKelurahan(kelurahanId: string, payload: PushPayload) {
	const targets = await subscribers(kelurahanId);
	const publicKey = envVar('PUBLIC_VAPID_KEY');
	const privateKey = envVar('VAPID_PRIVATE_KEY');
	const subject = envVar('VAPID_SUBJECT') || 'mailto:demo@friendly.local';
	if (!publicKey || !privateKey || targets.length === 0) {
		return { sent: 0, mode: 'local' as const };
	}

	const webpush = await import('web-push');

	let sent = 0;
	const serialized = JSON.stringify(payload);
	for (const user of targets) {
		const sub = user.pushSubscription;
		if (!sub) continue;
		try {
			const encrypted = webpush.encrypt(sub.keys.p256dh, sub.keys.auth, serialized, 'aes128gcm');
			const audience = new URL(sub.endpoint).origin;
			const vapid = webpush.getVapidHeaders(audience, subject, publicKey, privateKey, 'aes128gcm');
			const response = await fetch(sub.endpoint, {
				method: 'POST',
				headers: {
					TTL: '86400',
					Urgency: 'high',
					'Content-Encoding': 'aes128gcm',
					'Content-Type': 'application/octet-stream',
					Authorization: vapid.Authorization
				},
				body: new Uint8Array(encrypted.cipherText)
			});
			if (response.ok) {
				sent += 1;
			} else if (response.status === 404 || response.status === 410) {
				await setPush(user.id, null);
			}
		} catch {
			await setPush(user.id, null);
		}
	}
	return { sent, mode: 'webpush' as const };
}
