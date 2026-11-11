<script lang="ts">
	import { formatWib } from '#lib/domain';
	import { ChevronLeft, Lock, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const paragraphs = $derived(data.summary.text.split('\n\n'));
</script>

<svelte:head><title>Ringkasan situasi · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<div class="between">
		<a class="back" href="/rt"><ChevronLeft size={20} /> Ringkasan situasi</a>
		{#if data.summary.aggregate.is_simulation}<span class="chip gold">SIMULASI</span>{/if}
	</div>
	<section class="card stack-s">
		<p class="kicker">Keluaran asisten</p>
		<p class="muted">Dibuat {formatWib(data.at)} · {data.summary.source === 'llm' ? 'Model bahasa' : 'Bukan laporan resmi'}</p>
		{#each paragraphs as paragraph, index (index)}
			<p>{paragraph}</p>
		{/each}
	</section>
	<section class="card row">
		<Lock size={18} />
		<p class="muted">Hanya data agregat yang dikirim ke asisten AI, tanpa nama atau lokasi.</p>
	</section>
	<section class="card row">
		<Sparkles size={18} />
		<p class="muted">Asisten hanya merangkum jumlah. Buka daftar di dasbor untuk melihat siapa yang perlu dicek.</p>
	</section>
	<details class="card">
		<summary>Angka yang boleh dikirim</summary>
		<pre style="white-space:pre-wrap; font-family:inherit; font-size:14px;">{JSON.stringify(data.summary.aggregate, null, 2)}</pre>
	</details>
	<a class="btn primary" href="/rt">Kembali ke dasbor</a>
</div>
