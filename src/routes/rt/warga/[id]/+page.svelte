<script lang="ts">
	import { statusLabel, vulnLabels } from '#lib/domain';
	import MapView from '#lib/components/MapView.svelte';
	import { ripple } from '#lib/ripple';
	import { ChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const labels = $derived(vulnLabels(data.person.vulnerability));
	const status = $derived(data.row?.status ?? 'belum');
</script>

<svelte:head><title>{data.person.fullName} · Dasbor RT</title></svelte:head>

<div class="sheet stack">
	<a class="back" href="/rt"><ChevronLeft size={20} /> Detail warga</a>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<section class="row">
		<span class="avatar lg">{data.person.fullName.slice(0, 1)}{data.person.fullName.split(' ').at(-1)?.[0]}</span>
		<div>
			<h1 style="font-size:24px;">{data.person.fullName}</h1>
			{#if data.row}
				{#if status === 'dicek'}
					<span class="chip dicek">Sedang dicek oleh {data.row.claimedByShort}</span>
				{:else}
					<span class="chip {status}">{statusLabel(status)}</span>
				{/if}
			{:else}
				<span class="chip">Tidak ada siaga aktif</span>
			{/if}
		</div>
	</section>
	<section class="card">
		<dl class="kv">
			<dt>Alamat</dt><dd>{data.person.address || 'Belum diisi'}</dd>
			<dt>Kelurahan</dt><dd>{data.kelurahanLabel}</dd>
			<dt>Kerentanan</dt><dd>{labels.length ? labels.join(', ') : 'Tidak ditandai'}</dd>
			<dt>Telepon</dt><dd><a href="tel:{data.person.phone}">{data.person.phone}</a></dd>
			{#if data.when}<dt>Diklaim</dt><dd>{data.row?.claimedByShort} · {data.when}</dd>{/if}
		</dl>
	</section>
	{#if data.row}
		<MapView
			label={data.contoh ? `Contoh peta ${data.kelurahanLabel}` : `Lokasi ${data.person.fullName}`}
			center={data.center}
			points={[{
				id: data.person.id,
				lat: data.center.lat,
				lng: data.center.lng,
				status,
				label: data.person.fullName
			}]}
		/>
	{/if}
	{#if data.event && data.row}
		{#if status === 'belum' || status === 'butuh'}
			<p class="muted">Tombol ini menandai bahwa Anda sedang menuju lokasi warga, agar relawan lain tidak berangkat ke rumah yang sama.</p>
			<form method="POST" action="?/cek">
				<button class="btn primary" use:ripple>Saya cek {data.person.fullName}</button>
			</form>
		{:else if status === 'dicek'}
			<p class="muted">Relawan lain melihat rumah ini sedang Anda cek. Setelah kunjungan, perbarui status warga.</p>
			<div class="row">
				<form method="POST" action="?/aman" style="flex:1;"><button class="btn green" use:ripple>Tandai aman</button></form>
				<form method="POST" action="?/dibantu" style="flex:1;"><button class="btn outline" use:ripple>Sudah dibantu</button></form>
			</div>
			<form method="POST" action="?/batal"><button class="btn ghost" type="submit">Batalkan klaim cek</button></form>
		{:else}
			<p class="chip {status}">{statusLabel(status)}</p>
		{/if}
	{/if}
	{#if data.contoh}<p class="note"><span class="dot"></span> Data warga dan lokasi di layar ini adalah contoh.</p>{/if}
</div>
