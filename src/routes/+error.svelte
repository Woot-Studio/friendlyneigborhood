<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="pad sheet stack" style="padding-top: 48px;">
	<p class="kicker">Kendala</p>
	<h1>{page.status === 404 ? 'Halaman tidak ditemukan' : 'Ada kendala'}</h1>
	<p class="lead">{page.error?.message ?? 'Coba lagi beberapa saat.'}</p>
	<a class="btn primary" href="/beranda">Kembali</a>
</div>
