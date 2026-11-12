import { storageBackend } from '#lib/server/db';
import { envVar } from '#lib/server/env';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const storage = await storageBackend();
	return json({
		ok: true,
		storage,
		apiIndonesiaConfigured: Boolean(envVar('API_INDONESIA_KEY')),
		llmConfigured: Boolean(envVar('LLM_API_KEY') || envVar('GEMINI_API_KEY')),
		webPushConfigured: Boolean(envVar('PUBLIC_VAPID_KEY') && envVar('VAPID_PRIVATE_KEY')),
		timestamp: new Date().toISOString()
	});
};
