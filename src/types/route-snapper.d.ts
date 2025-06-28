declare module 'route-snapper/lib.js' {
	export function init(wasmUrl?: string): Promise<void>;

	export class RouteSnapper {
		constructor(map: any, graph: Uint8Array, el: HTMLElement);
		isActive(): boolean;
		start(): void;
		stop(): void;
		tearDown(): void;
		changeGraph(graph: Uint8Array): void;
	}
}