<script lang="ts">
	import { facilityKindLabel, formatDistance } from '#lib/domain';
	import MapView from '#lib/components/MapView.svelte';
	import { Building, ChevronRight, Flame, Fuel, Landmark, Shield } from '@lucide/svelte';
	import type { FacilityKind } from '#lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function iconFor(kind: FacilityKind) {
		if (kind === 'puskesmas') return Building;
		if (kind === 'polisi') return Shield;
		if (kind === 'pemadam_kebakaran') return Flame;
		if (kind === 'spbu') return Fuel;
		return Landmark;
	}
</script>

<svelte:head><title>Fasilitas terdekat · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<div>
		<h1>Fasilitas terdekat</h1>
		<p class="lead">Calon posko memakai rumah ibadah, dan baru resmi setelah dikonfirmasi petugas.</p>
	</div>
	<MapView
		label={data.contoh ? 'Contoh peta fasilitas' : 'Peta fasilitas'}
		center={data.center}
		points={data.items.map((item) => ({
			id: item.id,
			lat: item.lat,
			lng: item.lng,
			status: item.shelterConfirmed ? 'aman' : 'belum',
			label: item.name
		}))}
	/>
	<div class="stack-s stagger">
		{#each data.items as item (item.id)}
			{@const Icon = iconFor(item.kind)}
			<a class="card card-link" href="https://www.openstreetmap.org/?mlat={item.lat}&mlon={item.lng}#map=17/{item.lat}/{item.lng}" target="_blank" rel="noreferrer">
				<span class="mark"><Icon size={18} /></span>
				<span>
					<strong>{item.name}</strong>
					<span>
						{item.shelterConfirmed ? 'Posko resmi' : facilityKindLabel(item.kind)} · {formatDistance(item.distanceM)}
					</span>
				</span>
				<ChevronRight size={18} />
			</a>
		{:else}
			<p class="card">Belum ada fasilitas tersimpan untuk kelurahan ini.</p>
		{/each}
	</div>
	<p class="note"><span class="dot"></span> Berdasarkan data yang tersedia.{#if data.fromApi} © OpenStreetMap contributors.{/if}</p>
</div>
