import { latestLiveEventId, liveEventsAfter, subscribe } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return new Response('Masuk terlebih dahulu.', { status: 401 });
	const encoder = new TextEncoder();
	const lastHeader = Number(request.headers.get('last-event-id') ?? '');
	let cursor = Number.isFinite(lastHeader) && lastHeader > 0 ? lastHeader : await latestLiveEventId();
	let unsubscribe = () => {};
	let ping: ReturnType<typeof setInterval> | null = null;
	let poller: ReturnType<typeof setInterval> | null = null;
	let closed = false;

	const cleanup = () => {
		if (closed) return;
		closed = true;
		unsubscribe();
		if (ping) clearInterval(ping);
		if (poller) clearInterval(poller);
	};

	const stream = new ReadableStream({
		async start(controller) {
			const send = (message: unknown, id?: number) => {
				if (closed) return;
				if (id != null) {
					if (id <= cursor) return;
					cursor = id;
				}
				try {
					const prefix = id != null ? `id: ${id}\n` : '';
					controller.enqueue(encoder.encode(`${prefix}data: ${JSON.stringify(message)}\n\n`));
				} catch {
					cleanup();
				}
			};

			if (Number.isFinite(lastHeader) && lastHeader > 0) {
				const missed = await liveEventsAfter(lastHeader).catch(() => []);
				for (const item of missed) send(item.message, item.id);
			}

			unsubscribe = subscribe((msg, id) => send(msg, id));

			// ponytail: 2.5s D1 cursor poll syncs tabs across Worker isolates; upgrade to Durable Objects if sub-100ms cross-region fanout is needed
			poller = setInterval(async () => {
				if (closed) return;
				try {
					const rows = await liveEventsAfter(cursor);
					for (const item of rows) send(item.message, item.id);
				} catch {
					/* abaikan */
				}
			}, 2500);

			ping = setInterval(() => {
				if (closed) return;
				try {
					controller.enqueue(encoder.encode(`: ping\n\n`));
				} catch {
					cleanup();
				}
			}, 15000);

			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					/* sudah ditutup */
				}
			});
		},
		cancel() {
			cleanup();
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
