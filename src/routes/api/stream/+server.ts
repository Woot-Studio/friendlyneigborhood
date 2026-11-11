import { subscribe } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) return new Response('Masuk terlebih dahulu.', { status: 401 });
	const encoder = new TextEncoder();
	let unsubscribe = () => {};
	let ping: ReturnType<typeof setInterval> | null = null;
	const stream = new ReadableStream({
		start(controller) {
			const send = (message: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
				} catch {
					/* koneksi sudah ditutup */
				}
			};
			unsubscribe = subscribe(send);
			ping = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: ping\n\n`));
				} catch {
					/* abaikan */
				}
			}, 20000);
		},
		cancel() {
			unsubscribe();
			if (ping) clearInterval(ping);
		}
	});
	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive'
		}
	});
};
