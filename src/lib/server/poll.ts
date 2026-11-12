import { notifyKelurahan } from './push';
import { fetchAutogempa, fetchWarnings, hasApiKey } from './providers';
import { kelurahanWithResidents, openExternal } from './db';

export async function pollWarnings() {
	const places = await kelurahanWithResidents();
	const created: string[] = [];
	const errors: string[] = [];

	if (hasApiKey()) {
		const byProvince = new Map<string, typeof places>();
		for (const place of places) {
			const province = place.path.find((item) => item.level === 'provinsi');
			if (!province) continue;
			const list = byProvince.get(province.altName) ?? [];
			list.push(place);
			byProvince.set(province.altName, list);
		}
		for (const [province, group] of byProvince) {
			try {
				const warnings = await fetchWarnings(province);
				for (const warning of warnings) {
					const provinceName = (warning.province || '').toLowerCase();
					if (provinceName && !provinceName.includes(province.toLowerCase()) && !province.toLowerCase().includes(provinceName)) {
						continue;
					}
					for (const place of group) {
						const event = await openExternal({
							kelurahanId: place.id,
							externalId: warning.id,
							kind: 'cuaca',
							scenario: 'cuaca',
							title: warning.event || warning.headline || 'Peringatan dini cuaca',
							headline: warning.headline || warning.event || 'Peringatan dini cuaca BMKG',
							areaLabel: warning.area || warning.province || province,
							coverageNote: 'Tingkat provinsi, bukan kelurahan',
							sourceLabel: 'BMKG melalui API Indonesia'
						});
						if (event) {
							created.push(event.id);
							await notifyKelurahan(place.id, {
								title: `Siaga: ${event.headline}`,
								body: `${event.areaLabel}. Ketuk untuk memberi kabar.`,
								url: `/siaga/${event.id}`
							});
						}
					}
				}
			} catch (error) {
				errors.push(error instanceof Error ? error.message : 'Gagal membaca peringatan dini');
			}
		}
	}

	try {
		const gempa = await fetchAutogempa();
		if (gempa?.DateTime) {
			const blob = `${gempa.Wilayah ?? ''} ${gempa.Dirasakan ?? ''}`.toLowerCase();
			for (const place of places) {
				const names = place.path.map((item) => item.altName.toLowerCase()).filter((name) => name.length > 3);
				const relevant = names.some((name) => blob.includes(name));
				if (!relevant) continue;
				const event = await openExternal({
					kelurahanId: place.id,
					externalId: gempa.DateTime,
					kind: 'gempa',
					scenario: 'gempa',
					title: `Gempa M${gempa.Magnitude}`,
					headline: `Gempa M${gempa.Magnitude}. ${gempa.Wilayah}`,
					areaLabel: gempa.Wilayah,
					coverageNote: gempa.Potensi || 'Data gempa BMKG',
					sourceLabel: 'BMKG'
				});
				if (event) {
					created.push(event.id);
					await notifyKelurahan(place.id, {
						title: `Siaga: Gempa M${gempa.Magnitude}`,
						body: `${gempa.Wilayah}. Ketuk untuk memberi kabar.`,
						url: `/siaga/${event.id}`
					});
				}
			}
		}
	} catch (error) {
		errors.push(error instanceof Error ? error.message : 'Gagal membaca gempa BMKG');
	}

	return {
		created: created.length,
		apiIndonesia: hasApiKey(),
		kelurahan: places.length,
		errors
	};
}
