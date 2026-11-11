<script lang="ts">
	import '../app.css';
	import '@fontsource/plus-jakarta-sans/400.css';
	import '@fontsource/plus-jakarta-sans/600.css';
	import '@fontsource/plus-jakarta-sans/700.css';
	import '@fontsource/plus-jakarta-sans/800.css';
	import { page } from '$app/state';
	import LiveSync from '#lib/components/LiveSync.svelte';
	import ResidentShell from '#lib/components/ResidentShell.svelte';
	import RtShell from '#lib/components/RtShell.svelte';
	import { WifiOff } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const path = $derived(page.url.pathname);
	const onboarding = $derived(!data.user || data.user.setupStep !== 'done');
	const focused = $derived(path.startsWith('/siaga') || path.startsWith('/contoh'));
	let online = $state(true);

	onMount(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});
</script>

<svelte:head>
	<meta name="description" content="Jaringan siaga kelurahan. Kabar peringatan sampai, tetangga saling konfirmasi." />
</svelte:head>

{#if data.user && data.user.setupStep === 'done'}
	<LiveSync />
{/if}

{#if !online && !path.startsWith('/fasilitas')}
	<div class="res-shell">
		<div class="pad">
			<section class="offline">
				<WifiOff size={36} color="#5E4C51" />
				<p class="kicker">Sambungan terputus</p>
				<h1>Tidak ada koneksi</h1>
				<p class="lead">Beberapa data yang sudah tersimpan di perangkat masih bisa dilihat. Notifikasi baru dan peta fasilitas mungkin belum diperbarui.</p>
				<button class="btn primary" type="button" onclick={() => location.reload()}>Coba lagi</button>
				<a class="btn outline" href="/fasilitas">Lihat fasilitas yang tersimpan</a>
			</section>
		</div>
	</div>
{:else if onboarding || focused || !data.user}
	{@render children()}
{:else if data.user.role === 'warga'}
	<ResidentShell>{@render children()}</ResidentShell>
{:else}
	<RtShell user={data.user}>{@render children()}</RtShell>
{/if}
