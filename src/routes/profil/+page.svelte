<script lang="ts">
	import { initials, roleLabel, vulnLabels } from '#lib/domain';
	import { ripple } from '#lib/ripple';
	import { LogOut, Trash } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const user = $derived(data.user!);
	const kel = $derived(data.path.find((item) => item.level === 'kelurahan'));
	const kab = $derived(data.path.find((item) => item.level === 'kabupaten'));
	const kec = $derived(data.path.find((item) => item.level === 'kecamatan'));
	const labels = $derived(vulnLabels(user.vulnerability));
</script>

<svelte:head><title>Profil · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<h1>Profil</h1>
	<section class="card row">
		<span class="avatar lg">{initials(user.fullName)}</span>
		<div>
			<h2 style="font-size:20px;">{user.fullName}</h2>
			<p class="muted">{roleLabel(user.role)}</p>
		</div>
	</section>
	<section class="card">
		<dl class="kv">
			<dt>Kelurahan</dt><dd>{kel ? `Kel. ${kel.altName}` : 'Belum dipilih'}</dd>
			<dt>Wilayah</dt><dd>{kec ? `Kec. ${kec.altName}` : ''}{kab ? `, ${kab.altName}` : ''}</dd>
			<dt>RT / RW</dt><dd>{user.rt || '–'} / {user.rw || '–'}</dd>
			<dt>Kerentanan</dt><dd>{labels.length ? labels.join(', ') : 'Tidak ditandai'}</dd>
			<dt>Nomor HP</dt><dd>{user.phone}</dd>
		</dl>
	</section>
	{#if form?.message && form.message !== 'Pengaturan disimpan.'}<p class="error">{form.message}</p>{/if}
	{#if form?.message === 'Pengaturan disimpan.'}<p class="chip aman">{form.message}</p>{/if}
	<form class="card stack" method="POST" action="?/simpan">
		<p class="kicker">Pengaturan</p>
		<label class="field"><span>RT</span><input name="rt" value={user.rt} /></label>
		<label class="field"><span>RW</span><input name="rw" value={user.rw} /></label>
		<label class="field"><span>Alamat rumah</span><input name="address" value={user.address} /></label>
		<label class="toggle">
			<input type="checkbox" name="notify" value="ya" checked={user.notifyEnabled} />
			<span><strong>Notifikasi siaga</strong><br /><span class="muted">Kabar peringatan meski aplikasi tertutup.</span></span>
		</label>
		<label class="toggle">
			<input type="checkbox" name="lokasi" value="ya" checked={user.locationOnConfirm} />
			<span><strong>Kirim lokasi saat konfirmasi</strong><br /><span class="muted">Hanya dikirim saat tombol siaga ditekan.</span></span>
		</label>
		<button class="btn primary" use:ripple>Simpan pengaturan</button>
		<a href="/wilayah">Ubah kelurahan</a>
		<a href="/kerentanan">Ubah kerentanan</a>
	</form>
	<form method="POST" action="?/keluar">
		<button class="btn outline" type="submit"><LogOut size={18} /> Keluar</button>
	</form>
	<a class="btn ghost" href="/profil/hapus" style="color:#B8501C;"><Trash size={18} /> Hapus data saya</a>
</div>
