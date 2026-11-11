import type { Wilayah, WilayahLevel } from '../types';

export const TOMANG_ID = '31.73.04.1001';
export const SEED_VERSION = 1;

function w(
	id: string,
	parentId: string | null,
	level: WilayahLevel,
	name: string,
	altName = name,
	lat: number | null = null,
	lng: number | null = null
): Wilayah {
	return { id, parentId, level, name, altName, lat, lng };
}

function children(
	parentId: string,
	level: WilayahLevel,
	rows: Array<[string, string, number?, number?]>
): Wilayah[] {
	return rows.map(([suffix, name, lat, lng]) =>
		w(`${parentId}.${suffix}`, parentId, level, name, name, lat ?? null, lng ?? null)
	);
}

const grogol = '31.73.04';
const palmerah = '31.73.03';

export const wilayah: Wilayah[] = [
	w('11', null, 'provinsi', 'Aceh', 'Aceh', 4.7, 96.75),
	w('31', null, 'provinsi', 'Daerah Khusus Ibukota Jakarta', 'DKI Jakarta', -6.175, 106.827),
	w('32', null, 'provinsi', 'Jawa Barat', 'Jawa Barat', -6.917, 107.619),
	w('33', null, 'provinsi', 'Jawa Tengah', 'Jawa Tengah', -7.151, 110.14),
	w('34', null, 'provinsi', 'Daerah Istimewa Yogyakarta', 'DI Yogyakarta', -7.795, 110.369),
	w('35', null, 'provinsi', 'Jawa Timur', 'Jawa Timur', -7.536, 112.238),
	w('36', null, 'provinsi', 'Banten', 'Banten', -6.405, 106.064),
	w('51', null, 'provinsi', 'Bali', 'Bali', -8.409, 115.188),

	w('31.71', '31', 'kabupaten', 'Kota Administrasi Jakarta Pusat', 'Jakarta Pusat', -6.186, 106.834),
	w('31.72', '31', 'kabupaten', 'Kota Administrasi Jakarta Utara', 'Jakarta Utara', -6.138, 106.882),
	w('31.73', '31', 'kabupaten', 'Kota Administrasi Jakarta Barat', 'Jakarta Barat', -6.168, 106.76),
	w('31.74', '31', 'kabupaten', 'Kota Administrasi Jakarta Selatan', 'Jakarta Selatan', -6.261, 106.81),
	w('31.75', '31', 'kabupaten', 'Kota Administrasi Jakarta Timur', 'Jakarta Timur', -6.225, 106.9),

	w(palmerah, '31.73', 'kecamatan', 'Palmerah', 'Palmerah', -6.19, 106.797),
	w(grogol, '31.73', 'kecamatan', 'Grogol Petamburan', 'Grogol Petamburan', -6.166, 106.79),
	w('31.73.02', '31.73', 'kecamatan', 'Kebon Jeruk', 'Kebon Jeruk', -6.192, 106.769),
	w('31.73.05', '31.73', 'kecamatan', 'Tambora', 'Tambora', -6.147, 106.802),
	w('31.73.06', '31.73', 'kecamatan', 'Taman Sari', 'Taman Sari', -6.146, 106.82),
	w('31.73.07', '31.73', 'kecamatan', 'Cengkareng', 'Cengkareng', -6.148, 106.735),

	...children(grogol, 'kelurahan', [
		['1001', 'Tomang', -6.171, 106.797],
		['1002', 'Grogol', -6.164, 106.789],
		['1003', 'Jelambar', -6.159, 106.786],
		['1004', 'Jelambar Baru', -6.156, 106.789],
		['1005', 'Wijaya Kusuma', -6.166, 106.792],
		['1006', 'Tanjung Duren Utara', -6.176, 106.785],
		['1007', 'Tanjung Duren Selatan', -6.18, 106.784]
	]),
	...children(palmerah, 'kelurahan', [
		['1001', 'Palmerah', -6.19, 106.797],
		['1002', 'Kemanggisan', -6.186, 106.793],
		['1003', 'Slipi', -6.196, 106.798],
		['1004', 'Jatipulo', -6.184, 106.801]
	]),
	...children('31.73.02', 'kelurahan', [
		['1001', 'Kebon Jeruk'],
		['1002', 'Duri Kepa'],
		['1003', 'Sukabumi Utara']
	]),
	...children('31.73.05', 'kelurahan', [
		['1001', 'Tambora'],
		['1002', 'Roa Malaka'],
		['1003', 'Tanah Sareal']
	]),
	...children('31.73.06', 'kelurahan', [
		['1001', 'Pinangsia'],
		['1002', 'Maphar'],
		['1003', 'Keagungan']
	]),
	...children('31.73.07', 'kelurahan', [
		['1001', 'Cengkareng Barat'],
		['1002', 'Cengkareng Timur'],
		['1003', 'Duri Kosambi']
	]),

	w('31.71.01', '31.71', 'kecamatan', 'Gambir', 'Gambir'),
	...children('31.71.01', 'kelurahan', [
		['1001', 'Gambir'],
		['1002', 'Petojo Selatan']
	]),
	w('31.72.01', '31.72', 'kecamatan', 'Penjaringan', 'Penjaringan'),
	...children('31.72.01', 'kelurahan', [
		['1001', 'Penjaringan'],
		['1002', 'Pluit']
	]),
	w('31.74.07', '31.74', 'kecamatan', 'Kebayoran Baru', 'Kebayoran Baru'),
	...children('31.74.07', 'kelurahan', [
		['1001', 'Senayan'],
		['1002', 'Melawai']
	]),
	w('31.75.01', '31.75', 'kecamatan', 'Matraman', 'Matraman'),
	...children('31.75.01', 'kelurahan', [
		['1001', 'Utan Kayu Selatan'],
		['1002', 'Kebon Manggis']
	]),

	w('32.73', '32', 'kabupaten', 'Kota Bandung', 'Kota Bandung', -6.917, 107.619),
	w('32.73.01', '32.73', 'kecamatan', 'Sukasari', 'Sukasari'),
	...children('32.73.01', 'kelurahan', [
		['1001', 'Isola'],
		['1002', 'Sukarasa']
	]),
	w('33.74', '33', 'kabupaten', 'Kota Semarang', 'Kota Semarang'),
	w('33.74.01', '33.74', 'kecamatan', 'Semarang Tengah', 'Semarang Tengah'),
	...children('33.74.01', 'kelurahan', [
		['1001', 'Miroto'],
		['1002', 'Brumbungan']
	]),
	w('34.71', '34', 'kabupaten', 'Kota Yogyakarta', 'Kota Yogyakarta'),
	w('34.71.03', '34.71', 'kecamatan', 'Gondokusuman', 'Gondokusuman'),
	...children('34.71.03', 'kelurahan', [
		['1001', 'Demangan'],
		['1002', 'Terban']
	]),
	w('35.78', '35', 'kabupaten', 'Kota Surabaya', 'Kota Surabaya'),
	w('35.78.07', '35.78', 'kecamatan', 'Genteng', 'Genteng'),
	...children('35.78.07', 'kelurahan', [
		['1001', 'Genteng'],
		['1002', 'Embong Kaliasin']
	]),
	w('36.71', '36', 'kabupaten', 'Kota Tangerang', 'Kota Tangerang'),
	w('36.71.01', '36.71', 'kecamatan', 'Tangerang', 'Tangerang'),
	...children('36.71.01', 'kelurahan', [
		['1001', 'Sukarasa'],
		['1002', 'Suka Asih']
	]),
	w('51.71', '51', 'kabupaten', 'Kota Denpasar', 'Kota Denpasar'),
	w('51.71.01', '51.71', 'kecamatan', 'Denpasar Selatan', 'Denpasar Selatan'),
	...children('51.71.01', 'kelurahan', [
		['1001', 'Sanur'],
		['1002', 'Renon']
	]),
	w('11.71', '11', 'kabupaten', 'Kota Banda Aceh', 'Kota Banda Aceh'),
	w('11.71.01', '11.71', 'kecamatan', 'Baiturrahman', 'Baiturrahman'),
	...children('11.71.01', 'kelurahan', [
		['1001', 'Kampung Baru'],
		['1002', 'Neusu Jaya']
	])
];

export function findWilayah(list: Wilayah[], id: string | null | undefined): Wilayah | null {
	if (!id) return null;
	return list.find((item) => item.id === id) ?? null;
}

export function wilayahPath(list: Wilayah[], id: string | null): Wilayah[] {
	const path: Wilayah[] = [];
	let current = findWilayah(list, id);
	while (current) {
		path.unshift(current);
		current = findWilayah(list, current.parentId);
	}
	return path;
}
