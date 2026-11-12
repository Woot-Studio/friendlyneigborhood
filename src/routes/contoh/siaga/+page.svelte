<script lang="ts">
	import MapView from '#lib/components/MapView.svelte';
	import { ChevronLeft, CircleCheck, HandHelping, MapPin } from '@lucide/svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const hasil = $derived(page.url.searchParams.get('hasil'));
	const langkah = $derived(page.url.searchParams.get('langkah'));
	let help = $state('evakuasi');
	let note = $state('');
</script>

<svelte:head><title>Contoh siaga · Friendly Neighborhood</title></svelte:head>

<main class="pad sheet nest-pad siaga-page">
	<header class="alert-bar">
		<div class="between">
			<a class="back" href="/beranda"><ChevronLeft size={20} /> Siaga aktif</a>
		</div>
		<p class="pill-lite">Contoh peringatan</p>
		<h2 style="margin-top:12px;">BMKG mengeluarkan peringatan dini cuaca untuk DKI Jakarta.</h2>
		<dl class="meta">
			<dt>Cakupan</dt><dd>Tingkat provinsi, bukan kelurahan</dd>
			<dt>Sumber</dt><dd>BMKG melalui API Indonesia</dd>
			<dt>Waktu</dt><dd>11 Nov 2026, 21.50 WIB</dd>
		</dl>
	</header>

	{#if hasil === 'aman'}
		<section class="stack" style="text-align:center;">
			<div class="check-pop pop"><CircleCheck size={36} /></div>
			<h1>Status Anda sudah tercatat</h1>
			<p class="lead">Terima kasih sudah mengonfirmasi. Ketua RT dan relawan dapat melihat status ini.</p>
			<p><span class="chip aman">Aman</span></p>
			<p class="muted">Lokasi dikirim</p>
			<a class="btn outline" href="/beranda">Kembali ke beranda</a>
			<a class="btn ghost" href="/fasilitas">Lihat fasilitas terdekat</a>
		</section>
	{:else if langkah === 'bantuan' && hasil !== 'butuh'}
		<section class="stack">
			<h1>Butuh bantuan</h1>
			<p class="lead">Pilih jenis bantuan agar relawan tahu apa yang dibutuhkan. Lokasi akan dikirim bersama laporan.</p>
			{#each [
				['evakuasi', 'Evakuasi', 'Perlu dijemput atau dipindahkan ke tempat aman.'],
				['medis', 'Medis', 'Ada yang membutuhkan pertolongan kesehatan.'],
				['logistik', 'Air atau makanan', 'Stok di rumah tidak cukup.'],
				['lainnya', 'Lainnya', 'Jelaskan di catatan di bawah.']
			] as option (option[0])}
				<button class="choice" class:selected={help === option[0]} type="button" onclick={() => (help = option[0])}>
					<span class="copy"><strong>{option[1]}</strong><p>{option[2]}</p></span>
					<span class="radio"></span>
				</button>
			{/each}
			<label class="field">
				<span>Catatan (opsional)</span>
				<textarea bind:value={note} placeholder="Contoh: air sudah masuk ke lantai satu."></textarea>
			</label>
			<p class="muted">Titik contoh: sekitar Jl. Contoh Tomang Raya, Kel. Tomang.</p>
			<a class="btn urgent" href="?langkah=bantuan&hasil=butuh">Kirim permintaan bantuan</a>
		</section>
	{:else if hasil === 'butuh'}
		<section class="stack" style="text-align:center;">
			<div class="check-pop butuh pop"><HandHelping size={32} /></div>
			<h1>Permintaan bantuan terkirim</h1>
			<p class="lead">Relawan akan melihat jenis bantuan dan lokasi Anda. Sambil menunggu, Anda bisa melihat fasilitas terdekat.</p>
			<p><span class="chip butuh">Butuh bantuan</span></p>
			<p class="muted">Jenis bantuan: {help === 'logistik' ? 'Air atau makanan' : help === 'medis' ? 'Medis' : help === 'lainnya' ? 'Lainnya' : 'Evakuasi'}</p>
			{#if note}<p>{note}</p>{/if}
			<p class="muted">Sekitar Jl. Contoh Tomang Raya, Kel. Tomang</p>
			<a class="btn outline" href="/beranda">Kembali ke beranda</a>
			<a class="btn ghost" href="/fasilitas">Lihat fasilitas terdekat</a>
		</section>
	{:else}
		<div class="siaga-grid">
			<section class="stack siaga-main">
				<h1>Bagaimana kondisi Anda sekarang?</h1>
				<p class="lead">Tekan salah satu tombol. Lokasi GPS akan dikirim ke ketua RT dan relawan di kelurahan Anda.</p>
				<div class="action-row">
					<a class="btn green" href="?hasil=aman"><span class="icon-bubble"><CircleCheck size={18} /></span> Saya aman</a>
					<a class="btn urgent" href="?langkah=bantuan"><span class="icon-bubble"><HandHelping size={18} /></span> Butuh bantuan</a>
				</div>
				<a class="btn ghost" href="/fasilitas"><MapPin size={18} /> Lihat fasilitas terdekat</a>
				<p class="note"><span class="dot"></span> Ini contoh peringatan untuk prototipe, bukan data live.</p>
			</section>
			<aside class="siaga-aside">
				<MapView
					label="Contoh peta fasilitas"
					center={data.center}
					points={data.nearby.map((item) => ({
						id: item.id,
						lat: item.lat,
						lng: item.lng,
						status: item.confirmed ? 'aman' : 'belum',
						label: item.name
					}))}
				/>
				{#each data.nearby as item (item.id)}
					<p class="card"><strong>{item.name}</strong><br /><span class="muted">{item.kind} · {item.distance}</span></p>
				{/each}
			</aside>
		</div>
	{/if}
</main>
