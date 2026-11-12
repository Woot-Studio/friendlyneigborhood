<script lang="ts">
	import { page } from '$app/state';
	import { roleLabel, initials } from '#lib/domain';
	import type { PublicUser } from '#lib/types';
	import {
		Building2,
		House,
		MapPin,
		Megaphone,
		ScrollText,
		Siren,
		UserRound,
		Users
	} from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import Logo from './Logo.svelte';

	let { user, children }: { user: PublicUser; children: Snippet } = $props();
	const path = $derived(page.url.pathname);
	const contoh = $derived(Boolean(page.data.contoh));

	const links = [
		{ href: '/rt', label: 'Dasbor RT', icon: House },
		{ href: '/kelurahan', label: 'Panel Kelurahan', icon: Building2 },
		{ href: '/fasilitas', label: 'Fasilitas', icon: MapPin },
		{ href: '/riwayat', label: 'Riwayat', icon: ScrollText },
		{ href: '/profil', label: 'Profil', icon: UserRound },
		{ href: '/rt#daftar', label: 'Daftar warga', icon: Users },
		{ href: '/rt/pengumuman', label: 'Pengumuman', icon: Megaphone },
		{ href: '/rt/simulasi', label: 'Simulasi siaga', icon: Siren }
	];

	function active(href: string) {
		if (href === '/rt') return path === '/rt' || path.startsWith('/rt/warga');
		if (href.startsWith('/rt#')) return path === '/rt';
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<div class="rt-shell">
	<aside class="rt-side">
		<div class="row" style="padding: 4px 8px 16px; gap: 10px;">
			<Logo size={40} />
			<div>
				<strong style="display:block; line-height:1.1;">Friendly<br />Neighborhood</strong>
				<span class="muted">{contoh ? 'Prototipe desain' : 'Jaringan siaga kelurahan'}</span>
			</div>
		</div>
		{#each links as link (link.href)}
			<a class="side-link" class:on={active(link.href)} href={link.href}>
				<link.icon size={18} />
				{link.label}
			</a>
		{/each}
		<div style="margin-top:auto; padding:12px 8px;" class="row">
			<span class="avatar">{initials(user.fullName)}</span>
			<div>
				<strong style="display:block;">{user.fullName}</strong>
				<span class="muted">{roleLabel(user.role)}{page.data.kelurahanLabel ? `, ${page.data.kelurahanLabel}` : ''}</span>
			</div>
		</div>
	</aside>
	<div class="rt-main">
		{@render children()}
	</div>
	<nav class="tabbar" aria-label="Navigasi ketua RT">
		<a href="/rt" class:on={path === '/rt' || path.startsWith('/rt/warga')}><House size={20} />RT</a>
		<a href="/kelurahan" class:on={path.startsWith('/kelurahan')}><Building2 size={20} />Kelurahan</a>
		<a href="/fasilitas" class:on={path.startsWith('/fasilitas')}><MapPin size={20} />Fasilitas</a>
		<a href="/riwayat" class:on={path.startsWith('/riwayat')}><ScrollText size={20} />Riwayat</a>
		<a href="/profil" class:on={path.startsWith('/profil')}><UserRound size={20} />Profil</a>
	</nav>
</div>
