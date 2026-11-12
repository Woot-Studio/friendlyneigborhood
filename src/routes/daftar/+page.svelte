<script lang="ts">
	import AuthSplit from '#lib/components/AuthSplit.svelte';
	import { ripple } from '#lib/ripple';
	import { HandHelping, House, Shield } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let role = $state(form?.role ?? 'warga');
</script>

<svelte:head><title>Daftar · Friendly Neighborhood</title></svelte:head>

<AuthSplit>
<main class="pad sheet stack" style="padding-top: 28px;">
	<div>
		<p class="kicker">Akun baru</p>
		<h1>Buat akun</h1>
		<p class="lead">Isi data diri. Pilih peran sesuai tugas Anda di kelurahan.</p>
	</div>
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<form class="stack" method="POST">
		<label class="field">
			<span>Nama lengkap</span>
			<input name="fullName" required value={form?.fullName ?? ''} placeholder="Nama lengkap" />
		</label>
		<label class="field">
			<span>Nomor HP</span>
			<input name="phone" inputmode="tel" required value={form?.phone ?? ''} placeholder="081234567890" />
			<small class="muted">Nomor ini dipakai untuk masuk dan menghubungi saat siaga.</small>
		</label>
		<label class="field">
			<span>Kata sandi</span>
			<input name="password" type="password" minlength="8" required placeholder="Minimal 8 karakter" />
		</label>
		<fieldset class="stack-s" style="border:0; padding:0; margin:0;">
			<legend class="label">Peran</legend>
			<label class="choice" class:selected={role === 'warga'}>
				<span class="mark"><House size={18} /></span>
				<span class="copy">
					<strong>Warga</strong>
					<p>Menerima kabar siaga dan mengonfirmasi kondisi.</p>
				</span>
				<input type="radio" name="role" value="warga" bind:group={role} />
				<span class="radio"></span>
			</label>
			<label class="choice" class:selected={role === 'rt'}>
				<span class="mark"><Shield size={18} /></span>
				<span class="copy">
					<strong>Ketua RT</strong>
					<p>Melihat dasbor warga dan mengecek yang belum merespons.</p>
				</span>
				<input type="radio" name="role" value="rt" bind:group={role} />
				<span class="radio"></span>
			</label>
			<label class="choice" class:selected={role === 'relawan'}>
				<span class="mark"><HandHelping size={18} /></span>
				<span class="copy">
					<strong>Relawan</strong>
					<p>Membantu ketua RT mengecek warga yang membutuhkan.</p>
				</span>
				<input type="radio" name="role" value="relawan" bind:group={role} />
				<span class="radio"></span>
			</label>
		</fieldset>
		<button class="btn primary" use:ripple type="submit">Lanjut</button>
	</form>
	<p class="muted">Sudah punya akun? <a href="/masuk">Masuk</a></p>
</main>
</AuthSplit>

<style>
	label.choice input { position: absolute; opacity: 0; }
	label.choice { position: relative; }
</style>
