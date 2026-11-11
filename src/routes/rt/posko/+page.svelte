<script lang="ts">
	import { formatDistance, formatWib } from '#lib/domain';
	import { ChevronLeft, Landmark } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Konfirmasi calon posko · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<a class="back" href="/rt"><ChevronLeft size={20} /> Konfirmasi calon posko</a>
	<h1>Konfirmasi calon posko</h1>
	<p class="lead">Tempat ibadah tampil sebagai calon posko. Jadikan posko resmi setelah dikonfirmasi petugas atau pengelola.</p>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	{#each data.items as item (item.id)}
		<article class="card stack-s">
			<div class="row">
				<span class="mark"><Landmark size={18} /></span>
				<div>
					<strong>{item.name}</strong>
					<p class="muted">{item.shelterConfirmed ? 'Posko resmi' : 'Calon posko'} · {formatDistance(item.distanceM)}</p>
					{#if item.confirmedAt}<p class="muted">Dikonfirmasi {formatWib(item.confirmedAt)}</p>{/if}
				</div>
			</div>
			{#if item.shelterConfirmed}
				<span class="chip aman">Posko resmi</span>
			{:else}
				<form method="POST">
					<input type="hidden" name="id" value={item.id} />
					<button class="btn outline" type="submit">Konfirmasi jadi posko</button>
				</form>
			{/if}
		</article>
	{:else}
		<p class="card">Belum ada calon posko di data kelurahan ini.</p>
	{/each}
	<p class="note"><span class="dot"></span> Berdasarkan data yang tersedia. Konfirmasi hanya setelah ada izin petugas atau pengelola.</p>
	<a class="btn primary" href="/rt/pengumuman?draf=posko">Umumkan posko ke warga</a>
</div>
