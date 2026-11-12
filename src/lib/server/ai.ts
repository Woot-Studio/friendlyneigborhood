import { buildAggregate, llmMessages, scenarioLabel, templateSummary } from '#lib/domain';
import type { Aggregate } from '#lib/types';
import { currentAlert, facilities, placeLabel, residentBoard } from './db';
import { envVar, getWorkersAi } from './env';

export async function summarizeKelurahan(kelurahanId: string): Promise<{
	text: string;
	source: 'template' | 'llm';
	aggregate: Aggregate;
}> {
	const event = await currentAlert(kelurahanId);
	const [rows, facList, place] = await Promise.all([
		residentBoard(kelurahanId, event?.id ?? null),
		facilities(kelurahanId),
		placeLabel(kelurahanId)
	]);
	const pending = facList.filter((item) => item.kind === 'calon_posko' && !item.shelterConfirmed).length;
	const aggregate = buildAggregate(rows, event, pending);
	const scenarioText = event ? scenarioLabel(event.scenario) : 'kondisi tenang';
	const local = templateSummary(aggregate, place, scenarioText);
	const intro = local.split('\n\n')[0];
	const messages = llmMessages(aggregate);

	const geminiKey = envVar('GEMINI_API_KEY');
	const key = envVar('LLM_API_KEY') || geminiKey;
	if (key) {
		try {
			const defaultBase = geminiKey && !envVar('LLM_API_KEY')
				? 'https://generativelanguage.googleapis.com/v1beta/openai'
				: 'https://api.openai.com/v1';
			const base = (envVar('LLM_BASE_URL') || defaultBase).replace(/\/$/, '');
			const defaultModel = geminiKey && !envVar('LLM_API_KEY') ? 'gemini-2.5-flash' : 'gpt-4o-mini';
			const response = await fetch(`${base}/chat/completions`, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${key}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					model: envVar('LLM_MODEL') || defaultModel,
					temperature: 0.2,
					messages
				})
			});
			if (response.ok) {
				const payload = (await response.json()) as {
					choices?: Array<{ message?: { content?: string } }>;
				};
				const content = payload.choices?.[0]?.message?.content?.trim();
				if (content) return { text: `${intro}\n\n${content}`, source: 'llm', aggregate };
			}
		} catch {
			/* fall through to Workers AI or template */
		}
	}

	const workersAi = await getWorkersAi();
	if (workersAi) {
		try {
			const model = envVar('WORKERS_AI_MODEL') || '@cf/meta/llama-3.1-8b-instruct';
			const result = await workersAi.run(model, { messages, temperature: 0.2 });
			const content = result?.response?.trim();
			if (content) return { text: `${intro}\n\n${content}`, source: 'llm', aggregate };
		} catch {
			/* fall through to template */
		}
	}

	return { text: local, source: 'template', aggregate };
}
