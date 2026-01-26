<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { outputData, terminalState, fileNotes, stopSignal, storylineContext, API_BASE_URL } from '$lib/stores/terminal';
	import { getToolFileUrl, getRootFileUrl } from '$lib/services/templateService';
	import { get } from 'svelte/store';

	let plotContainer: HTMLDivElement;
	let activeTab = $state('chart');
	let currentOutput = $state<any>(null);
	let isLoading = $state(false);
	let loadingProgress = $state(0);
	let loadingTool = $state('');
	let currentNotes = $state<any[]>([]);
	let chartRendered = $state(false);

	function handleStop() {
		// Increment stop signal to trigger cancellation
		stopSignal.update(n => n + 1);
	}

	// Re-render chart when switching to chart tab
	$effect(() => {
		if (activeTab === 'chart' && currentOutput?.chartData && plotContainer) {
			// Use tick to ensure DOM is updated before rendering
			tick().then(() => {
				renderChart(currentOutput);
			});
		}
	});

	// Subscribe to stores
	onMount(() => {
		const unsubOutput = outputData.subscribe(data => {
			currentOutput = data;
			chartRendered = false;
			if (data && data.chartData && activeTab === 'chart') {
				setTimeout(() => renderChart(data), 100);
			}
			// Update notes for the current tool
			if (data?.type) {
				currentNotes = fileNotes[data.type] || [];
			} else {
				currentNotes = [];
			}
		});

		const unsubTerminal = terminalState.subscribe(state => {
			isLoading = state.isRunning;
			loadingProgress = state.progress;
			loadingTool = state.currentCommand.split(' ')[0] || '';
		});

		return () => {
			unsubOutput();
			unsubTerminal();
		};
	});


	async function viewFile(file: any) {
		// Check if this is a template file (from API)
		if (file.isTemplate && file.tool) {
			const context = get(storylineContext);
			if (context) {
				const url = `${API_BASE_URL}/templates/${context.category}/${context.storyline}/${file.tool}/${file.name}`;

				// Handle different file types
				if (file.type === 'html' || file.type === 'png' || file.type === 'svg' || file.type === 'pdf') {
					// Open binary/rich content in new window
					const newWindow = window.open(url, '_blank');
					if (!newWindow) {
						alert(`Could not open ${file.name}`);
					}
				} else if (file.type === 'zip') {
					// Trigger download for zip files
					const a = document.createElement('a');
					a.href = url;
					a.download = file.name;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
				} else {
					// Fetch and display text content
					try {
						const response = await fetch(url);
						if (response.ok) {
							const content = await response.text();
							alert(`File: ${file.name}\n\n${content.substring(0, 2000)}${content.length > 2000 ? '\n...(truncated)' : ''}`);
						} else {
							alert(`Failed to fetch ${file.name}: ${response.statusText}`);
						}
					} catch (error) {
						alert(`Error fetching ${file.name}: ${error}`);
					}
				}
				return;
			}
		}

		// Handle root-level template files (like o_bandage.png)
		if (file.name.startsWith('o_') && (file.type === 'png' || file.type === 'svg')) {
			const url = getRootFileUrl(file.name);
			if (url) {
				const newWindow = window.open(url, '_blank');
				if (!newWindow) {
					alert(`Could not open ${file.name}`);
				}
				return;
			}
		}

		// No local fallback - files should come from template API
		alert(`Preview not available for ${file.name}\n\nThis file should be served from the template API.`);
	}

	function downloadFile(file: any) {
		// For template files, redirect to API download
		if (file.isTemplate && file.tool) {
			const context = get(storylineContext);
			if (context) {
				const url = `${API_BASE_URL}/templates/${context.category}/${context.storyline}/${file.tool}/${file.name}`;
				const a = document.createElement('a');
				a.href = url;
				a.download = file.name;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				return;
			}
		}
		alert(`Download not available for ${file.name}\n\nThis file should be served from the template API.`);
	}

	async function renderChart(data: any) {
		if (!plotContainer || !data?.chartData) return;

		const chartData = data.chartData;

		// Handle image type - display image directly instead of using Plotly
		if (chartData.type === 'image') {
			plotContainer.innerHTML = `
				<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 1rem;">
					<h3 style="font-size: 1rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">${chartData.title || 'Image'}</h3>
					<img src="${chartData.imagePath}" alt="${chartData.title || 'Chart'}" style="max-width: 100%; max-height: calc(100% - 3rem); object-fit: contain; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />
				</div>
			`;
			return;
		}

		const Plotly = await import('plotly.js-dist-min');

		let traces: any[] = [];
		let layout: any = {
			title: {
				text: chartData.title || data.title,
				font: { size: 16, color: '#1f2937' }
			},
			xaxis: {
				title: { text: chartData.xLabel || 'X', font: { size: 12, color: '#4b5563' } },
				gridcolor: '#e5e7eb',
				tickfont: { size: 11, color: '#6b7280' }
			},
			yaxis: {
				title: { text: chartData.yLabel || 'Y', font: { size: 12, color: '#4b5563' } },
				gridcolor: '#e5e7eb',
				tickfont: { size: 11, color: '#6b7280' }
			},
			margin: { t: 50, r: 30, b: 60, l: 80 },
			paper_bgcolor: 'transparent',
			plot_bgcolor: '#fafafa',
			font: { family: 'system-ui, sans-serif' },
			showlegend: false
		};

		if (chartData.type === 'assemblyGraph') {
			// Assembly graph visualization - circular diagrams for complete genomes
			const components = chartData.components || [];
			const stats = chartData.graphStats || {};

			// Calculate circle sizes based on component sizes
			const maxSize = Math.max(...components.map((c: any) => c.size));

			const shapes: any[] = [];
			const annotations: any[] = [];

			// Fixed positions - labels at same Y, circles above with bottom edge aligned
			const labelY = 2.0;           // All labels at same Y
			const circleBottomY = 3.2;    // All circle bottoms at same Y

			components.forEach((comp: any, i: number) => {
				// X position: spread further apart
				const xPos = i === 0 ? 2 : 10;

				// Scale radius based on size
				const relativeSize = comp.size / maxSize;
				const radius = Math.max(0.5, 1.4 * Math.sqrt(relativeSize));

				// Circle center: bottom edge at circleBottomY, so center is at circleBottomY + radius
				const yCenter = circleBottomY + radius;

				if (comp.circular) {
					shapes.push({
						type: 'circle',
						xref: 'x',
						yref: 'y',
						x0: xPos - radius,
						y0: circleBottomY,
						x1: xPos + radius,
						y1: circleBottomY + 2 * radius,
						line: { color: comp.color, width: 4 },
						fillcolor: 'rgba(255,255,255,0)'
					});
				} else {
					shapes.push({
						type: 'line',
						xref: 'x',
						yref: 'y',
						x0: xPos - radius,
						y0: yCenter,
						x1: xPos + radius,
						y1: yCenter,
						line: { color: comp.color, width: 4 }
					});
				}

				// Label at fixed Y position, centered under circle
				annotations.push({
					x: xPos,
					y: labelY,
					xref: 'x',
					yref: 'y',
					text: `<b>${comp.name}</b><br>${(comp.size / 1e6).toFixed(2)} Mb`,
					showarrow: false,
					font: { size: 13, color: comp.color },
					align: 'center'
				});
			});

			// Quality badge at top
			const quality = stats.quality || 'unknown';
			const qualityColor = quality === 'excellent' ? '#10b981' : quality === 'good' ? '#f59e0b' : '#ef4444';
			annotations.push({
				x: 6,
				y: 9.2,
				xref: 'x',
				yref: 'y',
				text: `<b>Quality: ${quality.toUpperCase()}</b> | ${stats.circular || 0} circular | ${stats.deadEnds || 0} dead ends`,
				showarrow: false,
				font: { size: 12, color: qualityColor }
			});

			// Node/edge stats at bottom
			annotations.push({
				x: 6,
				y: 0.5,
				xref: 'x',
				yref: 'y',
				text: `Nodes: ${stats.totalNodes?.toLocaleString() || 'N/A'} | Edges: ${stats.totalEdges?.toLocaleString() || 'N/A'}`,
				showarrow: false,
				font: { size: 11, color: '#9ca3af' }
			});

			layout = {
				title: { text: chartData.title, font: { size: 16, color: '#1f2937' } },
				xaxis: { visible: false, range: [0, 12], fixedrange: true, constrain: 'domain' },
				yaxis: { visible: false, range: [0, 10], fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
				margin: { t: 50, r: 20, b: 20, l: 20 },
				paper_bgcolor: 'transparent',
				plot_bgcolor: '#fafafa',
				shapes: shapes,
				annotations: annotations,
				showlegend: false
			};

			// Empty trace to render the plot
			traces.push({
				x: [5],
				y: [5],
				type: 'scatter',
				mode: 'markers',
				marker: { size: 0.1, opacity: 0 }
			});
		} else if (chartData.type === 'bar') {
			// Bar chart for trimmomatic, unicycler
			const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

			traces.push({
				x: chartData.x,
				y: chartData.y,
				type: 'bar',
				marker: {
					color: colors.slice(0, chartData.x.length),
					line: { color: '#1f2937', width: 1 }
				},
				text: chartData.y.map((v: number) => v.toLocaleString()),
				textposition: 'outside',
				textfont: { size: 11, color: '#374151' }
			});

			layout.yaxis.rangemode = 'tozero';
		} else {
			// Line chart for FastQC quality scores
			const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

			if (chartData.datasets && Array.isArray(chartData.datasets)) {
				// Multiple datasets (e.g., R1 and R2)
				chartData.datasets.forEach((dataset: any, idx: number) => {
					traces.push({
						x: dataset.positions || chartData.x,
						y: dataset.scores || chartData.y,
						type: 'scatter',
						mode: 'lines',
						fill: idx === 0 ? 'tozeroy' : 'none',
						fillcolor: idx === 0 ? 'rgba(16, 185, 129, 0.15)' : undefined,
						line: { color: colors[idx % colors.length], width: 2 },
						name: dataset.label || `Dataset ${idx + 1}`
					});
				});
			} else {
				// Single dataset
				traces.push({
					x: chartData.positions || chartData.x,
					y: chartData.scores || chartData.y,
					type: 'scatter',
					mode: 'lines',
					fill: 'tozeroy',
					fillcolor: 'rgba(16, 185, 129, 0.2)',
					line: { color: '#10b981', width: 2 },
					name: chartData.name || 'Quality Score'
				});
			}

			// Add quality threshold lines for FastQC
			if (chartData.yLabel?.includes('Phred') || chartData.yLabel?.includes('Quality')) {
				// Q30 line (excellent)
				traces.push({
					x: [1, 150],
					y: [30, 30],
					type: 'scatter',
					mode: 'lines',
					line: { color: '#9ca3af', width: 1, dash: 'dash' },
					name: 'Q30 (Excellent)',
					showlegend: true
				});
				// Q20 line (acceptable)
				traces.push({
					x: [1, 150],
					y: [20, 20],
					type: 'scatter',
					mode: 'lines',
					line: { color: '#d1d5db', width: 1, dash: 'dash' },
					name: 'Q20 (Acceptable)',
					showlegend: true
				});

				layout.showlegend = true;
				layout.legend = { x: 0.7, y: 0.1, bgcolor: 'rgba(255,255,255,0.8)' };
				layout.yaxis.range = [0, 42];
			}
		}

		Plotly.default.newPlot(plotContainer, traces, layout, {
			responsive: true,
			displaylogo: false,
			modeBarButtonsToRemove: ['lasso2d', 'select2d']
		});
	}
</script>

<div class="h-full flex flex-col bg-gray-50" style="display: flex; flex-direction: column; height: 100%; background: #f9fafb;">
	<!-- Tabs -->
	<div class="flex border-b bg-white" style="display: flex; border-bottom: 1px solid #e5e7eb; background: white; flex-shrink: 0;">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors"
			style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background: transparent; border: none; cursor: pointer; border-bottom: {activeTab === 'chart' ? '2px solid #2563eb' : 'none'}; color: {activeTab === 'chart' ? '#2563eb' : '#4b5563'};"
			onclick={() => (activeTab = 'chart')}
		>
			📊 Chart
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors"
			style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background: transparent; border: none; cursor: pointer; border-bottom: {activeTab === 'table' ? '2px solid #2563eb' : 'none'}; color: {activeTab === 'table' ? '#2563eb' : '#4b5563'};"
			onclick={() => (activeTab = 'table')}
		>
			📋 Summary
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors"
			style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background: transparent; border: none; cursor: pointer; border-bottom: {activeTab === 'notes' ? '2px solid #2563eb' : 'none'}; color: {activeTab === 'notes' ? '#2563eb' : '#4b5563'};"
			onclick={() => (activeTab = 'notes')}
		>
			📝 Notes
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-auto p-4" style="flex: 1; overflow: auto; padding: 1rem;">
		{#if isLoading}
			<!-- Loading State -->
			<div class="h-full flex flex-col items-center justify-center text-gray-500" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
				<div class="mb-4">
					<svg class="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
				<p class="text-lg font-medium text-gray-700">Running {loadingTool}...</p>
				<div class="w-64 mt-4">
					<div class="bg-gray-200 rounded-full h-2">
						<div
							class="bg-blue-600 h-2 rounded-full transition-all duration-300"
							style="width: {loadingProgress}%"
						></div>
					</div>
					<p class="text-sm text-gray-500 mt-2 text-center">{loadingProgress}% complete</p>
				</div>
				<button
					onclick={handleStop}
					class="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<rect x="6" y="6" width="12" height="12" rx="1" stroke-width="2" fill="currentColor"/>
					</svg>
					Stop
				</button>
			</div>
		{:else if !currentOutput}
			<!-- Empty State -->
			<div class="h-full flex flex-col items-center justify-center text-gray-400" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">
				<svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 64px; height: 64px; margin-bottom: 16px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<p class="text-lg font-medium">No output yet</p>
				<p class="text-sm mt-1">Run a command in the terminal to see results</p>
			</div>
		{:else if activeTab === 'chart'}
			{#if currentOutput.chartData}
				<div bind:this={plotContainer} class="w-full h-full min-h-[200px]"></div>
			{:else}
				<div class="h-full flex items-center justify-center text-gray-400">
					<p>No chart data available for this command</p>
				</div>
			{/if}
		{:else if activeTab === 'table'}
			{#if currentOutput.summary}
				<div class="bg-white rounded-lg shadow-sm border">
					<div class="px-4 py-3 border-b">
						<h3 class="font-semibold text-gray-800">{currentOutput.title}</h3>
						<p class="text-sm text-gray-500">{currentOutput.tool}</p>
					</div>
					<div class="p-4">
						<dl class="grid grid-cols-2 gap-4">
							{#each Object.entries(currentOutput.summary) as [key, value]}
								<div>
									<dt class="text-sm font-semibold text-gray-800">{key}</dt>
									<dd class="text-base text-gray-600">{value}</dd>
								</div>
							{/each}
						</dl>
					</div>
				</div>
			{:else}
				<div class="h-full flex items-center justify-center text-gray-400">
					<p>No summary data available</p>
				</div>
			{/if}
		{:else if activeTab === 'notes'}
			{#if currentNotes.length > 0}
				<div class="bg-white rounded-lg shadow-sm border">
					<div class="px-4 py-3 border-b">
						<h3 class="font-semibold text-gray-800">File Format Notes</h3>
						<p class="text-sm text-gray-500">Helpful information about the files and formats</p>
					</div>
					<ul class="divide-y">
						{#each currentNotes as note}
							<li class="px-4 py-3">
								<div class="flex items-start gap-3">
									<span class="text-blue-500 mt-0.5">💡</span>
									<div>
										<p class="font-medium text-gray-800">{note.name}</p>
										{#if note.format}
											<span class="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mb-1">{note.format}</span>
										{/if}
										<p class="text-sm text-gray-600">{note.description}</p>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="h-full flex items-center justify-center text-gray-400">
					<div class="text-center">
						<p class="mb-2">No notes available</p>
						<p class="text-sm">Run a bioinformatics tool to see file format notes</p>
					</div>
				</div>
			{/if}
		{/if}
	</div>

</div>
