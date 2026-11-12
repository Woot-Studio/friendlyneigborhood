<script lang="ts">
	import { formatWib, phaseLabel, eventPhase } from '#lib/domain';
	import { ChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Detail kejadian · Friendly Neighborhood</title></svelte:head>

<div class="detail-split">
<nav class="detail-nav" aria-label="Kejadian lain">
	<a class="back" href="/riwayat"><ChevronLeft size={20} /> Riwayat</a>
	{#each data.events as item (item.id)}
		<a class="card" href="/riwayat/{item.id}" style="display: block; color: inherit; {item.id === data.event.id ? 'border-color: #8E2F4A; background: #F6E7EB;' : ''}">
			<strong>{item.title}</strong>
			<span class="muted" style="display: block;">{formatWib(item.startedAt)}</span>
		</a>
	{/each}
</nav>
<div class="sheet stack">
	<a class="back detail-back" href="/riwayat"><ChevronLeft size={20} /> Detail kejadian</a>
	<div class="row" style="flex-wrap:wrap;">
		{#if data.event.isSimulation}<span class="chip gold">SIMULASI</span>{/if}
		<span class="chip">{phaseLabel(eventPhase(data.event))}</span>
	</div>
	<h1>{data.event.title}</h1>
	<p class="muted">{formatWib(data.event.startedAt)}{#if data.event.endedAt} – {formatWib(data.event.endedAt)}{/if} · {data.kelurahanLabel}</p>
	<p>{data.event.headline}</p>
	<section class="card">
		<p class="kicker">Rekap kejadian</p>
		<p class="muted" style="margin: 8px 0 12px;">Rekap respons dari {data.counts.total} warga terdaftar.</p>
		<div class="stats">
			<div class="stat aman"><b>{data.counts.aman}</b><span>Aman</span></div>
			<div class="stat butuh"><b>{data.counts.butuh}</b><span>Butuh bantuan</span></div>
			<div class="stat belum"><b>{data.counts.belum}</b><span>Belum merespons</span></div>
		</div>
	</section>
	<section class="card">
		<dl class="kv">
			<dt>Durasi siaga</dt><dd>{data.duration}</dd>
			<dt>Respons pertama</dt><dd>{data.first == null ? 'Belum ada' : `${data.first} menit setelah notifikasi`}</dd>
			<dt>Dicek relawan</dt><dd>{data.checked} rumah</dd>
			<dt>Sumber peringatan</dt><dd>{data.event.sourceLabel}</dd>
			<dt>Cakupan</dt><dd>{data.event.areaLabel}</dd>
			<dt>Posko dibuka</dt><dd>{data.shelterName ?? 'Belum ada'}</dd>
		</dl>
	</section>
	{#if data.contoh}<p class="note"><span class="dot"></span> Rekap ini memakai data contoh untuk prototipe.</p>{/if}
</div>
</div>
