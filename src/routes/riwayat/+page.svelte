<script lang="ts">
	import { eventPhase, formatWib, phaseLabel } from '#lib/domain';
	import { ChevronRight, CloudRain, Siren } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Riwayat kejadian · Friendly Neighborhood</title></svelte:head>

<div class="sheet stack">
	<div>
		<p class="muted">Riwayat untuk {data.kelurahanLabel || 'kelurahan Anda'}.</p>
		<h1>Riwayat kejadian</h1>
	</div>
	{#if data.events.length === 0}
		<article class="card stack-s">
			<strong>Belum ada kejadian tercatat</strong>
			<p class="muted">Siaga dan simulasi di kelurahan ini akan muncul di sini setelah berlangsung.</p>
		</article>
	{:else}
		<div class="stack-s stagger">
			{#each data.events as event (event.id)}
				<a class="card" href="/riwayat/{event.id}" style="display:block; color:inherit;">
					<div class="between">
						<span class="row" style="align-items:flex-start;">
							<span class="mark">{#if event.isSimulation}<Siren size={18} />{:else}<CloudRain size={18} />{/if}</span>
							<span>
								<strong>{event.title}</strong>
								<span class="muted" style="display:block;">{formatWib(event.startedAt)}</span>
							</span>
						</span>
						<ChevronRight size={18} />
					</div>
					<div class="row" style="margin-top:10px;">
						<span class="chip {eventPhase(event) === 'berjalan' ? 'butuh' : 'belum'}">{phaseLabel(eventPhase(event))}</span>
						{#if event.isSimulation}<span class="chip gold">SIMULASI</span>{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
	<p class="note"><span class="dot"></span> Kejadian berlabel SIMULASI bukan peringatan BMKG asli.</p>
</div>
