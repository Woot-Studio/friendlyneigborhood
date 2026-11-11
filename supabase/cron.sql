-- Jalankan setelah migrasi, di SQL editor Supabase.
-- Ganti URL dan rahasia. Jangan menyimpan service role di repositori.
-- Peringatan dini di API Indonesia disegarkan kira-kira tiap jam,
-- jadi 30 menit sudah cukup dan menekan biaya.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
	'fn-poll-warnings',
	'*/30 * * * *',
	$$
	select net.http_post(
		url := 'https://PROJECT_REF.supabase.co/functions/v1/poll-warnings',
		headers := jsonb_build_object(
			'Authorization', 'Bearer SERVICE_ROLE_ATAU_CRON_SECRET',
			'Content-Type', 'application/json'
		),
		body := '{}'::jsonb
	);
	$$
);
