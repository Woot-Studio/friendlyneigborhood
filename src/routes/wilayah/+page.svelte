<script lang="ts">
	import { wilayahTitle } from '#lib/domain';
	import { ripple } from '#lib/ripple';
	import AuthSplit from '#lib/components/AuthSplit.svelte';
	import { ChevronLeft, MapPin, Search } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const steps = [
		{ id: 'provinsi', label: 'Provinsi' },
		{ id: 'kabupaten', label: 'Kab/Kota' },
		{ id: 'kecamatan', label: 'Kecamatan' },
		{ id: 'kelurahan', label: 'Kelurahan' }
	] as const;
	const stepIndex = $derived(steps.findIndex((item) => item.id === data.level));

	function hrefFor(id: string) {
		const params = new URLSearchParams();
		if (data.prov) params.set('prov', data.prov);
		if (data.kab) params.set('kab', data.kab);
		if (data.kec) params.set('kec', data.kec);
		if (data.q) params.set('q', data.q);
		params.set('pilih', id);
		return `?${params.toString()}`;
	}

	const items = $derived(
		[...data.items].sort((a, b) => {
			if (a.id === data.pilih) return -1;
			if (b.id === data.pilih) return 1;
			return a.name.localeCompare(b.name, 'id');
		})
	);
	const nextHref = $derived.by(() => {
		if (!data.pilih) return '';
		if (data.level === 'provinsi') return `?prov=${data.pilih}`;
		if (data.level === 'kabupaten') return `?prov=${data.prov}&kab=${data.pilih}`;
		if (data.level === 'kecamatan') return `?prov=${data.prov}&kab=${data.kab}&kec=${data.pilih}`;
		return '';
	});
</script>

<svelte:head><title>Pilih kelurahan · Friendly Neighborhood</title></svelte:head>

<AuthSplit>
<main class="pad sheet stack" style="padding-top: 12px;">
	<a class="back" href={data.user?.setupStep === 'done' ? '/profil' : '/daftar'}><ChevronLeft size={20} /> Pilih kelurahan</a>
	<p class="lead">Pilih wilayah bertahap sampai tingkat kelurahan.</p>
	<ol class="steps" style="list-style:none; padding:0; margin:0;">
		{#each steps as step, index (step.id)}
			<li class:done={index < stepIndex} class:on={index === stepIndex}>
				<i></i>
				<span>{step.label}</span>
			</li>
		{/each}
	</ol>
	{#if data.selected.length}
		<div class="card stack-s">
			<p class="kicker">Wilayah terpilih</p>
			<p><strong>{data.selected.map((item) => item.altName).join(' · ')}</strong></p>
			<a href="/wilayah">Ubah</a>
		</div>
	{/if}
	{#if form?.message}<p class="error">{form.message}</p>{/if}
	<p class="muted">Langkah {stepIndex + 1} dari 4 · Pilih {steps[stepIndex].label.toLowerCase()}</p>
	<form class="search" method="GET">
		{#if data.prov}<input type="hidden" name="prov" value={data.prov} />{/if}
		{#if data.kab}<input type="hidden" name="kab" value={data.kab} />{/if}
		{#if data.kec}<input type="hidden" name="kec" value={data.kec} />{/if}
		<Search size={18} />
		<input name="q" value={data.q} placeholder={data.level === 'kelurahan' && data.selected.at(-1) ? `Cari di ${data.selected.at(-1)?.altName}` : `Cari ${steps[stepIndex].label.toLowerCase()}`} />
	</form>
	<div class="stack-s stagger">
		{#each items as item (item.id)}
			<a class="choice" class:selected={data.pilih === item.id} href={hrefFor(item.id)}>
				<span class="mark"><MapPin size={18} /></span>
				<span class="copy">
					<strong>{wilayahTitle(item)}</strong>
					{#if data.selected.at(-1)}<p>{data.level === 'kelurahan' ? `Kec. ${data.selected.at(-1)?.altName}` : data.selected.at(-1)?.altName}</p>{/if}
				</span>
				<span class="radio"></span>
			</a>
		{/each}
		{#if data.items.length === 0}
			<p class="card muted">Tidak ada wilayah yang cocok. Ubah kata pencarian.</p>
		{/if}
	</div>
	{#if data.level === 'kelurahan'}
		<form method="POST">
			<input type="hidden" name="kelurahanId" value={data.pilih ?? ''} />
			<button class="btn primary" use:ripple type="submit" disabled={!data.pilih}>Simpan kelurahan</button>
		</form>
	{:else if nextHref}
		<a class="btn primary" href={nextHref}>Lanjut</a>
	{:else}
		<button class="btn primary" type="button" disabled>Lanjut</button>
	{/if}
</main>
</AuthSplit>
