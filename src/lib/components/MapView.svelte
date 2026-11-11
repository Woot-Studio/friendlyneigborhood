<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type { CheckStatus } from '#lib/types';

	interface Point {
		id: string;
		lat: number;
		lng: number;
		status: CheckStatus;
		label: string;
	}

	let {
		points = [],
		center = { lat: -6.171, lng: 106.797 },
		label = 'Peta'
	}: {
		points?: Point[];
		center?: { lat: number; lng: number };
		label?: string;
	} = $props();

	let el: HTMLDivElement | null = $state(null);
	let map: import('leaflet').Map | null = null;
	let layer: import('leaflet').LayerGroup | null = null;

	function draw(L: typeof import('leaflet')) {
		if (!map || !layer) return;
		layer.clearLayers();
		for (const point of points) {
			if (point.lat == null || point.lng == null) continue;
			const icon = L.divIcon({
				className: 'map-pin',
				html: `<span class="map-dot ${point.status}"></span>`,
				iconSize: [14, 14],
				iconAnchor: [7, 7]
			});
			L.marker([point.lat, point.lng], { icon, title: point.label }).addTo(layer);
		}
	}

	onMount(() => {
		let alive = true;
		let leaflet: typeof import('leaflet') | null = null;
		(async () => {
			const L = await import('leaflet');
			if (!alive || !el) return;
			leaflet = L;
			map = L.map(el, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], 15);
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; OpenStreetMap'
			}).addTo(map);
			layer = L.layerGroup().addTo(map);
			draw(L);
		})();
		return () => {
			alive = false;
			map?.remove();
			map = null;
			leaflet = null;
		};
	});

	$effect(() => {
		points;
		center;
		if (!map || !layer) return;
		void import('leaflet').then((L) => {
			map?.setView([center.lat, center.lng], map.getZoom());
			draw(L);
		});
	});
</script>

<div class="map-card">
	<div class="map-frame" bind:this={el} role="img" aria-label={label}></div>
	<span class="map-label">{label}</span>
	<div class="legend">
		<span><i class="swatch" style="background:#276b4e"></i>Aman</span>
		<span><i class="swatch" style="background:#b8501c"></i>Butuh bantuan</span>
		<span><i class="swatch" style="background:#6b5754"></i>Belum merespons</span>
		<span><i class="swatch" style="background:#4a618c"></i>Sedang dicek</span>
	</div>
</div>
