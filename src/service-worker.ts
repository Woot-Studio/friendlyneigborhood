/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';

const worker = globalThis as unknown as ServiceWorkerGlobalScope;
const CACHE = `friendly-${version}`;
const ASSETS = [...immutable, ...assets, ...prerendered].map((item) => item.path);

worker.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET' || url.origin !== worker.location.origin) return;
	if (url.pathname.startsWith('/api/')) return;
	event.respondWith(
		(async () => {
			const cached = await caches.match(event.request);
			try {
				const fresh = await fetch(event.request);
				if (fresh.ok && ASSETS.includes(url.pathname)) {
					const cache = await caches.open(CACHE);
					cache.put(event.request, fresh.clone());
				}
				return fresh;
			} catch {
				if (cached) return cached;
				throw new Error('offline');
			}
		})()
	);
});

worker.addEventListener('push', (event) => {
	const payload = event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
	event.waitUntil(
		worker.registration.showNotification(payload?.title || 'Friendly Neighborhood', {
			body: payload?.body || 'Ada kabar siaga untuk kelurahan Anda.',
			data: { url: payload?.url || '/beranda' },
			lang: 'id'
		})
	);
});

worker.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = (event.notification.data?.url as string) || '/beranda';
	event.waitUntil(worker.clients.openWindow(url));
});
