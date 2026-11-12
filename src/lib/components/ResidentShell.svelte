<script lang="ts">
	import { page } from '$app/state';
	import { initials, roleLabel } from '#lib/domain';
	import type { PublicUser } from '#lib/types';
	import { CloudSun, House, MapPin, ScrollText, UserRound } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import Logo from './Logo.svelte';

	let {
		children,
		user,
		focused = false,
		desktop = true
	}: { children: Snippet; user: PublicUser; focused?: boolean; desktop?: boolean } = $props();
	const path = $derived(page.url.pathname);
	const contoh = $derived(Boolean(page.data.contoh));
	const tabItems = [
		{ href: '/beranda', label: 'Beranda', icon: House },
		{ href: '/fasilitas', label: 'Fasilitas', icon: MapPin },
		{ href: '/riwayat', label: 'Riwayat', icon: ScrollText },
		{ href: '/profil', label: 'Profil', icon: UserRound }
	];
	const sideItems = [
		{ href: '/beranda', label: 'Beranda', icon: House },
		{ href: '/riwayat', label: 'Riwayat', icon: ScrollText },
		{ href: '/fasilitas', label: 'Fasilitas', icon: MapPin },
		{ href: '/cuaca', label: 'Cuaca', icon: CloudSun },
		{ href: '/profil', label: 'Profil', icon: UserRound }
	];

	function active(href: string) {
		if (href === '/beranda') return path === '/beranda';
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<div class="res-shell" class:desktop class:focused>
	<aside class="res-side">
		<div class="row" style="padding: 4px 8px 16px; gap: 10px;">
			<Logo size={40} />
			<div>
				<strong style="display: block; line-height: 1.1;">Friendly<br />Neighborhood</strong>
				<span class="muted">{contoh ? 'Prototipe desain' : 'Jaringan siaga kelurahan'}</span>
			</div>
		</div>
		{#each sideItems as item (item.href)}
			<a class="side-link" class:on={active(item.href)} href={item.href} aria-current={active(item.href) ? 'page' : undefined}>
				<item.icon size={18} />
				{item.label}
			</a>
		{/each}
		<div class="row res-user">
			<span class="avatar">{initials(user.fullName)}</span>
			<div>
				<strong style="display: block;">{user.fullName}</strong>
				<span class="muted">{roleLabel(user.role)}{page.data.kelurahanLabel ? `, ${page.data.kelurahanLabel}` : ''}</span>
			</div>
		</div>
	</aside>
	<div class="pad">
		{@render children()}
	</div>
	<nav class="tabbar" aria-label="Navigasi warga">
		{#each tabItems as item (item.href)}
			<a href={item.href} class:on={active(item.href)} aria-current={active(item.href) ? 'page' : undefined}>
				<item.icon size={20} strokeWidth={2} />
				{item.label}
			</a>
		{/each}
	</nav>
</div>
