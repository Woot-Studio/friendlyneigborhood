export function ripple(node: HTMLElement) {
	function onPointer(event: PointerEvent) {
		const rect = node.getBoundingClientRect();
		node.style.setProperty('--rx', `${event.clientX - rect.left}px`);
		node.style.setProperty('--ry', `${event.clientY - rect.top}px`);
	}
	node.addEventListener('pointerdown', onPointer);
	return {
		destroy() {
			node.removeEventListener('pointerdown', onPointer);
		}
	};
}
