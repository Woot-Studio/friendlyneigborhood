import puppeteer from 'puppeteer-core';

const base = 'http://127.0.0.1:43721';
const out = '/opt/cursor/artifacts';

const browser = await puppeteer.launch({
	executablePath: '/usr/bin/google-chrome',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});

async function session(who) {
	const context = await browser.createBrowserContext();
	const page = await context.newPage();
	page.setDefaultTimeout(12000);
	await page.setViewport({ width: 392, height: 848, deviceScaleFactor: 1 });
	await page.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 }),
		page.evaluate((label) => {
			[...document.querySelectorAll('button')].find((item) => item.textContent?.includes(label))?.click();
		}, who)
	]);
	return page;
}

async function go(page, path, name, width = 392, height = 848) {
	await page.setViewport({ width, height, deviceScaleFactor: 1 });
	await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 12000 });
	await new Promise((resolve) => setTimeout(resolve, 700));
	await page.screenshot({ path: `${out}/${name}.png` });
	console.log(name, page.url());
}

const sari = await session('Sari');
await go(sari, '/wilayah?prov=31&kab=31.73&kec=31.73.04&pilih=31.73.04.1001', 'kelurahan-392');
await go(sari, '/contoh/siaga', 'siaga-contoh-392');
const siaga = await sari.evaluate(() => {
	return null;
});
await sari.goto(`${base}/beranda`, { waitUntil: 'domcontentloaded' });
const href = await sari.evaluate(() => document.querySelector('a[href^="/siaga/"]')?.getAttribute('href'));
if (href) {
	await go(sari, href, 'siaga-simulasi-392');
	await go(sari, `${href}/bantuan`, 'bantuan-392');
}
void siaga;

const dina = await session('Dina');
await go(dina, '/rt/simulasi', 'simulasi-392');
await go(dina, '/rt', 'dasbor-rt-392');
await go(dina, '/rt', 'dasbor-rt-1440', 1440, 900);
await go(dina, '/rt/ringkasan', 'ringkasan-392');
await go(dina, '/rt/posko', 'posko-392');
await go(dina, '/rt/pengumuman?draf=posko', 'pengumuman-392');
await go(dina, '/rt/warga/11111111-1111-4111-8111-111111111102', 'detail-warga-392');

const guest = await browser.newPage();
await guest.setViewport({ width: 392, height: 848, deviceScaleFactor: 1 });
await guest.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await guest.screenshot({ path: `${out}/splash-392.png` });
await guest.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
await guest.screenshot({ path: `${out}/masuk-392.png` });
console.log('guest');
await browser.close();
