import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppState, LiveMessage, PublicUser, User } from '../types';
import { SEED_VERSION } from './wilayah-data';
import { seedState } from './seed';

export interface MemoryBag {
	state: AppState;
	listeners: Set<(message: LiveMessage) => void>;
}

const globalBag = globalThis as typeof globalThis & { __fn?: MemoryBag };

function diskPath() {
	return join(process.cwd(), 'data', 'state.json');
}

function readDisk(): AppState | null {
	try {
		const parsed = JSON.parse(readFileSync(diskPath(), 'utf8')) as AppState;
		if (parsed.version !== SEED_VERSION) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function bag(): MemoryBag {
	if (!globalBag.__fn) {
		globalBag.__fn = { state: readDisk() ?? seedState(), listeners: new Set() };
	}
	return globalBag.__fn;
}

export function state(): AppState {
	return bag().state;
}

export function persist() {
	const dir = join(process.cwd(), 'data');
	mkdirSync(dir, { recursive: true });
	writeFileSync(diskPath(), JSON.stringify(bag().state));
}

export function emit(message: LiveMessage = { type: 'update', at: new Date().toISOString() }) {
	persist();
	for (const listener of bag().listeners) listener(message);
}

export function subscribe(listener: (message: LiveMessage) => void) {
	bag().listeners.add(listener);
	return () => bag().listeners.delete(listener);
}

export function toPublic(user: User): PublicUser {
	const { passwordHash: _password, pushSubscription: _push, ...rest } = user;
	return rest;
}
