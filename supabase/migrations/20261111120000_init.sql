-- Friendly Neighborhood
-- PostGIS, RLS, dan publikasi realtime.
-- pg_cron dijadwalkan di supabase/cron.sql setelah APP_URL diketahui.

create extension if not exists postgis;
create extension if not exists pg_trgm;

create table public.wilayah (
	id text primary key,
	parent_id text references public.wilayah (id),
	level text not null check (level in ('provinsi', 'kabupaten', 'kecamatan', 'kelurahan')),
	name text not null,
	alt_name text not null,
	lat double precision,
	lng double precision
);

create index wilayah_parent_idx on public.wilayah (parent_id);
create index wilayah_name_trgm on public.wilayah using gin (name gin_trgm_ops);

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text not null,
	phone text not null unique,
	role text not null check (role in ('warga', 'rt', 'relawan')),
	setup_step text not null default 'wilayah' check (setup_step in ('wilayah', 'kerentanan', 'izin', 'done')),
	kelurahan_id text references public.wilayah (id),
	rt text not null default '',
	rw text not null default '',
	address text not null default '',
	lat double precision,
	lng double precision,
	geog geography (Point, 4326),
	notify_enabled boolean not null default false,
	location_on_confirm boolean not null default true,
	last_status text,
	last_status_at timestamptz,
	created_at timestamptz not null default now()
);

create table public.vulnerabilities (
	profile_id uuid primary key references public.profiles (id) on delete cascade,
	lansia boolean not null default false,
	disabilitas boolean not null default false,
	bayi boolean not null default false,
	consent boolean not null default false,
	consent_at timestamptz,
	constraint vulnerability_needs_consent check (
		(not lansia and not disabilitas and not bayi) or consent
	)
);

create table public.events (
	id uuid primary key default gen_random_uuid(),
	kelurahan_id text not null references public.wilayah (id),
	kind text not null check (kind in ('cuaca', 'gempa', 'simulasi')),
	scenario text not null,
	title text not null,
	headline text not null,
	area_label text not null,
	coverage_note text not null,
	source_label text not null,
	is_simulation boolean not null default false,
	relevant boolean not null default true,
	started_at timestamptz not null default now(),
	ended_at timestamptz,
	external_id text
);

create unique index events_external_unique on public.events (kelurahan_id, external_id) where external_id is not null;
create index events_kelurahan_idx on public.events (kelurahan_id, started_at desc);

create table public.checkins (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.events (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	status text not null check (status in ('belum', 'aman', 'butuh', 'dicek', 'dibantu')),
	prior_status text,
	help_type text check (help_type in ('evakuasi', 'medis', 'logistik', 'lainnya')),
	note text not null default '',
	lat double precision,
	lng double precision,
	geog geography (Point, 4326),
	location_label text not null default '',
	claimed_by uuid references public.profiles (id) on delete set null,
	claimed_at timestamptz,
	updated_at timestamptz not null default now(),
	unique (event_id, profile_id)
);

create index checkins_event_idx on public.checkins (event_id);

create table public.facilities (
	id uuid primary key default gen_random_uuid(),
	kelurahan_id text not null references public.wilayah (id),
	external_id text not null,
	kind text not null,
	name text not null,
	lat double precision not null,
	lng double precision not null,
	geog geography (Point, 4326),
	distance_m integer not null,
	shelter_confirmed boolean not null default false,
	confirmed_by uuid references public.profiles (id) on delete set null,
	confirmed_at timestamptz,
	source text not null default 'api',
	fetched_at timestamptz not null default now(),
	unique (kelurahan_id, external_id)
);

create table public.announcements (
	id uuid primary key default gen_random_uuid(),
	kelurahan_id text not null references public.wilayah (id),
	author_id uuid references public.profiles (id) on delete set null,
	body text not null,
	audience text not null check (audience in ('semua', 'rentan')),
	created_at timestamptz not null default now()
);

create table public.push_subscriptions (
	profile_id uuid primary key references public.profiles (id) on delete cascade,
	endpoint text not null,
	p256dh text not null,
	auth text not null,
	updated_at timestamptz not null default now()
);

create or replace function public.sync_geog()
returns trigger
language plpgsql
as $$
begin
	if new.lat is not null and new.lng is not null then
		new.geog := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
	else
		new.geog := null;
	end if;
	return new;
end
$$;

create trigger profiles_geog before insert or update of lat, lng on public.profiles
for each row execute function public.sync_geog();
create trigger checkins_geog before insert or update of lat, lng on public.checkins
for each row execute function public.sync_geog();
create trigger facilities_geog before insert or update of lat, lng on public.facilities
for each row execute function public.sync_geog();

create or replace function public.is_staff(target_kelurahan text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.profiles
		where id = auth.uid()
			and role in ('rt', 'relawan')
			and kelurahan_id = target_kelurahan
	);
$$;

create or replace function public.same_kelurahan(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles me
		join public.profiles owner on owner.id = owner_id
		where me.id = auth.uid()
			and me.kelurahan_id is not null
			and me.kelurahan_id = owner.kelurahan_id
	);
$$;

alter table public.wilayah enable row level security;
alter table public.profiles enable row level security;
alter table public.vulnerabilities enable row level security;
alter table public.events enable row level security;
alter table public.checkins enable row level security;
alter table public.facilities enable row level security;
alter table public.announcements enable row level security;
alter table public.push_subscriptions enable row level security;

create policy wilayah_read on public.wilayah for select using (true);

create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles for select using (public.is_staff(kelurahan_id));
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert with check (id = auth.uid());
create policy profiles_delete_own on public.profiles for delete using (id = auth.uid());

create policy vuln_own on public.vulnerabilities
	for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy vuln_staff_read on public.vulnerabilities
	for select using (public.is_staff((select kelurahan_id from public.profiles where id = profile_id)));

create policy events_read on public.events for select using (
	exists (
		select 1 from public.profiles me
		where me.id = auth.uid() and me.kelurahan_id = events.kelurahan_id
	)
);
create policy events_staff_write on public.events for insert with check (public.is_staff(kelurahan_id));
create policy events_staff_update on public.events for update using (public.is_staff(kelurahan_id));

create policy checkins_own on public.checkins
	for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy checkins_staff on public.checkins
	for select using (
		exists (
			select 1 from public.events e
			where e.id = checkins.event_id and public.is_staff(e.kelurahan_id)
		)
	);
create policy checkins_staff_update on public.checkins
	for update using (
		exists (
			select 1 from public.events e
			where e.id = checkins.event_id and public.is_staff(e.kelurahan_id)
		)
	);

create policy facilities_read on public.facilities for select using (
	exists (
		select 1 from public.profiles me
		where me.id = auth.uid() and me.kelurahan_id = facilities.kelurahan_id
	)
);
create policy facilities_staff_write on public.facilities
	for all using (public.is_staff(kelurahan_id)) with check (public.is_staff(kelurahan_id));

create policy announcements_read on public.announcements for select using (
	exists (
		select 1 from public.profiles me
		where me.id = auth.uid()
			and me.kelurahan_id = announcements.kelurahan_id
			and (
				me.role <> 'warga'
				or announcements.audience = 'semua'
				or exists (
					select 1 from public.vulnerabilities v
					where v.profile_id = me.id and v.consent and (v.lansia or v.disabilitas or v.bayi)
				)
			)
	)
);
create policy announcements_staff_insert on public.announcements
	for insert with check (public.is_staff(kelurahan_id));

create policy push_own on public.push_subscriptions
	for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'checkins'
	) then
		alter publication supabase_realtime add table public.checkins;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
	) then
		alter publication supabase_realtime add table public.events;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements'
	) then
		alter publication supabase_realtime add table public.announcements;
	end if;
end $$;

alter table public.checkins replica identity full;
alter table public.events replica identity full;
alter table public.announcements replica identity full;
