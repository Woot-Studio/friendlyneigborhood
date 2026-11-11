<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { enabled = true }: { enabled?: boolean } = $props();

	onMount(() => {
		if (!enabled) return;
		const source = new EventSource('/api/stream');
		source.onmessage = (event) => {
			invalidateAll();
			try {
				const data = JSON.parse(event.data) as {
					type?: string;
					title?: string;
					body?: string;
				};
				if (data.type === 'alert' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
					new Notification(data.title || 'Friendly Neighborhood', { body: data.body || '' });
				}
			} catch {
				/* ping tanpa isi */
			}
		};
		return () => source.close();
	});
</script>
