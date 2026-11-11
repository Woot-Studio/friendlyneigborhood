<script lang="ts">
	import { ripple } from '#lib/ripple';
	import { formatWib } from '#lib/domain';
	import { ChevronLeft, Send, Users } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let audience = $state(form?.audience ?? 'semua');
	let body = $state(form?.body ?? data.draft);
</script>

<svelte:head><title>Kirim pengumuman · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<a class="back" href="/rt"><ChevronLeft size={20} /> Kirim pengumuman</a>
	<h1>Kirim pengumuman</h1>
	<p class="lead">Pengumuman dikirim ke warga yang terdaftar di kelurahan.</p>
	{#if form?.sent}<p class="chip aman">Pengumuman tercatat dan muncul di beranda warga.</p>{/if}
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<form class="stack" method="POST">
		<fieldset class="stack-s" style="border:0; padding:0;">
			<legend class="label">Penerima</legend>
			<label class="choice" class:selected={audience === 'semua'}>
				<span class="mark"><Users size={18} /></span>
				<span class="copy"><strong>Semua warga kelurahan</strong><p>8 warga terdaftar, atau semua yang ada di kelurahan ini.</p></span>
				<input type="radio" name="audience" value="semua" bind:group={audience} />
				<span class="radio"></span>
			</label>
			<label class="choice" class:selected={audience === 'rentan'}>
				<span class="mark"><Users size={18} /></span>
				<span class="copy"><strong>Kelompok rentan saja</strong><p>Lansia, disabilitas, atau punya bayi.</p></span>
				<input type="radio" name="audience" value="rentan" bind:group={audience} />
				<span class="radio"></span>
			</label>
		</fieldset>
		<label class="field">
			<span>Isi pengumuman</span>
			<textarea name="body" bind:value={body} required minlength="8"></textarea>
		</label>
		{#if data.contoh}<p class="note"><span class="dot"></span> Tanpa kunci FCM, pengumuman tampil di aplikasi. Pesan jarak jauh menyusul setelah Web Push diatur.</p>{/if}
		<button class="btn primary" use:ripple><Send size={18} /> Kirim pengumuman</button>
	</form>
	{#if data.items.length}
		<section class="stack-s">
			<h2>Sudah dikirim</h2>
			{#each data.items as item (item.id)}
				<article class="card">
					<p class="muted">{formatWib(item.createdAt)} · {item.audience === 'rentan' ? 'Kelompok rentan' : 'Semua warga'}</p>
					<p>{item.body}</p>
				</article>
			{/each}
		</section>
	{/if}
</div>

<style>
	label.choice { position: relative; }
	label.choice input { position: absolute; opacity: 0; }
</style>
