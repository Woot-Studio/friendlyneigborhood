<script lang="ts">
	import { forecastBlurb, formatWib, statusLabel, vulnLabels } from '#lib/domain';
	import { Bell, ChevronRight, Cloud, CloudRain, CloudSun, MapPin, Shield } from '@lucide/svelte';
	import type { ForecastDay } from '#lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const kel = $derived(data.path.find((item) => item.level === 'kelurahan'));
	const labels = $derived(vulnLabels(data.user?.vulnerability));

	function iconFor(day: ForecastDay) {
		const name = day.weather.toLowerCase();
		if (name.includes('hujan')) return CloudRain;
		if (name.includes('cerah')) return CloudSun;
		return Cloud;
	}
</script>

<svelte:head><title>Beranda · Friendly Neighborhood</title></svelte:head>

<div class="home-grid stagger">
	<div class="home-intro">
		<div>
			<p class="kicker">Beranda warga</p>
			<h1>Halo, {data.user?.fullName.split(' ')[0]}</h1>
			<p class="lead">
				{#if data.event}
					Ada siaga aktif di kelurahan Anda.
				{:else}
					Tidak ada siaga aktif di kelurahan Anda saat ini.
				{/if}
			</p>
		</div>
		<div class="row" style="flex-wrap: wrap;">
			{#if kel}<span class="chip rose">Kel. {kel.altName}</span>{/if}
			{#if data.user?.rt}<span class="chip">RT {data.user.rt} / RW {data.user.rw}</span>{/if}
			{#each labels as label (label)}<span class="chip rose">{label}</span>{/each}
		</div>
	</div>

	<div class="home-status">
	{#if data.event}
		<a class="card" href="/siaga/{data.event.id}" style="display: block; color: inherit; border-color: {data.event.isSimulation ? '#E7D7B4' : '#E7C3B4'};">
			<div class="between">
				<strong>{data.event.isSimulation ? 'Siaga aktif · simulasi' : 'Siaga aktif'}</strong>
				{#if data.event.isSimulation}<span class="chip gold">SIMULASI</span>{/if}
			</div>
			<p style="margin-top:8px;">{data.event.headline}</p>
			<p class="muted">Wilayah peringatan: {data.event.areaLabel}</p>
			{#if data.checkin && data.checkin.status !== 'belum'}
				<p style="margin-top:8px;"><span class="chip {data.checkin.status}">{statusLabel(data.checkin.status)}</span></p>
			{/if}
		</a>
	{:else}
		<article class="card">
			<div class="calm">
				<span class="shield"><Shield size={20} /></span>
				<div>
					<strong>Kondisi tenang</strong>
					<p class="muted">Tidak perlu tindakan apa pun.</p>
				</div>
			</div>
			<div class="between" style="margin-top:12px;">
				<div>
					<p class="muted">Status terakhir Anda</p>
					{#if data.user?.lastStatusAt}<p class="muted">Dicatat {formatWib(data.user.lastStatusAt)}</p>{/if}
				</div>
				{#if data.user?.lastStatus}<span class="chip {data.user.lastStatus}">{statusLabel(data.user.lastStatus)}</span>{/if}
			</div>
		</article>
	{/if}
	</div>

	{#if data.news.length}
		<div class="home-news">
			{#each data.news as item (item.id)}
				<article class="card">
					<p class="kicker">Pengumuman RT</p>
					<p>{item.body}</p>
				</article>
			{/each}
		</div>
	{/if}

	<a class="card stack-s home-weather" href="/cuaca">
		<p class="kicker">Prakiraan cuaca kelurahan</p>
		<p class="row"><Cloud size={18} /> <strong>{data.days[0]?.weather}</strong> <span class="muted">{forecastBlurb(data.days)}</span></p>
		<div class="forecast">
			{#each data.days as day (day.label)}
				{@const Icon = iconFor(day)}
				<div class="day">
					<small>{day.label}</small>
					<Icon size={18} />
					<b>{day.tempC}°</b>
					<span>{day.weather}</span>
				</div>
			{/each}
		</div>
	</a>

	<a class="card card-link home-facilities" href="/fasilitas">
		<span class="mark"><MapPin size={18} /></span>
		<span><strong>Fasilitas terdekat</strong><span>Puskesmas, polisi, pemadam, calon posko</span></span>
		<ChevronRight size={18} />
	</a>
	{#if data.contoh}
		<div class="home-actions">
			{#if !data.event}
				<a class="card card-link" href="/contoh/siaga">
					<span class="mark"><Bell size={18} /></span>
					<span><strong>Lihat contoh layar siaga</strong><span>Pratinjau saat notifikasi masuk</span></span>
					<ChevronRight size={18} />
				</a>
			{/if}
			<p class="note"><span class="dot"></span> Lokasi, pencatatan, dan prakiraan BMKG di layar ini adalah contoh, bukan data live.</p>
		</div>
	{/if}
</div>
