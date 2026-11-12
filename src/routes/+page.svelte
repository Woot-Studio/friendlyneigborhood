<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import AuthSplit from '#lib/components/AuthSplit.svelte';
	import Logo from '#lib/components/Logo.svelte';
</script>

<svelte:head><title>Friendly Neighborhood</title></svelte:head>

<AuthSplit>
<a class="splash" href="/mulai">
	<span class="logo-mark"><Logo size={72} /></span>
	<p class="word">Friendly<br />Neighborhood</p>
	<p class="lead">Jaringan siaga kelurahan</p>
	<span class="start-link">Ketuk untuk mulai <ChevronRight size={18} /></span>
</a>
</AuthSplit>
