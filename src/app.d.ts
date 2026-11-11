/// <reference types="node" />
import type { PublicUser } from '#lib/types';

declare global {
	namespace App {
		interface Locals {
			user: PublicUser | null;
		}
	}
}

export {};
