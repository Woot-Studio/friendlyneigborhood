import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const base = 'http://127.0.0.1:43721';
const out = '/opt/cursor/artifacts';
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
	executablePath: '/usr/bin/google-chrome',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});

async function login(browser, who) {
	const context = await browser.createBrowserContext();
	const page = await context.newPage();
	page.setDefaultTimeout(20000);
	await page.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
		page.evaluate((label) => {
			const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
			button?.click();
		}, who)
	]);
	return page;
}

async function shot(page, name, width, height) {
	await page.setViewport({ width, height, deviceScaleFactor: 1 });
	await new Promise((resolve) => setTimeout(resolve, 900));
	await page.screenshot({ path: `${out}/${name}.png` });
	console.log(name, page.url());
}

const dina = await login(browser, 'Dina');
if (!dina.url().includes('/rt')) throw new Error(`Dina masuk ke ${dina.url()}`);
await dina.goto(`${base}/rt`, { waitUntil: 'domcontentloaded' });
const reset = await dina.$('button');
await dina.evaluate(() => {
	const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Kembalikan'));
	if (button) button.click();
});
if (reset) await new Promise((resolve) => setTimeout(resolve, 600));

const sari = await login(browser, 'Sari');
if (!sari.url().includes('/beranda')) throw new Error(`Sari masuk ke ${sari.url()}`);
await shot(sari, 'beranda-392', 392, 848);
await sari.goto(`${base}/fasilitas`, { waitUntil: 'domcontentloaded' });
await shot(sari, 'fasilitas-392', 392, 848);
await sari.goto(`${base}/riwayat`, { waitUntil: 'domcontentloaded' });
await shot(sari, 'riwayat-392', 392, 848);
await sari.goto(`${base}/riwayat/22222222-2222-4222-8222-222222222201`, { waitUntil: 'domcontentloaded' });
await shot(sari, 'detail-kejadian-392', 392, 848);
await sari.goto(`${base}/profil`, { waitUntil: 'domcontentloaded' });
await shot(sari, 'profil-392', 392, 848);
await sari.goto(`${base}/kerentanan`, { waitUntil: 'domcontentloaded' });
await shot(sari, 'kerentanan-392', 392, 848);
await sari.goto(`${base}/wilayah?prov=31&kab=31.73&kec=31.73.04&pilih=31.73.04.1001`, {
	waitUntil: 'domcontentloaded'
});
await shot(sari, 'kelurahan-392', 392, 848);
await sari.goto(`${base}/contoh/siaga`, { waitUntil: 'domcontentloaded' });
await shot(sari, 'siaga-contoh-392', 392, 848);

await dina.goto(`${base}/rt/simulasi`, { waitUntil: 'domcontentloaded' });
await shot(dina, 'simulasi-392', 392, 848);
await Promise.all([
	dina.waitForNavigation({ waitUntil: 'domcontentloaded' }),
	dina.evaluate(() => {
		const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Mulai simulasi'));
		button?.click();
	})
]);
await shot(dina, 'dasbor-rt-392', 392, 848);
await shot(dina, 'dasbor-rt-1440', 1440, 900);
await dina.goto(`${base}/rt/ringkasan`, { waitUntil: 'domcontentloaded' });
await shot(dina, 'ringkasan-392', 392, 848);
await dina.goto(`${base}/rt/posko`, { waitUntil: 'domcontentloaded' });
await shot(dina, 'posko-392', 392, 848);
await dina.goto(`${base}/rt/pengumuman?draf=posko`, { waitUntil: 'domcontentloaded' });
await shot(dina, 'pengumuman-392', 392, 848);
const href = await dina.evaluate(() => document.querySelector('#daftar a.hit, #daftar a.person, a.hit')?.getAttribute('href'));
if (href) {
	await dina.goto(base + href, { waitUntil: 'domcontentloaded' });
	await shot(dina, 'detail-warga-392', 392, 848);
}

await sari.goto(`${base}/beranda`, { waitUntil: 'domcontentloaded' });
const siaga = await sari.evaluate(() => document.querySelector('a[href^="/siaga/"]')?.getAttribute('href'));
if (siaga) {
	await sari.goto(base + siaga, { waitUntil: 'domcontentloaded' });
	await shot(sari, 'siaga-simulasi-392', 392, 848);
	await sari.goto(`${base}${siaga}/bantuan`, { waitUntil: 'domcontentloaded' });
	await shot(sari, 'bantuan-392', 392, 848);
}

const guest = await browser.newPage();
await guest.setViewport({ width: 392, height: 848, deviceScaleFactor: 1 });
await guest.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await guest.screenshot({ path: `${out}/splash-392.png` });
await guest.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
await guest.screenshot({ path: `${out}/masuk-392.png` });
console.log('splash masuk');
await browser.close();
