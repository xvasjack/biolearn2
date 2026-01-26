declare module 'plotly.js-dist-min' {
	interface PlotlyInterface {
		newPlot: (element: HTMLElement, data: any[], layout?: any, config?: any) => Promise<void>;
		react: (element: HTMLElement, data: any[], layout?: any, config?: any) => Promise<void>;
		purge: (element: HTMLElement) => void;
	}
	const Plotly: PlotlyInterface;
	export default Plotly;
}
