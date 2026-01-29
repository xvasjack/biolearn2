<script lang="ts">
	import { onMount } from 'svelte';
	import Terminal from './Terminal.svelte';
	import StoryPanel from './StoryPanel.svelte';
	import OutputPanel from './OutputPanel.svelte';
	import { executedCommands, storylineDataDir, currentDirectory, templateFiles, templateRootFiles } from '$lib/stores/terminal';
	import { initializeStoryline, getToolFileUrl, getRootFileUrl, getFileType } from '$lib/services/templateService';
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
	let leftPanelWidth = $state(50); // percentage (initial 50%)
	let isResizingHorizontal = $state(false);
	let filesDropdownOpen = $state(false);
	let allGeneratedFiles = $state<{name: string, type: string, tool: string, isRootFile?: boolean}[]>([]);

	// File modal state
	let fileModalOpen = $state(false);
	let fileModalContent = $state('');
	let fileModalName = $state('');
	let fileModalTool = $state('');
	let fileModalType = $state('');

	// Track store values for reactive building of file list
	let currentExecutedCommands = $state<string[]>([]);
	let currentTemplateFiles = $state<Record<string, string[]>>({});
	let currentRootFiles = $state<string[]>([]);

	onMount(() => {
		const dataDir = storyline?.dataDir || '/data/outbreak_investigation';
		storylineDataDir.set(dataDir);
		currentDirectory.set(dataDir);

		if (storyline?.category) {
			const templateId = storyline.templateId || storyline.id;
			initializeStoryline(storyline.category, templateId);
		}

		const unsub1 = executedCommands.subscribe(cmds => {
			currentExecutedCommands = cmds;
			rebuildFileList(cmds, currentTemplateFiles, currentRootFiles);
		});

		const unsub2 = templateFiles.subscribe(tf => {
			currentTemplateFiles = tf;
			rebuildFileList(currentExecutedCommands, tf, currentRootFiles);
		});

		const unsub3 = templateRootFiles.subscribe(rootFiles => {
			currentRootFiles = rootFiles;
			rebuildFileList(currentExecutedCommands, currentTemplateFiles, rootFiles);
		});

		return () => {
			unsub1();
			unsub2();
			unsub3();
		};
	});

	function rebuildFileList(cmds: string[], tf: Record<string, string[]>, rootFiles: string[]) {
		const files: {name: string, type: string, tool: string, isRootFile?: boolean}[] = [];
		cmds.forEach(tool => {
			// Check tool output directories (o_toolname/)
			const toolFileNames = tf[tool];
			if (toolFileNames) {
				toolFileNames.forEach(filename => {
					files.push({ name: filename, type: getFileType(filename), tool });
				});
			}
			// Check root-level files (o_toolname.ext pattern, case-insensitive)
			rootFiles.forEach(rootFile => {
				const toolLower = tool.toLowerCase();
				if (rootFile.startsWith(`o_${toolLower}.`) || rootFile === `o_${toolLower}`) {
					files.push({ name: rootFile, type: getFileType(rootFile), tool, isRootFile: true });
				}
			});
		});
		allGeneratedFiles = files;
	}

	async function viewFile(file: {name: string, type: string, tool?: string, isRootFile?: boolean}) {
		// Load from template API
		if (file.tool) {
			// Use getRootFileUrl for root-level files, getToolFileUrl for tool directory files
			const url = file.isRootFile ? getRootFileUrl(file.name) : getToolFileUrl(file.tool, file.name);

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
					fileModalName = file.name;
					fileModalTool = file.tool;
					fileModalType = file.type.toUpperCase();
					fileModalContent = textContent;
					fileModalOpen = true;
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

		fileModalName = file.name;
		fileModalTool = file.tool || '';
		fileModalType = file.type.toUpperCase();
		fileModalContent = 'File should be served from the template API.';
		fileModalOpen = true;
		filesDropdownOpen = false;
	}

	function closeModal() {
		fileModalOpen = false;
		fileModalContent = '';
	}

	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeModal();
		}
	}

	function handleModalBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('file-modal-backdrop')) {
			closeModal();
		}
	}

	async function copyModalContent() {
		try {
			await navigator.clipboard.writeText(fileModalContent);
		} catch {
			// Fallback
			const textarea = document.createElement('textarea');
			textarea.value = fileModalContent;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		}
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

	function startHorizontalResize(e: MouseEvent) {
		isResizingHorizontal = true;
		document.addEventListener('mousemove', handleHorizontalResize);
		document.addEventListener('mouseup', stopHorizontalResize);
	}

	function handleHorizontalResize(e: MouseEvent) {
		if (!isResizingHorizontal) return;
		const container = document.getElementById('main-content');
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
		leftPanelWidth = Math.max(25, Math.min(75, newWidth)); // constrain 25-75%
	}

	function stopHorizontalResize() {
		isResizingHorizontal = false;
		document.removeEventListener('mousemove', handleHorizontalResize);
		document.removeEventListener('mouseup', stopHorizontalResize);
	}
</script>

<svelte:window onclick={closeDropdown} onkeydown={handleModalKeydown} />

<div class="h-screen w-screen flex flex-col overflow-hidden" style="display: flex; flex-direction: column; height: 100%; width: 100%;">
	<!-- Top Header Bar -->
	<div class="h-10 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700" style="display: flex; align-items: center; justify-content: space-between; height: 40px; flex-shrink: 0;">
		<!-- Commands List -->
		<div class="flex items-center gap-2 text-sm" style="display: flex; align-items: center; gap: 0.5rem;">
			<span class="text-gray-400" style="color: #9ca3af;">Commands:</span>
			<div class="flex gap-1 flex-wrap" style="display: flex; gap: 4px; flex-wrap: wrap;">
				{#each ['ls', 'cd', 'pwd', 'cat', 'head', 'tail', 'clear', 'help'] as cmd}
					<span class="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded" style="padding: 2px 6px; background: #374151; color: #d1d5db; border-radius: 4px; font-size: 12px;">{cmd}</span>
				{/each}
			</div>
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
									{:else if file.type === 'tsv' || file.type === 'text' || file.type === 'csv'}📋
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
	<div id="main-content" class="flex-1 flex overflow-hidden" style="display: flex; flex: 1; overflow: hidden; height: calc(100% - 40px); min-height: 0;">
		<!-- Left Panel: Terminal + Output -->
		<div id="left-panel" class="flex flex-col" style="display: flex; flex-direction: column; width: {leftPanelWidth}%; height: 100%; min-height: 0;">
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

		<!-- Horizontal Resize Handle -->
		<div
			class="bg-gray-300 cursor-col-resize hover:bg-blue-500 transition-colors"
			style="width: 4px; background: #d1d5db; cursor: col-resize; flex-shrink: 0;"
			onmousedown={startHorizontalResize}
			role="separator"
			aria-orientation="vertical"
			tabindex="0"
		></div>

		<!-- Right Panel: Story -->
		<div class="story-panel overflow-auto" style="width: {100 - leftPanelWidth}%; height: 100%; overflow: auto;">
			<StoryPanel {storyline} />
		</div>
	</div>
</div>

<!-- File Content Modal -->
{#if fileModalOpen}
	<div
		class="file-modal-backdrop"
		style="position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 2rem;"
		onclick={handleModalBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-label="File content viewer"
	>
		<div style="background: white; border-radius: 0.5rem; width: 100%; max-width: 56rem; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden;">
			<!-- Header -->
			<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: #1f2937; color: white; flex-shrink: 0;">
				<div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
					<span style="font-weight: 600; font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{fileModalName}</span>
					<span style="font-size: 0.75rem; color: #9ca3af;">({fileModalTool} - {fileModalType})</span>
				</div>
				<button
					onclick={closeModal}
					style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 1.25rem; line-height: 1; padding: 0.25rem;"
					aria-label="Close modal"
				>&times;</button>
			</div>
			<!-- Content -->
			<div style="flex: 1; overflow: auto; padding: 1rem; min-height: 0;">
				<pre style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 0.8rem; line-height: 1.5; white-space: pre-wrap; word-break: break-all; color: #1f2937;">{fileModalContent}</pre>
			</div>
			<!-- Footer -->
			<div style="display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid #e5e7eb; flex-shrink: 0;">
				<button
					onclick={copyModalContent}
					style="padding: 0.375rem 0.75rem; font-size: 0.8rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;"
				>Copy</button>
				<button
					onclick={closeModal}
					style="padding: 0.375rem 0.75rem; font-size: 0.8rem; background: #6b7280; color: white; border: none; border-radius: 0.25rem; cursor: pointer;"
				>Close</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
