<script lang="ts">
	import { ripple } from '#lib/ripple';
	import type { HelpType } from '#lib/types';
	import { ChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let help = $state<HelpType>('evakuasi');
	let note = $state('');
	let sending = $state(false);
	let problem = $state('');

	const options: { id: HelpType; title: string; text: string }[] = [
		{ id: 'evakuasi', title: 'Evakuasi', text: 'Perlu dijemput atau dipindahkan ke tempat aman.' },
		{ id: 'medis', title: 'Medis', text: 'Ada yang membutuhkan pertolongan kesehatan.' },
		{ id: 'logistik', title: 'Air atau makanan', text: 'Stok di rumah tidak cukup.' },
		{ id: 'lainnya', title: 'Lainnya', text: 'Jelaskan di catatan di bawah.' }
	];

	async function kirim() {
		sending = true;
		problem = '';
		const body = new FormData();
		body.set('eventId', data.event.id);
		body.set('status', 'butuh');
		body.set('helpType', help);
		body.set('note', note);
		body.set('locationLabel', data.user?.address || 'Lokasi GPS tercatat');
		const loc = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
			if (!navigator.geolocation) return resolve(null);
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
				() => resolve(null),
				{ enableHighAccuracy: true, timeout: 8000 }
			);
		});
		if (loc) {
			body.set('lat', String(loc.lat));
			body.set('lng', String(loc.lng));
		}
		const response = await fetch('/api/checkin', { method: 'POST', body });
		sending = false;
		if (!response.ok) {
			const payload = (await response.json()) as { error?: string };
			problem = payload.error || 'Permintaan belum terkirim.';
			return;
		}
		location.href = `/siaga/${data.event.id}`;
	}
</script>

<svelte:head><title>Butuh bantuan · Friendly Neighborhood</title></svelte:head>

<main class="pad sheet stack nest-pad">
	<div class="form-frame">
	<a class="back" href="/siaga/{data.event.id}"><ChevronLeft size={20} /> Butuh bantuan</a>
	<div>
		<h1>Butuh bantuan</h1>
		<p class="lead">Pilih jenis bantuan agar relawan tahu apa yang dibutuhkan. Lokasi akan dikirim bersama laporan.</p>
	</div>
	{#if problem}<p class="error">{problem}</p>{/if}
	<div class="stack-s">
		{#each options as option (option.id)}
			<button class="choice" class:selected={help === option.id} type="button" onclick={() => (help = option.id)}>
				<span class="copy"><strong>{option.title}</strong><p>{option.text}</p></span>
				<span class="radio"></span>
			</button>
		{/each}
	</div>
	<label class="field">
		<span>Catatan (opsional)</span>
		<textarea bind:value={note} placeholder="Contoh: air sudah masuk ke lantai satu."></textarea>
	</label>
	<p class="muted">Lokasi akan dikirim. {data.user?.address ? `Titik terdaftar: ${data.user.address}, ${data.kelurahanLabel}.` : 'Izinkan GPS bila diminta browser.'}</p>
	<button class="btn urgent" use:ripple type="button" disabled={sending} onclick={kirim}>{sending ? 'Mengirim…' : 'Kirim permintaan bantuan'}</button>
	</div>
</main>
