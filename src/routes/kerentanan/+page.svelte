<script lang="ts">
	import { ripple } from '#lib/ripple';
	import AuthSplit from '#lib/components/AuthSplit.svelte';
	import { Accessibility, Baby, ChevronLeft, UserRound } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let lansia = $state(Boolean(data.user?.vulnerability?.lansia));
	let disabilitas = $state(Boolean(data.user?.vulnerability?.disabilitas));
	let bayi = $state(Boolean(data.user?.vulnerability?.bayi));
	let consent = $state(Boolean(data.user?.vulnerability?.consent));
	const needsConsent = $derived(lansia || disabilitas || bayi);
	const canSave = $derived(!needsConsent || consent);
</script>

<svelte:head><title>Tandai kerentanan · Friendly Neighborhood</title></svelte:head>

<AuthSplit>
<main class="pad sheet stack" style="padding-top: 12px;">
	<a class="back" href="/wilayah"><ChevronLeft size={20} /> Tandai kerentanan</a>
	<p class="lead">Langkah ini opsional. Data membantu ketua RT dan relawan memprioritaskan pengecekan jika Anda belum merespons.</p>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<form class="stack" method="POST">
		<label class="choice" class:selected={lansia}>
			<span class="mark"><UserRound size={18} /></span>
			<span class="copy"><strong>Lansia</strong><p>Saya termasuk kelompok lanjut usia.</p></span>
			<input type="checkbox" name="lansia" value="ya" bind:checked={lansia} />
			<span class="radio"></span>
		</label>
		<label class="choice" class:selected={disabilitas}>
			<span class="mark"><Accessibility size={18} /></span>
			<span class="copy"><strong>Disabilitas</strong><p>Saya atau anggota rumah yang terdaftar memiliki disabilitas.</p></span>
			<input type="checkbox" name="disabilitas" value="ya" bind:checked={disabilitas} />
			<span class="radio"></span>
		</label>
		<label class="choice" class:selected={bayi}>
			<span class="mark"><Baby size={18} /></span>
			<span class="copy"><strong>Punya bayi atau balita</strong><p>Di rumah ada bayi atau anak balita.</p></span>
			<input type="checkbox" name="bayi" value="ya" bind:checked={bayi} />
			<span class="radio"></span>
		</label>
		<label class="choice" class:selected={consent}>
			<span class="copy"><strong>Saya setuju data kerentanan ini hanya dilihat Ketua RT dan relawan di kelurahan saya.</strong></span>
			<input type="checkbox" name="consent" value="ya" bind:checked={consent} />
			<span class="radio"></span>
		</label>
		<button class="btn primary" use:ripple disabled={!canSave}>Simpan dan lanjut</button>
		<p class="muted">Tombol aktif setelah persetujuan dicentang bila ada kerentanan. Data bisa dihapus kapan saja di Profil.</p>
	</form>
	<form method="POST">
		<input type="hidden" name="lewati" value="ya" />
		<button class="btn ghost" type="submit">Lewati dulu</button>
	</form>
</main>
</AuthSplit>

<style>
	label.choice input { position: absolute; opacity: 0; pointer-events: none; }
	label.choice { position: relative; }
</style>
