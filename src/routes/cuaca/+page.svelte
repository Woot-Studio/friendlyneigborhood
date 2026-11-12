<script lang="ts">
	import { ChevronLeft, Cloud, CloudRain, CloudSun } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const kel = $derived(data.path.find((item) => item.level === 'kelurahan'));
</script>

<svelte:head><title>Cuaca dan peringatan · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<a class="back" href="/beranda"><ChevronLeft size={20} /> Cuaca dan peringatan</a>
	{#if kel}<p class="chip rose">Kel. {kel.altName}</p>{/if}
	<section class="card stack-s">
		<p class="kicker">Prakiraan tiga hari</p>
		<p class="muted">Sumber: BMKG melalui API Indonesia. Prakiraan tersedia sampai tingkat kelurahan.</p>
		{#each data.days as day (day.label)}
			<div class="between">
				<span class="row">
					{#if day.weather.toLowerCase().includes('hujan')}
						<CloudRain size={18} />
					{:else if day.weather.toLowerCase().includes('cerah')}
						<CloudSun size={18} />
					{:else}
						<Cloud size={18} />
					{/if}
					<strong>{day.label}</strong>
				</span>
				<span>{day.weather}, {day.tempC}°</span>
			</div>
		{/each}
		<p class="muted">Untuk hari ini.</p>
	</section>
	<section class="card stack-s">
		<p class="kicker">Peringatan dini</p>
		{#if data.event}
			<p><strong>{data.event.headline}</strong></p>
			<p class="muted">Wilayah asli: {data.event.areaLabel}. {data.event.coverageNote}.</p>
			<a href="/siaga/{data.event.id}">Buka layar siaga</a>
		{:else}
			<p><strong>Tidak ada peringatan aktif</strong></p>
			<p class="muted">Peringatan dini cuaca BMKG bersifat tingkat provinsi, bukan kelurahan. Jika ada, akan muncul di sini dan memicu siaga.</p>
		{/if}
	</section>
	{#if data.contoh}
		<p class="note"><span class="dot"></span> Lokasi dan prakiraan di layar ini adalah contoh, bukan data live.</p>
	{/if}
</div>
