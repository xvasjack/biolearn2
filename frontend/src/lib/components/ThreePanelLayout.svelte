<script lang="ts">
	import { onMount } from 'svelte';
	import Terminal from './Terminal.svelte';
	import StoryPanel from './StoryPanel.svelte';
	import OutputPanel from './OutputPanel.svelte';
	import { executedCommands, storylineDataDir, currentDirectory } from '$lib/stores/terminal';
	import { initializeStoryline, getToolFileUrl, getRootFileUrl } from '$lib/services/templateService';
	import type { Storyline } from '$lib/storylines/types';

	let {
		storyContent = '',
		currentStep = 0,
		outputData = null,
		storyline = null
	}: {
		storyContent?: string;
		currentStep?: number;
		outputData?: any;
		storyline?: Storyline | null;
	} = $props();

	let terminalHeight = $state(70); // percentage
	let isResizing = $state(false);
	let filesDropdownOpen = $state(false);
	let allGeneratedFiles = $state<{name: string, type: string, tool: string}[]>([]);

	// Tool to files mapping
	const toolFiles: Record<string, {name: string, type: string}[]> = {
		'seqkit': [{ name: 'o_seqkit_stats.txt', type: 'txt' }],
		'fastqc': [
			{ name: 'SRR36708862_1_fastqc.html', type: 'html' },
			{ name: 'SRR36708862_2_fastqc.html', type: 'html' },
			{ name: 'SRR36708862_1_fastqc.zip', type: 'zip' },
			{ name: 'SRR36708862_2_fastqc.zip', type: 'zip' }
		],
		'trimmomatic': [
			{ name: 'sample_01_R1_paired.fq.gz', type: 'fastq' },
			{ name: 'sample_01_R2_paired.fq.gz', type: 'fastq' },
			{ name: 'sample_01_R1_unpaired.fq.gz', type: 'fastq' },
			{ name: 'sample_01_R2_unpaired.fq.gz', type: 'fastq' }
		],
		'unicycler': [
			{ name: 'assembly.fasta', type: 'fasta' },
			{ name: 'assembly.gfa', type: 'gfa' },
			{ name: 'unicycler.log', type: 'log' }
		],
		'bandage': [{ name: 'o_bandage.png', type: 'png' }],
		'quast': [
			{ name: 'quast_report.html', type: 'html' },
			{ name: 'quast_report.tsv', type: 'tsv' }
		],
		'checkm': [{ name: 'checkm_report.tsv', type: 'tsv' }],
		'confindr': [
			{ name: 'confindr_report.csv', type: 'csv' },
			{ name: 'confindr_log.txt', type: 'txt' }
		],
		'prokka': [
			{ name: 'sample_01.gff', type: 'gff' },
			{ name: 'sample_01.gbk', type: 'gbk' },
			{ name: 'sample_01.txt', type: 'txt' }
		],
		'bakta': [
			{ name: 'sample_01.gff3', type: 'gff' },
			{ name: 'sample_01.gbff', type: 'gbk' },
			{ name: 'sample_01.faa', type: 'faa' },
			{ name: 'sample_01.tsv', type: 'tsv' },
			{ name: 'sample_01.json', type: 'json' }
		],
		'abricate': [
			{ name: 'amr_report.tsv', type: 'tsv' },
			{ name: 'amr_summary.txt', type: 'txt' }
		],
		'mlst': [{ name: 'o_mlst.tab', type: 'tsv' }],
		'mob_recon': [
			{ name: 'plasmid_report.tsv', type: 'tsv' },
			{ name: 'mobtyper_results.txt', type: 'txt' }
		],
		'platon': [{ name: 'plasmid_predictions.tsv', type: 'tsv' }],
		'snippy': [
			{ name: 'snps.vcf', type: 'vcf' },
			{ name: 'snps.tab', type: 'tsv' }
		],
		'roary': [
			{ name: 'gene_presence_absence.csv', type: 'csv' },
			{ name: 'summary_statistics.txt', type: 'txt' }
		],
		'iqtree': [
			{ name: 'core_alignment.treefile', type: 'nwk' },
			{ name: 'core_alignment.iqtree', type: 'txt' }
		],
		'gubbins': [
			{ name: 'recombination_predictions.gff', type: 'gff' },
			{ name: 'clean.summary.txt', type: 'txt' }
		]
	};

	onMount(() => {
		const dataDir = storyline?.dataDir || '/data/outbreak_investigation';
		storylineDataDir.set(dataDir);
		currentDirectory.set(dataDir);

		if (storyline?.category) {
			const templateId = storyline.templateId || storyline.id;
			initializeStoryline(storyline.category, templateId);
		}

		const unsubscribe = executedCommands.subscribe(cmds => {
			const files: {name: string, type: string, tool: string}[] = [];
			cmds.forEach(tool => {
				const toolFileList = toolFiles[tool];
				if (toolFileList) {
					toolFileList.forEach(f => {
						files.push({ ...f, tool });
					});
				}
			});
			allGeneratedFiles = files;
		});
		return unsubscribe;
	});

	async function viewFile(file: {name: string, type: string, tool?: string}) {
		// Load from template API
		if (file.tool) {
			const url = getToolFileUrl(file.tool, file.name);

			if (file.type === 'html') {
				const response = await fetch(url);
				if (response.ok) {
					const htmlContent = await response.text();
					const newWindow = window.open('', '_blank');
					if (newWindow) {
						newWindow.document.write(htmlContent);
						newWindow.document.close();
					}
					filesDropdownOpen = false;
					return;
				}
			} else if (file.type === 'png' || file.type === 'svg' || file.type === 'pdf') {
				window.open(url, '_blank');
				filesDropdownOpen = false;
				return;
			} else if (file.type === 'zip') {
				const a = document.createElement('a');
				a.href = url;
				a.download = file.name;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				filesDropdownOpen = false;
				return;
			} else {
				const response = await fetch(url);
				if (response.ok) {
					const textContent = await response.text();
					alert(`File: ${file.name}\n\n${textContent.substring(0, 2000)}${textContent.length > 2000 ? '\n...(truncated)' : ''}`);
					filesDropdownOpen = false;
					return;
				}
			}
		}

		// Handle root-level template files
		if (file.name.startsWith('o_') && file.type === 'png') {
			const url = getRootFileUrl(file.name);
			if (url) {
				window.open(url, '_blank');
				filesDropdownOpen = false;
				return;
			}
		}

		alert(`${file.name}\n\nFile should be served from the template API.`);
		filesDropdownOpen = false;
	}

	function startResize(e: MouseEvent) {
		isResizing = true;
		document.addEventListener('mousemove', handleResize);
		document.addEventListener('mouseup', stopResize);
	}

	function handleResize(e: MouseEvent) {
		if (!isResizing) return;
		const container = document.getElementById('left-panel');
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
		terminalHeight = Math.max(30, Math.min(85, newHeight));
	}

	function stopResize() {
		isResizing = false;
		document.removeEventListener('mousemove', handleResize);
		document.removeEventListener('mouseup', stopResize);
	}

	function closeDropdown(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.files-dropdown')) {
			filesDropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={closeDropdown} />

<div class="h-screen w-screen flex flex-col overflow-hidden" style="display: flex; flex-direction: column; height: 100vh; width: 100vw;">
	<!-- Top Header Bar -->
	<div class="h-10 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700" style="display: flex; align-items: center; justify-content: space-between; height: 40px; flex-shrink: 0;">
		<div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
			<a href="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
				<span class="text-blue-100 font-bold text-sm">BioLearn</span>
			</a>
			<span class="text-gray-400 text-xs">| Bioinformatics Training Platform</span>
			{#if storyline}
				<span class="text-blue-100 text-xs">|</span>
				<span class="text-blue-400 text-xs">{storyline.title}</span>
			{/if}
		</div>

		<!-- Files Dropdown -->
		<div class="files-dropdown relative" style="position: relative;">
			<button
				class="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
				style="display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: #374151; border-radius: 0.25rem; font-size: 0.875rem; color: white; border: none; cursor: pointer;"
				onclick={() => filesDropdownOpen = !filesDropdownOpen}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 16px; height: 16px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
				Output Files ({allGeneratedFiles.length})
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 12px; height: 12px;">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if filesDropdownOpen}
				<div class="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-auto" style="position: absolute; right: 0; top: 100%; margin-top: 0.25rem; width: 18rem; background: white; border-radius: 0.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; z-index: 50; max-height: 24rem; overflow: auto;">
					<!-- Educational warning -->
					<div class="p-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700" style="padding: 0.5rem; background: #fffbeb; border-bottom: 1px solid #fde68a; font-size: 0.75rem; color: #b45309;">
						<span style="font-weight: 500;">Note:</span> Only a few files are included for educational purposes.
					</div>
					{#if allGeneratedFiles.length === 0}
						<div class="p-4 text-gray-500 text-sm text-center" style="padding: 1rem; color: #6b7280; font-size: 0.875rem; text-align: center;">
							No output files yet.<br/>
							<span class="text-xs" style="font-size: 0.75rem;">Run a tool to generate files.</span>
						</div>
					{:else}
						<div class="p-2 bg-gray-50 border-b text-xs text-gray-600 font-medium" style="padding: 0.5rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 0.75rem; color: #4b5563; font-weight: 500;">
							{allGeneratedFiles.length} files generated
						</div>
						{#each allGeneratedFiles as file}
							<button
								class="w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0"
								style="width: 100%; padding: 0.5rem 0.75rem; display: flex; align-items: center; gap: 0.75rem; text-align: left; border-bottom: 1px solid #f3f4f6; background: white; border-left: none; border-right: none; border-top: none; cursor: pointer;"
								onclick={() => viewFile(file)}
							>
								<span class="text-lg" style="font-size: 1.125rem;">
									{#if file.type === 'html'}📄
									{:else if file.type === 'png'}🖼️
									{:else if file.type === 'zip'}📦
									{:else if file.type === 'fasta' || file.type === 'fastq'}🧬
									{:else if file.type === 'tsv' || file.type === 'txt'}📋
									{:else if file.type === 'log'}📝
									{:else if file.type === 'gfa'}🔗
									{:else}📁{/if}
								</span>
								<div class="flex-1 min-w-0" style="flex: 1; min-width: 0;">
									<p class="text-sm text-gray-800 truncate" style="font-size: 0.875rem; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{file.name}</p>
									<p class="text-xs text-gray-500" style="font-size: 0.75rem; color: #6b7280;">{file.tool} • {file.type.toUpperCase()}</p>
								</div>
								<span class="text-blue-500 text-xs" style="color: #3b82f6; font-size: 0.75rem;">View</span>
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex overflow-hidden" style="display: flex; flex: 1; overflow: hidden; height: calc(100% - 40px); min-height: 0;">
		<!-- Left Panel: Terminal + Output -->
		<div id="left-panel" class="w-1/2 flex flex-col border-r border-gray-300" style="display: flex; flex-direction: column; width: 50%; height: 100%; min-height: 0;">
		<!-- Terminal -->
		<div
			class="terminal-panel overflow-hidden"
			style="height: {terminalHeight}%; min-height: 0; overflow: hidden; flex-shrink: 0;"
		>
			<Terminal initialDir={storyline?.dataDir || '/data/outbreak_investigation'} />
		</div>

		<!-- Resize Handle -->
		<div
			class="h-1 bg-gray-600 cursor-row-resize hover:bg-blue-500 transition-colors"
			style="height: 4px; background: #4b5563; cursor: row-resize; flex-shrink: 0;"
			onmousedown={startResize}
			role="separator"
			aria-orientation="horizontal"
			tabindex="0"
		></div>

		<!-- Output Panel -->
		<div
			class="output-panel overflow-auto"
			style="height: {100 - terminalHeight}%; min-height: 0; overflow: auto; flex: 1;"
		>
			<OutputPanel />
		</div>
	</div>

		<!-- Right Panel: Story -->
		<div class="w-1/2 story-panel overflow-auto" style="width: 50%; height: 100%; overflow: auto;">
			<StoryPanel {storyline} />
		</div>
	</div>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
