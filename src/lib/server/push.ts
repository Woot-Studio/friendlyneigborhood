import { subscribers } from './db';

export interface PushPayload {
	title: string;
	body: string;
	url: string;
	simulation?: boolean;
}

export async function notifyKelurahan(kelurahanId: string, payload: PushPayload) {
	const targets = subscribers(kelurahanId);
	const publicKey = process.env.PUBLIC_VAPID_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	if (!publicKey || !privateKey || targets.length === 0) {
		return { sent: 0, mode: 'local' as const };
	}
	const webpush = await import('web-push');
	webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:demo@friendly.local', publicKey, privateKey);
	let sent = 0;
	for (const user of targets) {
		if (!user.pushSubscription) continue;
		try {
			await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
			sent += 1;
		} catch {
			user.pushSubscription = null;
		}
	}
	return { sent, mode: 'webpush' as const };
}
