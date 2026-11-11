<script lang="ts">
	import { ripple } from '#lib/ripple';
	import { Bell, ChevronLeft, MapPin, Smartphone } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let notify = $state(true);
	let lokasi = $state(true);
	let installMsg = $state('');
	let deferred: { prompt: () => Promise<void> } | null = null;

	function capture(event: Event) {
		event.preventDefault();
		deferred = event as unknown as { prompt: () => Promise<void> };
	}

	async function allowNotify() {
		if (typeof Notification === 'undefined') {
			notify = false;
			return;
		}
		const result = await Notification.requestPermission();
		notify = result === 'granted';
		if (result !== 'granted' || !data.vapidPublicKey || !('serviceWorker' in navigator)) return;
		try {
			const reg = await navigator.serviceWorker.ready;
			const key = Uint8Array.from(atob(data.vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
			const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
			await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(sub)
			});
		} catch {
			/* izin sudah tercatat; pengiriman jarak jauh menyusul saat kunci VAPID ada */
		}
	}

	async function allowLocate() {
		if (!navigator.geolocation) {
			lokasi = false;
			return;
		}
		await new Promise<void>((resolve) => {
			navigator.geolocation.getCurrentPosition(
				() => {
					lokasi = true;
					resolve();
				},
				() => {
					lokasi = false;
					resolve();
				},
				{ timeout: 8000 }
			);
		});
	}

	async function pasang() {
		if (!deferred) {
			installMsg = 'Di menu browser, pilih Pasang aplikasi atau Tambahkan ke Layar Utama.';
			return;
		}
		await deferred.prompt();
	}
</script>

<svelte:head><title>Izin aplikasi · Friendly Neighborhood</title></svelte:head>
<svelte:window onbeforeinstallprompt={capture} />

<main class="pad sheet stack" style="padding-top: 12px;">
	<a class="back" href="/kerentanan"><ChevronLeft size={20} /> Izin aplikasi</a>
	<p class="lead">Agar kabar siaga sampai dan lokasi bisa dikirim saat Anda konfirmasi, Friendly Neighborhood meminta dua izin. Anda bisa mengubahnya nanti di profil.</p>
	<form id="izin" class="stack" method="POST">
		<input type="hidden" name="notify" value={notify ? 'ya' : ''} />
		<input type="hidden" name="lokasi" value={lokasi ? 'ya' : ''} />
		<article class="card row">
			<span class="mark"><Bell size={18} /></span>
			<div>
				<strong>Notifikasi</strong>
				<p class="muted">Supaya peringatan muncul meski aplikasi sedang tertutup.</p>
			</div>
		</article>
		<article class="card row">
			<span class="mark"><MapPin size={18} /></span>
			<div>
				<strong>Lokasi</strong>
				<p class="muted">Hanya dikirim saat Anda menekan Saya aman atau Butuh bantuan.</p>
			</div>
		</article>
		<article class="card row">
			<span class="mark"><Smartphone size={18} /></span>
			<div>
				<strong>Pasang ke layar utama (PWA)</strong>
				<p class="muted">Opsional. Notifikasi lebih andal, terutama di iPhone.</p>
				<button class="btn outline" type="button" onclick={pasang}>Pasang ke layar utama</button>
				{#if installMsg}<p class="muted">{installMsg}</p>{/if}
			</div>
		</article>
		<button
			class="btn primary"
			use:ripple
			type="button"
			onclick={async () => {
				await allowNotify();
				await allowLocate();
				(document.getElementById('izin') as HTMLFormElement | null)?.requestSubmit();
			}}>Izinkan dan masuk</button>
	</form>
	<form method="POST">
		<input type="hidden" name="notify" value="" />
		<input type="hidden" name="lokasi" value="" />
		<button class="btn ghost" type="submit">Atur nanti</button>
	</form>
</main>
