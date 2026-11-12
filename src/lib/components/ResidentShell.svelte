<script lang="ts">
	import { page } from '$app/state';
	import { House, MapPin, ScrollText, UserRound } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	const path = $derived(page.url.pathname);
	const items = [
		{ href: '/beranda', label: 'Beranda', icon: House },
		{ href: '/fasilitas', label: 'Fasilitas', icon: MapPin },
		{ href: '/riwayat', label: 'Riwayat', icon: ScrollText },
		{ href: '/profil', label: 'Profil', icon: UserRound }
	];
</script>

<div class="res-shell">
	<div class="pad">
		{@render children()}
	</div>
	<nav class="tabbar" aria-label="Navigasi warga">
		{#each items as item (item.href)}
			<a href={item.href} class:on={path === item.href || path.startsWith(`${item.href}/`)} aria-current={path === item.href ? 'page' : undefined}>
				<item.icon size={20} strokeWidth={2} />
				{item.label}
			</a>
		{/each}
	</nav>
</div>
