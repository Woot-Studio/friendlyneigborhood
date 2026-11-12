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

async function openSari() {
	const context = await browser.createBrowserContext();
	const page = await context.newPage();
	page.setDefaultTimeout(12000);
	await page.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
		page.evaluate(() => {
			[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Sari'))?.click();
		})
	]);
	return { context, page };
}

const jobs = [
	['siaga-1440x900', 1440, 900, siaga],
	['siaga-1024x768', 1024, 768, siaga],
	['siaga-392', 392, 848, siaga],
	['bantuan-1440x900', 1440, 900, `${siaga}/bantuan`],
	['bantuan-1024x768', 1024, 768, `${siaga}/bantuan`],
	['contoh-siaga-1440x900', 1440, 900, '/contoh/siaga'],
	['contoh-siaga-1024x768', 1024, 768, '/contoh/siaga'],
	['cuaca-1440x900', 1440, 900, '/cuaca'],
	['cuaca-1024x768', 1024, 768, '/cuaca'],
	['fasilitas-1440x900', 1440, 900, '/fasilitas'],
	['fasilitas-1024x768', 1024, 768, '/fasilitas'],
	['riwayat-1440x900', 1440, 900, '/riwayat'],
	['riwayat-1024x768', 1024, 768, '/riwayat'],
	['riwayat-detail-1440x900', 1440, 900, '/riwayat/22222222-2222-4222-8222-222222222201'],
	['riwayat-detail-1024x768', 1024, 768, '/riwayat/22222222-2222-4222-8222-222222222201'],
	['profil-1440x900', 1440, 900, '/profil'],
	['profil-1024x768', 1024, 768, '/profil'],
	['profil-hapus-1440x900', 1440, 900, '/profil/hapus'],
	['profil-hapus-1024x768', 1024, 768, '/profil/hapus'],
	['beranda-392', 392, 848, '/beranda']
];

for (const [file, w, h, path] of jobs) {
	const { context, page } = await openSari();
	try {
		await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
		await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 12000 });
		await new Promise((resolve) => setTimeout(resolve, 600));
		await page.screenshot({ path: `${out}/${file}.png` });
		console.log('ok', file);
	} catch (error) {
		console.log('fail', file, error instanceof Error ? error.message : error);
	}
	await context.close();
}

await browser.close();
