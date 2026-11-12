export interface D1PreparedStatementLike {
	bind(...values: unknown[]): D1PreparedStatementLike;
	first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
	run(): Promise<{ success: boolean; meta?: { changes?: number; last_row_id?: number } }>;
}

export interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatementLike;
	batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
	exec(query: string): Promise<unknown>;
}

export interface WorkersAiLike {
	run(model: string, input: unknown): Promise<{ response?: string }>;
}

export interface RuntimeBindings {
	DB?: D1DatabaseLike;
	AI?: WorkersAiLike;
	[key: string]: unknown;
}

let cfModulePromise: Promise<{ env?: RuntimeBindings } | null> | null = null;
let cachedCfEnv: RuntimeBindings | null = null;

async function loadCfModule() {
	if (!cfModulePromise) {
		cfModulePromise = import('cloudflare:workers')
			.then((mod) => {
				const typed = mod as unknown as { env?: RuntimeBindings };
				cachedCfEnv = typed.env ?? null;
				return typed;
			})
			.catch(() => null);
	}
	return cfModulePromise;
}

export async function initRuntimeEnv(): Promise<RuntimeBindings | null> {
	const mod = await loadCfModule();
	return mod?.env ?? null;
}

export async function getD1(): Promise<D1DatabaseLike | null> {
	const env = await initRuntimeEnv();
	try {
		return env?.DB ?? null;
	} catch {
		return null;
	}
}

export async function getWorkersAi(): Promise<WorkersAiLike | null> {
	const env = await initRuntimeEnv();
	try {
		return env?.AI ?? null;
	} catch {
		return null;
	}
}

export function envVar(name: string): string | undefined {
	if (cachedCfEnv) {
		try {
			const val = cachedCfEnv[name];
			if (typeof val === 'string' && val.length > 0) return val;
		} catch {
			/* prerender or outside request context */
		}
	}
	const proc = typeof process !== 'undefined' ? process.env?.[name] : undefined;
	return proc && proc.length > 0 ? proc : undefined;
}
