import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), '.svelte-kit', 'cloudflare');
const workerPath = join(outDir, '_worker.js');
const innerPath = join(outDir, '_sveltekit_worker.js');
const assetsIgnorePath = join(outDir, '.assetsignore');

if (existsSync(workerPath)) {
	const current = readFileSync(workerPath, 'utf8');
	if (!current.includes('_sveltekit_worker.js')) {
		renameSync(workerPath, innerPath);
		const wrapper = `import skWorker from './_sveltekit_worker.js';

export default {
	fetch(request, env, ctx) {
		return skWorker.fetch(request, env, ctx);
	},
	scheduled(_controller, env, ctx) {
		const headers = new Headers({ 'x-internal-cron': '1' });
		if (env && typeof env.CRON_SECRET === 'string' && env.CRON_SECRET) {
			headers.set('authorization', \`Bearer \${env.CRON_SECRET}\`);
		}
		const req = new Request('https://internal.cron/api/cron/poll', {
			method: 'POST',
			headers
		});
		ctx.waitUntil(skWorker.fetch(req, env, ctx));
	}
};
`;
		writeFileSync(workerPath, wrapper);
	}

	if (existsSync(assetsIgnorePath)) {
		const ignore = readFileSync(assetsIgnorePath, 'utf8');
		if (!ignore.includes('_sveltekit_worker.js')) {
			writeFileSync(assetsIgnorePath, `${ignore.trimEnd()}\n_sveltekit_worker.js\n`);
		}
	}
}
