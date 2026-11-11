// Penerusan ke server aplikasi. Angka agregat disusun di sana;
// fungsi ini tidak menerima nama, alamat, atau kerentanan individu.
Deno.serve(async (req) => {
	const secret = Deno.env.get('CRON_SECRET') ?? '';
	const auth = req.headers.get('Authorization') ?? '';
	if (secret && auth !== `Bearer ${secret}`) {
		return new Response('Tidak diizinkan.', { status: 401 });
	}
	const appUrl = Deno.env.get('APP_URL');
	if (!appUrl) return Response.json({ error: 'APP_URL belum diisi.' }, { status: 500 });
	const body = await req.text();
	const response = await fetch(`${appUrl.replace(/\/$/, '')}/api/ai/ringkasan`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${secret}`,
			'content-type': 'application/json'
		},
		body: body || '{}'
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json' }
	});
});
