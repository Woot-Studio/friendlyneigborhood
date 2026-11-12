<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Hapus data · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack form-frame">
	<a class="back" href="/profil"><ChevronLeft size={20} /> Hapus data saya</a>
	<h1>Hapus data saya</h1>
	<p class="lead">Data akun, kerentanan, langganan notifikasi, dan riwayat respons Anda akan dihapus dari kelurahan ini. Tindakan ini tidak bisa dibatalkan.</p>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<form class="stack" method="POST">
		<label class="choice">
			<input type="checkbox" name="yakin" value="ya" />
			<span>Saya mengerti data saya akan dihapus.</span>
		</label>
		<button class="btn urgent" type="submit">Hapus permanen</button>
	</form>
</div>
