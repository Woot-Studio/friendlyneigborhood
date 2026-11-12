import { buildAggregate, llmMessages, scenarioLabel, templateSummary } from '#lib/domain';
import type { Aggregate } from '#lib/types';
import { currentAlert, facilities, placeLabel, residentBoard } from './db';

export async function summarizeKelurahan(kelurahanId: string): Promise<{
	text: string;
	source: 'template' | 'llm';
	aggregate: Aggregate;
}> {
	const event = currentAlert(kelurahanId);
	const rows = residentBoard(kelurahanId, event?.id ?? null);
	const pending = facilities(kelurahanId).filter((item) => item.kind === 'calon_posko' && !item.shelterConfirmed).length;
	const aggregate = buildAggregate(rows, event, pending);
	const place = placeLabel(kelurahanId);
	const scenarioText = event ? scenarioLabel(event.scenario) : 'kondisi tenang';
	const local = templateSummary(aggregate, place, scenarioText);
	const key = process.env.LLM_API_KEY;
	if (!key) return { text: local, source: 'template', aggregate };

	try {
		const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
		const response = await fetch(`${base}/chat/completions`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${key}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: process.env.LLM_MODEL || 'gpt-4o-mini',
				temperature: 0.2,
				messages: llmMessages(aggregate)
			})
		});
		if (!response.ok) return { text: local, source: 'template', aggregate };
		const payload = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = payload.choices?.[0]?.message?.content?.trim();
		if (!content) return { text: local, source: 'template', aggregate };
		const intro = local.split('\n\n')[0];
		return { text: `${intro}\n\n${content}`, source: 'llm', aggregate };
	} catch {
		return { text: local, source: 'template', aggregate };
	}
}
