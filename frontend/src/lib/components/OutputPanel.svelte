<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { outputData, terminalState, fileNotes, stopSignal, storylineContext, API_BASE_URL, templateFiles, templateRootFiles } from '$lib/stores/terminal';
	import { getToolFileUrl, getRootFileUrl, getFileType } from '$lib/services/templateService';
	import { get } from 'svelte/store';

	let activeTab = $state('output');
	let currentOutput = $state<any>(null);
	let isLoading = $state(false);
	let loadingProgress = $state(0);
	let loadingTool = $state('');
	let currentNotes = $state<any[]>([]);
	let currentToolFiles = $state<{name: string, type: string, tool: string, isRootFile?: boolean}[]>([]);
	let currentTemplateFilesValue = $state<Record<string, string[]>>({});
	let currentRootFilesValue = $state<string[]>([]);

	function handleStop() {
		// Increment stop signal to trigger cancellation
		stopSignal.update(n => n + 1);
	}

	function rebuildCurrentToolFiles() {
		if (!currentOutput?.type) {
			currentToolFiles = [];
			return;
		}
		const tool = currentOutput.type;
		const files: {name: string, type: string, tool: string, isRootFile?: boolean}[] = [];

		// Check tool output directories
		const toolFileNames = currentTemplateFilesValue[tool];
		if (toolFileNames) {
			toolFileNames.forEach(filename => {
				files.push({ name: filename, type: getFileType(filename), tool });
			});
		}

		// Check root-level files
		const toolLower = tool.toLowerCase();
		currentRootFilesValue.forEach(rootFile => {
			if (rootFile.startsWith(`o_${toolLower}.`) || rootFile === `o_${toolLower}`) {
				files.push({ name: rootFile, type: getFileType(rootFile), tool, isRootFile: true });
			}
		});

		currentToolFiles = files;
	}

	// Subscribe to stores
	onMount(() => {
		const unsubOutput = outputData.subscribe(data => {
			currentOutput = data;
			// Update notes for the current tool
			if (data?.type) {
				currentNotes = fileNotes[data.type] || [];
			} else {
				currentNotes = [];
			}
			rebuildCurrentToolFiles();
		});

		const unsubTerminal = terminalState.subscribe(state => {
			isLoading = state.isRunning;
			loadingProgress = state.progress;
			loadingTool = state.currentCommand.split(' ')[0] || '';
		});

		const unsubTemplateFiles = templateFiles.subscribe(tf => {
			currentTemplateFilesValue = tf;
			rebuildCurrentToolFiles();
		});

		const unsubRootFiles = templateRootFiles.subscribe(rf => {
			currentRootFilesValue = rf;
			rebuildCurrentToolFiles();
		});

		return () => {
			unsubOutput();
			unsubTerminal();
			unsubTemplateFiles();
			unsubRootFiles();
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

		// For tool files displayed in the Output tab, use the template service URLs
		if (file.tool) {
			const url = file.isRootFile ? getRootFileUrl(file.name) : getToolFileUrl(file.tool, file.name);

			if (file.type === 'html' || file.type === 'png' || file.type === 'svg' || file.type === 'pdf') {
				window.open(url, '_blank');
				return;
			} else if (file.type === 'zip') {
				const a = document.createElement('a');
				a.href = url;
				a.download = file.name;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				return;
			} else {
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
</script>

<div class="h-full flex flex-col bg-gray-50" style="display: flex; flex-direction: column; height: 100%; background: #f9fafb;">
	<!-- Tabs -->
	<div class="flex border-b bg-white" style="display: flex; border-bottom: 1px solid #e5e7eb; background: white; flex-shrink: 0;">
		<button
			data-tour="summary-tab"
			class="px-4 py-2 text-sm font-medium transition-colors"
			style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background: transparent; border: none; cursor: pointer; border-bottom: {activeTab === 'table' ? '2px solid #2563eb' : 'none'}; color: {activeTab === 'table' ? '#2563eb' : '#4b5563'};"
			onclick={() => (activeTab = 'table')}
		>
			📋 Summary
		</button>
		<button
			data-tour="output-tab"
			class="px-4 py-2 text-sm font-medium transition-colors"
			style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background: transparent; border: none; cursor: pointer; border-bottom: {activeTab === 'output' ? '2px solid #2563eb' : 'none'}; color: {activeTab === 'output' ? '#2563eb' : '#4b5563'};"
			onclick={() => (activeTab = 'output')}
		>
			📁 Output
		</button>
		<button
			data-tour="notes-tab"
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
		{:else if activeTab === 'output'}
			{#if currentToolFiles.length > 0}
				<div class="bg-white rounded-lg shadow-sm border">
					<div class="px-4 py-3 border-b">
						<h3 class="font-semibold text-gray-800">Output Files</h3>
						<p class="text-sm text-gray-500">{currentOutput.type} - {currentToolFiles.length} file{currentToolFiles.length !== 1 ? 's' : ''}</p>
					</div>
					<ul class="divide-y">
						{#each currentToolFiles as file}
							<li class="px-4 py-3">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3 min-w-0 flex-1">
										<span class="text-lg flex-shrink-0" style="font-size: 1.125rem;">
											{#if file.type === 'html'}📄
											{:else if file.type === 'png'}🖼️
											{:else if file.type === 'zip'}📦
											{:else if file.type === 'fasta' || file.type === 'fastq'}🧬
											{:else if file.type === 'tsv' || file.type === 'text' || file.type === 'csv'}📋
											{:else if file.type === 'log'}📝
											{:else if file.type === 'gfa'}🔗
											{:else}📁{/if}
										</span>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-gray-800 truncate" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{file.name}</p>
											<p class="text-xs text-gray-500">{file.type.toUpperCase()}</p>
										</div>
									</div>
									<button
										onclick={() => viewFile({ isTemplate: true, tool: file.tool, name: file.name, type: file.type, isRootFile: file.isRootFile })}
										class="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex-shrink-0"
										style="padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 500; color: #2563eb; background: #eff6ff; border: none; border-radius: 0.25rem; cursor: pointer;"
									>
										View
									</button>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="h-full flex items-center justify-center text-gray-400">
					<div class="text-center">
						<p class="mb-2">No output files for this tool</p>
						<p class="text-sm">Output files will appear here after running a tool</p>
					</div>
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
