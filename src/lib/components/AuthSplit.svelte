<script lang="ts">
	import Logo from './Logo.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="auth-split">
	<aside class="auth-aside">
		<Logo size={56} />
		<p class="word">Friendly<br />Neighborhood</p>
		<p class="lead">Jaringan siaga kelurahan: kabar peringatan sampai, tetangga saling konfirmasi.</p>
		<ol class="stack" style="list-style: none; padding: 0; margin: 8px 0;">
			<li class="row">
				<span class="num">1</span>
				<div>
					<strong>Daftar di kelurahan Anda</strong>
					<p class="muted">Pilih wilayah sampai tingkat kelurahan, lalu tandai kerentanan bila perlu.</p>
				</div>
			</li>
			<li class="row">
				<span class="num">2</span>
				<div>
					<strong>Terima kabar siaga</strong>
					<p class="muted">Notifikasi dikirim saat ada peringatan cuaca atau gempa yang relevan.</p>
				</div>
			</li>
			<li class="row">
				<span class="num">3</span>
				<div>
					<strong>Konfirmasi kondisi</strong>
					<p class="muted">Tekan Saya aman atau Butuh bantuan. Ketua RT melihat siapa yang belum merespons.</p>
				</div>
			</li>
		</ol>
	</aside>
	<div class="auth-main">
		{@render children()}
	</div>
</div>
