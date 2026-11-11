<script lang="ts">
	import { ripple } from '#lib/ripple';
	import { ChevronLeft, CloudRain, Siren } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let scenario = $state('hujan_lebat');
</script>

<svelte:head><title>Simulasi siaga · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<a class="back" href="/rt"><ChevronLeft size={20} /> Simulasi siaga</a>
	<div class="between">
		<h1>Simulasi siaga</h1>
		<span class="chip gold">SIMULASI</span>
	</div>
	<section class="banner">
		<strong>INI MODE SIMULASI</strong>
		Simulasi tidak berasal dari peringatan BMKG asli. Notifikasi ke warga diberi label SIMULASI.
	</section>
	<p>Pilih satu skenario, lalu mulai simulasi.</p>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<form class="stack" method="POST">
		<label class="choice" class:selected={scenario === 'hujan_lebat'}>
			<span class="mark"><CloudRain size={18} /></span>
			<span class="copy">
				<strong>Hujan lebat</strong>
				<p>Peringatan dini cuaca tingkat provinsi untuk DKI Jakarta.</p>
			</span>
			<input type="radio" name="scenario" value="hujan_lebat" bind:group={scenario} />
			<span class="radio"></span>
		</label>
		<label class="choice" class:selected={scenario === 'gempa_dirasakan'}>
			<span class="mark"><Siren size={18} /></span>
			<span class="copy">
				<strong>Gempa dirasakan</strong>
				<p>Data gempa dirasakan, dipakai untuk simulasi validasi, bukan peringatan instan.</p>
			</span>
			<input type="radio" name="scenario" value="gempa_dirasakan" bind:group={scenario} />
			<span class="radio"></span>
		</label>
		<p class="note"><span class="dot"></span> Skenario dan kelurahan di layar ini memakai data kelurahan Anda. Tidak ada panggilan ke API luar.</p>
		<button class="btn primary" use:ripple>Mulai simulasi</button>
	</form>
</div>

<style>
	label.choice { position: relative; }
	label.choice input { position: absolute; opacity: 0; }
</style>
