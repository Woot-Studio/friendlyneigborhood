<script lang="ts">
	import { formatWib, helpLabel, statusLabel } from '#lib/domain';
	import { ripple } from '#lib/ripple';
	import MapView from '#lib/components/MapView.svelte';
	import { ChevronLeft, CircleCheck, HandHelping, MapPin } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let sending = $state(false);
	let problem = $state('');

	async function sayaAman() {
		sending = true;
		problem = '';
		const body = new FormData();
		body.set('eventId', data.event.id);
		body.set('status', 'aman');
		const loc = await locate();
		if (loc) {
			body.set('lat', String(loc.lat));
			body.set('lng', String(loc.lng));
		}
		body.set('locationLabel', data.user?.address || 'Lokasi GPS tercatat');
		const response = await fetch('/api/checkin', { method: 'POST', body });
		sending = false;
		if (!response.ok) {
			const payload = (await response.json()) as { error?: string };
			problem = payload.error || 'Status belum terkirim.';
			return;
		}
		location.href = `/siaga/${data.event.id}`;
	}

	function locate(): Promise<{ lat: number; lng: number } | null> {
		if (!navigator.geolocation) return Promise.resolve(null);
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
				() => resolve(null),
				{ enableHighAccuracy: true, timeout: 8000 }
			);
		});
	}

	const done = $derived(data.checkin && data.checkin.status !== 'belum' && data.checkin.status !== 'dicek');
</script>

<svelte:head><title>{data.event.isSimulation ? 'Siaga aktif · simulasi' : 'Siaga aktif'}</title></svelte:head>

<main class="pad sheet nest-pad siaga-page">
	<header class="alert-bar">
		<div class="between">
			<a class="back" href="/beranda"><ChevronLeft size={20} /> {data.event.isSimulation ? 'Siaga aktif · simulasi' : 'Siaga aktif'}</a>
			{#if data.event.isSimulation}<span class="chip gold">SIMULASI</span>{/if}
		</div>
		{#if data.contoh && !data.event.isSimulation}<p class="pill-lite">Contoh peringatan</p>{/if}
		<h2 style="margin-top:12px;">{data.event.headline}</h2>
		<dl class="meta">
			<dt>Cakupan</dt><dd>{data.event.coverageNote}</dd>
			<dt>Sumber</dt><dd>{data.event.sourceLabel}</dd>
			<dt>Waktu</dt><dd>{formatWib(data.event.startedAt)}</dd>
		</dl>
	</header>

	<div class="siaga-grid">
	<div class="siaga-main siaga-body">
	{#if data.closed}
		<section class="stack">
			<h1>Siaga ini sudah ditutup</h1>
			<p class="lead">{data.event.relevant ? 'Kejadian selesai.' : 'Ketua RT menandai kejadian ini tidak relevan.'}</p>
			<a class="btn primary" href="/riwayat/{data.event.id}">Lihat rekap</a>
		</section>
	{:else if done && data.checkin}
		<section class="stack" style="text-align: center;">
			<div class="check-pop pop" class:butuh={data.checkin.status === 'butuh'}><CircleCheck size={36} /></div>
			<h1>{data.checkin.status === 'butuh' ? 'Permintaan bantuan terkirim' : 'Status Anda sudah tercatat'}</h1>
			<p class="lead">
				{data.checkin.status === 'butuh'
					? 'Relawan akan melihat jenis bantuan dan lokasi Anda. Sambil menunggu, Anda bisa melihat fasilitas terdekat.'
					: 'Terima kasih sudah mengonfirmasi. Ketua RT dan relawan dapat melihat status ini.'}
			</p>
			<p><span class="chip {data.checkin.status}">{statusLabel(data.checkin.status)}</span></p>
			{#if data.checkin.helpType}<p class="muted">{helpLabel(data.checkin.helpType)}</p>{/if}
			{#if data.checkin.note}<p>{data.checkin.note}</p>{/if}
			{#if data.checkin.locationLabel}<p class="muted">Lokasi: {data.checkin.locationLabel}</p>{/if}
			<a class="btn outline" href="/beranda">Kembali ke beranda</a>
			<a class="btn ghost" href="/fasilitas">Lihat fasilitas terdekat</a>
		</section>
	{:else if data.checkin?.status === 'dicek'}
		<section class="stack">
			<span class="chip dicek">Sedang dicek oleh {data.claimerName ?? 'relawan'}</span>
			<h1>Rumah Anda sedang dicek</h1>
			<p class="lead">Relawan kelurahan sudah menuju lokasi. Anda tetap bisa memperbarui kondisi.</p>
			<div class="action-row">
				<button class="btn green" use:ripple type="button" disabled={sending} onclick={sayaAman}>
					<span class="icon-bubble"><CircleCheck size={18} /></span>
					Saya aman
				</button>
				<a class="btn urgent" href="/siaga/{data.event.id}/bantuan"><span class="icon-bubble"><HandHelping size={18} /></span> Butuh bantuan</a>
			</div>
		</section>
	{:else}
		<section class="stack">
			<h1>Bagaimana kondisi Anda sekarang?</h1>
			<p class="lead">Tekan salah satu tombol. Lokasi GPS akan dikirim ke ketua RT dan relawan di kelurahan Anda.</p>
			{#if problem}<p class="error">{problem}</p>{/if}
			<div class="action-row">
				<button class="btn green" use:ripple type="button" disabled={sending} onclick={sayaAman}>
					<span class="icon-bubble"><CircleCheck size={18} /></span>
					{sending ? 'Mengirim lokasi…' : 'Saya aman'}
				</button>
				<a class="btn urgent" href="/siaga/{data.event.id}/bantuan">
					<span class="icon-bubble"><HandHelping size={18} /></span>
					Butuh bantuan
				</a>
			</div>
			<a class="btn ghost" href="/fasilitas"><MapPin size={18} /> Lihat fasilitas terdekat</a>
			{#if data.event.isSimulation}
				<p class="note"><span class="dot"></span> Ini simulasi. Tidak ada peringatan BMKG yang sedang berlaku.</p>
			{:else if data.contoh}
				<p class="note"><span class="dot"></span> Ini contoh peringatan untuk prototipe, bukan data live.</p>
			{/if}
		</section>
	{/if}
	</div>
	<aside class="siaga-aside">
		<MapView
			label={data.contoh ? 'Contoh peta fasilitas' : 'Fasilitas terdekat'}
			center={data.center}
			points={data.nearby.map((item) => ({
				id: item.id,
				lat: item.lat,
				lng: item.lng,
				status: item.confirmed ? 'aman' : 'belum',
				label: item.name
			}))}
		/>
		<div class="stack-s">
			{#each data.nearby as item (item.id)}
				<a class="card card-link" href="/fasilitas">
					<span>
						<strong>{item.name}</strong>
						<span>{item.kind} · {item.distance}</span>
					</span>
				</a>
			{/each}
		</div>
		<p class="note"><span class="dot"></span> Berdasarkan data yang tersedia.</p>
	</aside>
	</div>
</main>
