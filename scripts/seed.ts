import { createClient } from '@supabase/supabase-js';
import { seedState } from '../src/lib/server/seed';
import { DEMO_PASSWORD } from '../src/lib/server/seed';

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
	console.log('PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY kosong. Mode demo memakai data di memori; seed Supabase dilewati.');
	process.exit(0);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const state = seedState();

const { error: wilayahError } = await admin.from('wilayah').upsert(
	state.wilayah.map((item) => ({
		id: item.id,
		parent_id: item.parentId,
		level: item.level,
		name: item.name,
		alt_name: item.altName,
		lat: item.lat,
		lng: item.lng
	}))
);
if (wilayahError) throw wilayahError;

for (const user of state.users) {
	const email = `${user.phone}@warga.friendly.local`;
	const created = await admin.auth.admin.createUser({
		id: user.id,
		email,
		password: DEMO_PASSWORD,
		email_confirm: true
	});
	if (created.error && !created.error.message.toLowerCase().includes('already')) {
		throw created.error;
	}
	const { error } = await admin.from('profiles').upsert({
		id: user.id,
		full_name: user.fullName,
		phone: user.phone,
		role: user.role,
		setup_step: user.setupStep,
		kelurahan_id: user.kelurahanId,
		rt: user.rt,
		rw: user.rw,
		address: user.address,
		lat: user.lat,
		lng: user.lng,
		notify_enabled: user.notifyEnabled,
		location_on_confirm: user.locationOnConfirm,
		last_status: user.lastStatus,
		last_status_at: user.lastStatusAt
	});
	if (error) throw error;
	if (user.vulnerability) {
		const { error: vulnError } = await admin.from('vulnerabilities').upsert({
			profile_id: user.id,
			lansia: user.vulnerability.lansia,
			disabilitas: user.vulnerability.disabilitas,
			bayi: user.vulnerability.bayi,
			consent: user.vulnerability.consent,
			consent_at: user.vulnerability.consentAt
		});
		if (vulnError) throw vulnError;
	}
}

const { error: eventError } = await admin.from('events').upsert(
	state.events.map((item) => ({
		id: item.id,
		kelurahan_id: item.kelurahanId,
		kind: item.kind,
		scenario: item.scenario,
		title: item.title,
		headline: item.headline,
		area_label: item.areaLabel,
		coverage_note: item.coverageNote,
		source_label: item.sourceLabel,
		is_simulation: item.isSimulation,
		relevant: item.relevant,
		started_at: item.startedAt,
		ended_at: item.endedAt,
		external_id: item.externalId
	}))
);
if (eventError) throw eventError;

const { error: checkinError } = await admin.from('checkins').upsert(
	state.checkins.map((item) => ({
		id: item.id,
		event_id: item.eventId,
		profile_id: item.userId,
		status: item.status,
		prior_status: item.priorStatus,
		help_type: item.helpType,
		note: item.note,
		lat: item.lat,
		lng: item.lng,
		location_label: item.locationLabel,
		claimed_by: item.claimedBy,
		claimed_at: item.claimedAt,
		updated_at: item.updatedAt
	}))
);
if (checkinError) throw checkinError;

const { error: facilityError } = await admin.from('facilities').upsert(
	state.facilities.map((item) => ({
		id: item.id,
		kelurahan_id: item.kelurahanId,
		external_id: item.externalId,
		kind: item.kind,
		name: item.name,
		lat: item.lat,
		lng: item.lng,
		distance_m: item.distanceM,
		shelter_confirmed: item.shelterConfirmed,
		confirmed_by: item.confirmedBy,
		confirmed_at: item.confirmedAt,
		source: item.source
	}))
);
if (facilityError) throw facilityError;

console.log(`Seed Supabase selesai. Kata sandi demo: ${DEMO_PASSWORD}`);
