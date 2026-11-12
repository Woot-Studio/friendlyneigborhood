<script lang="ts">
	import AuthSplit from '#lib/components/AuthSplit.svelte';
	import Logo from '#lib/components/Logo.svelte';
</script>

<svelte:head><title>Mulai · Friendly Neighborhood</title></svelte:head>

<AuthSplit>
<main class="pad sheet stack" style="padding-top: 28px;">
	<span class="logo-mark" style="width:56px;height:56px;border-radius:16px;"><Logo size={56} /></span>
	<div>
		<h1>Friendly Neighborhood</h1>
		<p class="lead">Jaringan siaga kelurahan: kabar peringatan sampai, tetangga saling konfirmasi.</p>
	</div>
	<ol class="stack" style="list-style:none; padding:0; margin:8px 0;">
		<li class="card row">
			<span class="num">1</span>
			<div>
				<strong>Daftar di kelurahan Anda</strong>
				<p class="muted">Pilih wilayah sampai tingkat kelurahan, lalu tandai kerentanan bila perlu.</p>
			</div>
		</li>
		<li class="card row">
			<span class="num">2</span>
			<div>
				<strong>Terima kabar siaga</strong>
				<p class="muted">Notifikasi dikirim saat ada peringatan cuaca atau gempa yang relevan.</p>
			</div>
		</li>
		<li class="card row">
			<span class="num">3</span>
			<div>
				<strong>Konfirmasi kondisi</strong>
				<p class="muted">Tekan Saya aman atau Butuh bantuan. Ketua RT melihat siapa yang belum merespons.</p>
			</div>
		</li>
	</ol>
	<a class="btn primary" href="/masuk">Masuk</a>
	<a class="btn outline" href="/daftar">Daftar</a>
</main>
</AuthSplit>
