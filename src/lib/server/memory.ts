import type { AppState, LiveMessage, PublicUser, User } from '../types';
import { seedState } from './seed';

export interface MemoryBag {
	state: AppState;
	listeners: Set<(message: LiveMessage, eventId?: number) => void>;
}

const globalBag = globalThis as typeof globalThis & { __fn?: MemoryBag };

export function bag(): MemoryBag {
	if (!globalBag.__fn) {
		globalBag.__fn = { state: seedState(), listeners: new Set() };
	}
	return globalBag.__fn;
}

export function state(): AppState {
	return bag().state;
}

export function emit(message: LiveMessage = { type: 'update', at: new Date().toISOString() }, eventId?: number) {
	for (const listener of bag().listeners) listener(message, eventId);
}

export function subscribe(listener: (message: LiveMessage, eventId?: number) => void) {
	bag().listeners.add(listener);
	return () => bag().listeners.delete(listener);
}

export function toPublic(user: User): PublicUser {
	const { passwordHash: _password, pushSubscription: _push, ...rest } = user;
	return rest;
}
