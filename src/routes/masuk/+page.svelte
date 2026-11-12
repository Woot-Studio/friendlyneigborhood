<script lang="ts">
	import AuthSplit from '#lib/components/AuthSplit.svelte';
	import { ripple } from '#lib/ripple';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Masuk · Friendly Neighborhood</title></svelte:head>

<AuthSplit>
<main class="pad sheet stack" style="padding-top: 32px;">
	<div>
		<p class="kicker">Akun</p>
		<h1>Masuk</h1>
		<p class="lead">Gunakan nomor HP yang didaftarkan di kelurahan.</p>
	</div>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<form class="stack" method="POST">
		<label class="field">
			<span>Nomor HP</span>
			<input name="phone" inputmode="tel" autocomplete="username" required value={form?.phone ?? ''} placeholder="081234567890" />
		</label>
		<label class="field">
			<span>Kata sandi</span>
			<input name="password" type="password" autocomplete="current-password" required placeholder="Kata sandi" />
		</label>
		<button class="btn primary" use:ripple type="submit">Masuk</button>
	</form>
	<p class="muted">Belum punya akun? <a href="/daftar">Daftar</a></p>
	<section class="card stack-s">
		<p class="kicker">Demo kompetisi</p>
		<p class="muted">Kata sandi semua akun contoh: demo1234</p>
		<form method="POST">
			<input type="hidden" name="phone" value="081234567890" />
			<input type="hidden" name="password" value="demo1234" />
			<button class="btn outline" type="submit">Masuk sebagai Sari (warga)</button>
		</form>
		<form method="POST">
			<input type="hidden" name="phone" value="081300000001" />
			<input type="hidden" name="password" value="demo1234" />
			<button class="btn outline" type="submit">Masuk sebagai Dina (ketua RT)</button>
		</form>
	</section>
</main>
</AuthSplit>
