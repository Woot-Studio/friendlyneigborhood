Deno.serve(async (req) => {
	const secret = Deno.env.get('CRON_SECRET') ?? '';
	const auth = req.headers.get('Authorization') ?? '';
	if (secret && auth !== `Bearer ${secret}` && auth !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`) {
		return new Response('Tidak diizinkan.', { status: 401 });
	}
	const appUrl = Deno.env.get('APP_URL');
	if (!appUrl) {
		return Response.json({ error: 'APP_URL belum diisi.' }, { status: 500 });
	}
	const response = await fetch(`${appUrl.replace(/\/$/, '')}/api/cron/poll`, {
		method: 'POST',
		headers: { authorization: `Bearer ${secret}` }
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json' }
	});
});
