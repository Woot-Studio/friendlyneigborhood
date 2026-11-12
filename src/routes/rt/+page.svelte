<script lang="ts">
	import { statusLabel, vulnLabels } from '#lib/domain';
	import MapView from '#lib/components/MapView.svelte';
	import { ripple } from '#lib/ripple';
	import { initials } from '#lib/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const filters = [
		{ id: 'semua', label: 'Semua' },
		{ id: 'belum', label: 'Belum merespons' },
		{ id: 'butuh', label: 'Butuh bantuan' },
		{ id: 'aman', label: 'Aman' }
	];
</script>

<svelte:head><title>Dasbor RT · Friendly Neighborhood</title></svelte:head>

<div class="stack">
	<div class="between" style="align-items:flex-start; flex-wrap:wrap;">
		<div>
			<div class="row">
				<h1>Dasbor RT</h1>
				{#if data.event?.isSimulation}<span class="chip gold">SIMULASI</span>{/if}
			</div>
			<p class="muted">{data.kelurahanLabel}</p>
		</div>
		{#if data.event}
			<div class="row" style="flex-wrap:wrap;">
				<form method="POST" action="?/abaikan">
					<button class="btn outline small" type="submit">Tandai tidak relevan</button>
				</form>
				<a class="btn primary small" href="/rt/ringkasan">Ringkasan</a>
			</div>
		{/if}
	</div>
	{#if form?.message}<p class="error">{form.message}</p>{/if}

	{#if !data.event}
		<section class="card stack-s">
			<p class="kicker">Tenang</p>
			<h2>Tidak ada siaga aktif</h2>
			<p class="lead">{data.kelurahanLabel} sedang tenang. Mulai simulasi siaga untuk menguji alur, atau buka daftar warga.</p>
		</section>
		<div class="stack">
			<a class="card" href="/rt/simulasi"><strong>Mulai simulasi siaga</strong><p class="muted">Notifikasi berlabel SIMULASI, bukan BMKG asli.</p></a>
			<a class="card" href="/rt/posko"><strong>Konfirmasi calon posko</strong><p class="muted">Tempat ibadah yang belum dikonfirmasi.</p></a>
			<a class="card" href="/rt/pengumuman"><strong>Kirim pengumuman</strong><p class="muted">Pesan ke warga kelurahan.</p></a>
		</div>
		<section id="daftar" class="stack-s">
			<h2>Daftar warga terdaftar</h2>
			<p class="muted">{data.people.length} warga di kelurahan ini.</p>
			{#each data.people as person (person.id)}
				<a class="person" href="/rt/warga/{person.id}">
					<span class="avatar">{initials(person.fullName)}</span>
					<span>
						<strong>{person.fullName}</strong>
						<span class="addr">{person.address || 'Alamat belum diisi'}</span>
						<span class="tags">
							{#each vulnLabels(person.vulnerability) as label (label)}<span class="chip rose">{label}</span>{/each}
						</span>
					</span>
				</a>
			{/each}
		</section>
		{#if data.contoh}
			<form method="POST" action="?/reset"><button class="btn ghost" type="submit">Kembalikan data contoh</button></form>
		{/if}
	{:else}
		<section class="banner">
			<strong>{data.event.isSimulation ? 'SIMULASI · BUKAN PERINGATAN BMKG ASLI' : 'SIAGA AKTIF'}</strong>
			{data.event.headline} {data.contoh ? 'Data warga dan jumlah status mengikuti respons yang masuk.' : ''}
		</section>
		<div class="dash-grid">
			<div class="stack">
				<div class="stats">
					<div class="stat aman"><b>{data.counts.aman}</b><span>Aman</span></div>
					<div class="stat butuh"><b>{data.counts.butuh}</b><span>Butuh bantuan</span></div>
					<div class="stat belum"><b>{data.counts.belum}</b><span>Belum merespons</span></div>
				</div>
				<p class="muted">Rekap dari {data.counts.total} warga{data.event.isSimulation ? ' dalam simulasi ini' : ''} · {data.counts.dicek} rumah sedang dicek relawan.</p>
				<div class="filters">
					{#each filters as item (item.id)}
						<a class:on={data.filter === item.id} href={item.id === 'semua' ? '/rt' : `/rt?saring=${item.id}`}>{item.label}</a>
					{/each}
				</div>
				<p class="muted">Warga rentan yang belum merespons ditampilkan di paling atas.</p>
				<div class="stack-s stagger" id="daftar">
					{#each data.rows as row (row.userId)}
						<article class="person">
							<a class="hit" href="/rt/warga/{row.userId}">
								<span class="row">
									<span class="avatar">{row.initials}</span>
									<span>
										<strong>{row.name}</strong>
										<span class="addr">{row.address}</span>
									</span>
								</span>
								<span class="tags">
									{#each row.vulnLabels as label (label)}<span class="chip rose">{label}</span>{/each}
									{#if row.status === 'dicek'}
										<span class="chip dicek">Sedang dicek · {row.claimedByShort}</span>
									{:else}
										<span class="chip {row.status}">{statusLabel(row.status)}</span>
									{/if}
								</span>
							</a>
							{#if row.status === 'belum' || row.status === 'butuh'}
								<form method="POST" action="?/cek">
									<input type="hidden" name="userId" value={row.userId} />
									<button class="btn primary small" use:ripple>Saya cek</button>
								</form>
							{/if}
						</article>
					{:else}
						<p class="card muted">Tidak ada warga pada saringan ini.</p>
					{/each}
				</div>
			</div>
			<div class="dash-map">
				<MapView
					label={data.contoh ? `Contoh peta ${data.kelurahanLabel}` : `Peta ${data.kelurahanLabel}`}
					center={data.center}
					points={data.all.map((row) => ({
						id: row.userId,
						lat: row.lat ?? data.center.lat,
						lng: row.lng ?? data.center.lng,
						status: row.status,
						label: row.name
					}))}
				/>
			</div>
		</div>
	{/if}
</div>
