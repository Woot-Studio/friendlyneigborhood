import puppeteer from 'puppeteer-core';

const base = 'http://127.0.0.1:43721';
const out = '/opt/cursor/artifacts';
const browser = await puppeteer.launch({
	executablePath: '/usr/bin/google-chrome',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
page.setDefaultTimeout(12000);
await page.goto(`${base}/masuk`, { waitUntil: 'domcontentloaded' });
await Promise.all([
	page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
	page.evaluate(() => {
		[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Dina'))?.click();
	})
]);
await page.evaluate(async () => {
	await fetch('/rt?/reset', { method: 'POST', headers: { origin: location.origin } });
});
await page.goto(`${base}/rt/simulasi`, { waitUntil: 'domcontentloaded' });
await Promise.all([
	page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
	page.evaluate(() => {
		[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Mulai simulasi'))?.click();
	})
]);
async function shot(name, width, height, path) {
	await page.setViewport({ width, height, deviceScaleFactor: 1 });
	if (path) await page.goto(base + path, { waitUntil: 'domcontentloaded' });
	await new Promise((resolve) => setTimeout(resolve, 800));
	await page.screenshot({ path: `${out}/${name}.png` });
	console.log(name, page.url());
}
await shot('dasbor-rt-392', 392, 848);
await shot('dasbor-rt-1440', 1440, 900);
await shot('ringkasan-392', 392, 848, '/rt/ringkasan');
await shot('detail-warga-392', 392, 848, '/rt/warga/11111111-1111-4111-8111-111111111102');
await shot('kelurahan-392', 392, 848, '/wilayah?prov=31&kab=31.73&kec=31.73.04&pilih=31.73.04.1001');
await browser.close();
