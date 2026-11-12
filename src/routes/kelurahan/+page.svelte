<script lang="ts">
	import MapView from '#lib/components/MapView.svelte';
	import { formatWib, helpLabel, statusLabel } from '#lib/domain';
	import { ripple } from '#lib/ripple';
	import { Clock, Lock, ShieldAlert, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const paragraphs = $derived(data.summary.text.split('\n\n'));
</script>

<svelte:head><title>Panel Kelurahan · Friendly Neighborhood</title></svelte:head>

<div class="stack">
	<div class="between" style="align-items:flex-start; flex-wrap:wrap;">
		<div>
			<p class="kicker">Smart Governance · Lintas-RT</p>
			<div class="row" style="flex-wrap:wrap;">
				<h1>Panel Kelurahan</h1>
				{#if data.event?.isSimulation}<span class="chip gold">SIMULASI</span>{/if}
				{#if data.sla.breached}<span class="chip solid">ESKALASI SLA AKTIF</span>{/if}
			</div>
			<p class="muted">{data.kelurahanLabel} · Pemantauan terpadu {data.rtGroups.length} RT ({data.peopleCount} warga terdaftar)</p>
		</div>
		<div class="row" style="flex-wrap:wrap;">
			<a class="btn outline small" href="/rt">Dasbor RT</a>
			<a class="btn outline small" href="/rt/posko">Posko ({data.poskoReady}/{data.poskoReady + data.poskoPending})</a>
		</div>
	</div>

	{#if form?.message}<p class="error">{form.message}</p>{/if}

	{#if !data.event}
		<section class="card stack-s">
			<p class="kicker">Status Wilayah</p>
			<h2>Tidak ada eskalasi aktif</h2>
			<p class="lead">Seluruh {data.rtGroups.length} RT di {data.kelurahanLabel} dalam kondisi tenang. Jika terjadi peringatan cuaca/gempa dan masih ada warga rentan atau butuh bantuan yang belum diklaim relawan lewat {data.slaMinutes} menit, kasus otomatis naik ke panel ini.</p>
			<div class="row" style="flex-wrap:wrap; margin-top:4px;">
				<form method="POST" action="?/mulaiSimulasi">
					<button class="btn primary small" use:ripple type="submit">Mulai simulasi hujan lebat</button>
				</form>
				<a class="btn outline small" href="/rt/simulasi">Pilih skenario lain</a>
			</div>
		</section>
	{:else}
		<section class={data.sla.breached ? 'card sla-alert stack-s' : 'banner stack-s'}>
			<div class="between" style="align-items:flex-start; flex-wrap:wrap;">
				<div class="stack-s" style="flex:1; min-width:240px;">
					<strong class="row">
						{#if data.sla.breached}
							<ShieldAlert size={16} /> BATAS SLA {data.slaMinutes} MENIT TERLAMPAUI · {data.sla.escalated.length} KASUS NAIK KE KELURAHAN
						{:else}
							<Clock size={16} /> PANTAUAN SLA RT · BERJALAN {data.sla.elapsedMin} DARI {data.slaMinutes} MENIT
						{/if}
					</strong>
					<p style="margin:0;">
						{data.event.headline}
						{#if data.sla.breached}
							Masih ada {data.sla.escalated.length} warga prioritas (rentan belum merespons / butuh bantuan) yang belum diklaim relawan tingkat RT setelah {data.sla.elapsedMin} menit.
						{:else}
							{data.sla.pendingCritical.length} warga prioritas sedang dalam jendela tindak lanjut RT (sisa {data.sla.remainingMin} menit sebelum eskalasi otomatis ke Kelurahan).
						{/if}
					</p>
				</div>
				{#if !data.sla.breached}
					<form method="POST" action="?/simulasiSla">
						<button class="btn primary small" use:ripple type="submit">Simulasikan lewat {data.slaMinutes} menit</button>
					</form>
				{/if}
			</div>
		</section>
	{/if}

	<div class="dash-grid">
		<div class="stack">
			<div class="stats">
				<div class="stat aman"><b>{data.counts.aman}</b><span>Aman / Dibantu</span></div>
				<div class="stat butuh"><b>{data.counts.butuh}</b><span>Butuh bantuan</span></div>
				<div class="stat belum"><b>{data.counts.rentanBelum}</b><span>Rentan belum dicek</span></div>
			</div>

			<section class="card stack-s">
				<div class="between" style="flex-wrap:wrap;">
					<div>
						<p class="kicker">Radar Bottleneck Lingkungan</p>
						<h2>Rekap lintas-RT</h2>
					</div>
					<span class="chip">{data.counts.dicek} sedang dicek relawan</span>
				</div>
				<div class="table-wrap">
					<table class="rt-table">
						<thead>
							<tr>
								<th>Wilayah</th>
								<th>Warga</th>
								<th>Aman</th>
								<th>Dicek</th>
								<th>Prioritas terbuka</th>
								<th>Status unit</th>
							</tr>
						</thead>
						<tbody>
							{#each data.rtGroups as group (`${group.rt}-${group.rw}`)}
								{@const critical = group.rentanBelum + group.butuh}
								<tr>
									<td><strong>RT {group.rt}</strong> <span class="muted">/ RW {group.rw}</span></td>
									<td>{group.total}</td>
									<td>{group.aman}</td>
									<td>{group.dicek}</td>
									<td>
										{#if critical > 0}
											<span class="chip butuh">{critical} warga</span>
										{:else}
											<span class="muted">0</span>
										{/if}
									</td>
									<td>
										{#if data.sla.breached && critical > 0}
											<span class="chip rose">Eskalasi Kelurahan</span>
										{:else if critical > 0}
											<span class="chip gold">Pantauan SLA RT</span>
										{:else}
											<span class="chip aman">Terkendali</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			{#if data.event}
				<section class="stack-s">
					<div class="between" style="flex-wrap:wrap;">
						<h2>{data.sla.breached ? 'Daftar eskalasi petugas Kelurahan' : 'Antrean prioritas yang dipantau'}</h2>
						<span class="muted">SLA {data.slaMinutes} menit</span>
					</div>
					{#each (data.sla.breached ? data.sla.escalated : data.sla.pendingCritical) as row (row.userId)}
						<article class="person">
							<a class="hit" href="/rt/warga/{row.userId}">
								<span class="row">
									<span class="avatar">{row.initials}</span>
									<span>
										<strong>{row.name}</strong>
										<span class="addr">RT {row.rt} / RW {row.rw} · {row.address}</span>
									</span>
								</span>
								<span class="tags">
									{#if data.sla.breached}<span class="chip solid">Lewat SLA</span>{/if}
									{#each row.vulnLabels as label (label)}<span class="chip rose">{label}</span>{/each}
									{#if row.helpType}<span class="chip butuh">Butuh: {helpLabel(row.helpType)}</span>{/if}
									<span class="chip {row.status}">{statusLabel(row.status)}</span>
								</span>
							</a>
							<form method="POST" action="?/cek">
								<input type="hidden" name="userId" value={row.userId} />
								<button class="btn primary small" use:ripple type="submit">Kerahkan petugas</button>
							</form>
						</article>
					{:else}
						<section class="card">
							<p class="muted">Seluruh warga rentan dan permintaan bantuan sudah diklaim relawan atau terkonfirmasi aman.</p>
						</section>
					{/each}
				</section>
			{/if}

			<section class="card stack-s">
				<div class="between" style="flex-wrap:wrap;">
					<div class="row">
						<Sparkles size={18} color="#8E2F4A" />
						<h2 style="font-size:18px;">Ringkasan Eksekutif AI (Agregat)</h2>
					</div>
					<span class="chip">{data.summary.source === 'llm' ? 'Gemini AI Aktif' : 'Templat Agregat'} · {formatWib(data.summaryAt)}</span>
				</div>
				{#each paragraphs as paragraph, index (index)}
					<p>{paragraph}</p>
				{/each}
				<div class="note" style="margin-top:4px;">
					<Lock size={15} style="flex:none; margin-top:2px;" />
					<span>Privasi terjaga: AI hanya menerima angka rekap kelurahan tanpa nama, nomor HP, alamat, atau titik GPS warga.</span>
				</div>
			</section>
		</div>

		<div class="dash-map">
			<MapView
				label={`Peta Komando ${data.kelurahanLabel}`}
				center={data.center}
				points={data.rows.map((row) => ({
					id: row.userId,
					lat: row.lat ?? data.center.lat,
					lng: row.lng ?? data.center.lng,
					status: row.status,
					label: `RT ${row.rt} · ${row.name}`
				}))}
			/>
		</div>
	</div>
</div>
