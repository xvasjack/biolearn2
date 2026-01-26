// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'plotly.js-dist-min' {
	interface PlotlyInterface {
		newPlot: (element: HTMLElement, data: any[], layout?: any, config?: any) => Promise<void>;
		react: (element: HTMLElement, data: any[], layout?: any, config?: any) => Promise<void>;
		purge: (element: HTMLElement) => void;
	}
	const Plotly: PlotlyInterface;
	export default Plotly;
	export { Plotly as default };
}

export {};
