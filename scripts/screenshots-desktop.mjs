import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const base = 'http://127.0.0.1:43721';
const out = '/opt/cursor/artifacts/screenshots-desktop';
const siaga = '/siaga/a8ab186a-00e5-41c0-9aa0-2c7c90a70649';
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
	executablePath: '/usr/bin/google-chrome',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});

async function session(who) {
	const context = await browser.createBrowserContext();
	const page = await context.newPage();
	page.setDefaultTimeout(15000);
	if (!who) return page;
	await page.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
		page.evaluate((label) => {
			[...document.querySelectorAll('button')].find((item) => item.textContent?.includes(label))?.click();
		}, who)
	]);
	return page;
}

async function shot(page, file, width, height, path) {
	await page.setViewport({ width, height, deviceScaleFactor: 1 });
	await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
	await new Promise((resolve) => setTimeout(resolve, 500));
	await page.screenshot({ path: `${out}/${file}.png` });
	console.log(file);
}

const sizes = [
	['1440x900', 1440, 900],
	['1024x768', 1024, 768]
];

const guestPages = [
	['splash', '/'],
	['mulai', '/mulai'],
	['masuk', '/masuk'],
	['daftar', '/daftar']
];
const wargaPages = [
	['wilayah', '/wilayah?prov=31&kab=31.73&kec=31.73.04&pilih=31.73.04.1001'],
	['izin', '/izin'],
	['kerentanan', '/kerentanan'],
	['beranda', '/beranda'],
	['siaga', siaga],
	['bantuan', `${siaga}/bantuan`],
	['contoh-siaga', '/contoh/siaga'],
	['cuaca', '/cuaca'],
	['fasilitas', '/fasilitas'],
	['riwayat', '/riwayat'],
	['riwayat-detail', '/riwayat/22222222-2222-4222-8222-222222222201'],
	['profil', '/profil'],
	['profil-hapus', '/profil/hapus']
];

const guest = await session(null);
for (const [name, path] of guestPages) {
	for (const [label, w, h] of sizes) await shot(guest, `${name}-${label}`, w, h, path);
}

const sari = await session('Sari');
for (const [name, path] of wargaPages) {
	for (const [label, w, h] of sizes) await shot(sari, `${name}-${label}`, w, h, path);
}
await shot(sari, 'beranda-392', 392, 848, '/beranda');
await shot(sari, 'siaga-392', 392, 848, siaga);

await browser.close();
console.log('done');
