<script lang="ts">
	import { goto } from '$app/navigation';
	import { executedCommands, executedSteps, currentDirectory, storylineDataDir } from '$lib/stores/terminal';
	import { get } from 'svelte/store';
	import type { Storyline, StorylineSection } from '$lib/storylines/types';
	import { onMount } from 'svelte';

	let { storyline = null }: { storyline?: Storyline | null } = $props();

	let currentStep = $state(0);
	let completedSteps = $state<Set<number>>(new Set());
	let userCurrentDir = $state('/data/outbreak_investigation');
	let isFinished = $state(false);
	let selectedDecision = $state<string | null>(null);

	// Reset executed commands when tutorial opens (Issue 1 fix)
	onMount(() => {
		// Clear executed commands to start fresh each time tutorial opens
		executedCommands.set([]);
		completedSteps = new Set();
		currentStep = 0;
	});

	// Get current phase from the current section
	const currentPhase = $derived(() => {
		if (!storyline) return 1;
		for (let i = currentStep; i >= 0; i--) {
			const section = storyline.sections[i];
			if (section.type === 'phase' && section.phase) {
				return section.phase;
			}
		}
		return 1;
	});

	// Subscribe to current directory
	currentDirectory.subscribe(dir => {
		userCurrentDir = dir;
	});

	// Subscribe to executed commands to track step completion
	executedCommands.subscribe(cmds => {
		if (!storyline) return;
		// Normalize command for comparison
		const normalizeCmd = (cmd: string) => cmd.trim().replace(/\/(\s|$)/g, '$1');

		// Map commands to steps based on task index
		storyline.sections.forEach((section, index) => {
			if (section.type === 'task' && section.command) {
				// Handle multi-line commands (split by newline)
				const commandLines = section.command.split('\n').filter(line => line.trim());

				if (commandLines.length > 1) {
					// Multi-line command: count how many lines have been executed
					// Each line must be matched in order of execution (Issue 2 fix)
					let matchedCount = 0;
					const usedCmdIndices = new Set<number>();

					for (const line of commandLines) {
						const normalizedLine = normalizeCmd(line);
						const toolName = line.trim().split(' ')[0];

						// Find a matching command that hasn't been used yet
						let found = false;
						for (let i = 0; i < cmds.length; i++) {
							if (usedCmdIndices.has(i)) continue;

							const c = cmds[i];
							if (toolName === 'ls') {
								// ls is tracked with count (ls:1, ls:2, etc.)
								if (c.startsWith('ls:')) {
									usedCmdIndices.add(i);
									matchedCount++;
									found = true;
									break;
								}
							} else if (normalizeCmd(c) === normalizedLine || c.startsWith(toolName + ' ') || c === toolName) {
								usedCmdIndices.add(i);
								matchedCount++;
								found = true;
								break;
							}
						}
					}

					// Only mark complete if ALL lines have been executed
					if (matchedCount >= commandLines.length) {
						completedSteps.add(index);
					}
				} else {
					// Single command: match full command for precise step tracking
					const fullCmd = normalizeCmd(section.command);
					const matched = cmds.some(c => normalizeCmd(c) === fullCmd);
					if (matched) {
						completedSteps.add(index);
					}
				}
				// Also check for specific tools
				if (section.command.includes('mob_recon') && cmds.some(c => c.includes('mob_recon'))) {
					completedSteps.add(index);
				}
				if (section.command.includes('run_gubbins') && cmds.some(c => c.includes('gubbins'))) {
					completedSteps.add(index);
				}
			}
		});
		completedSteps = new Set(completedSteps);
	});

	// Normalize path for comparison (trim whitespace, remove trailing slashes)
	function normalizePath(path: string): string {
		return path.trim().replace(/\/+$/, '').replace(/\/+/g, '/');
	}

	// Check if user is in the correct directory for a task
	function isInCorrectDir(requiredDir: string | null | undefined): boolean {
		if (!requiredDir) return true;
		// Normalize both paths to handle edge cases (trailing slashes, whitespace)
		return normalizePath(userCurrentDir) === normalizePath(requiredDir);
	}

	// Get short directory name for display (uses the store set by ThreePanelLayout)
	function getShortDir(dir: string): string {
		const dataDir = get(storylineDataDir);
		return dir.replace(dataDir, '~');
	}

	// Check if user can proceed to next step
	function canProceed(stepIndex: number): boolean {
		if (!storyline) return false;
		if (stepIndex <= 1) return true;

		// Always check if the previous step (current step) is a task that needs completion
		const prevStepIndex = stepIndex - 1;
		const prevSection = storyline.sections[prevStepIndex];
		if (prevSection?.type === 'task' && !completedSteps.has(prevStepIndex)) {
			return false;
		}

		const section = storyline.sections[stepIndex];
		// Phase headers and non-task sections don't need completion themselves
		if (section?.type === 'phase' || section?.type === 'intro' || section?.type === 'context' || section?.type === 'complete' || section?.type === 'alert' || section?.type === 'image') {
			return true;
		}
		// Decision sections require a selection to proceed
		if (section?.type === 'decision') {
			return selectedDecision !== null;
		}
		return true;
	}

	function nextStep() {
		if (!storyline) return;
		const nextIdx = currentStep + 1;
		if (nextIdx < storyline.sections.length && canProceed(nextIdx)) {
			currentStep = nextIdx;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function goToStep(index: number) {
		if (canProceed(index)) {
			currentStep = index;
		}
	}

	function handleFinish() {
		isFinished = true;
		// Navigate back to the category page (e.g., /tutorial/) instead of home
		const categoryPath = storyline?.category ? `/${storyline.category}/` : '/';
		goto(categoryPath);
	}

	function handleDecision(optionId: string) {
		selectedDecision = optionId;
		// Auto-advance to next step when a decision is made
		nextStep();
	}

	// Check if we're at the complete section
	const isAtComplete = $derived(
		storyline?.sections[currentStep]?.type === 'complete'
	);
</script>

{#if !storyline}
	<div class="h-full flex items-center justify-center text-gray-500" style="display: flex; align-items: center; justify-content: center; height: 100%;">
		<div class="text-center">
			<p class="text-lg mb-2">No storyline selected</p>
			<p class="text-sm">Select a storyline from the home page to begin.</p>
		</div>
	</div>
{:else}
<div class="h-full flex flex-col" style="display: flex; flex-direction: column; height: 100%;">
	<!-- Header -->
	<div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6" style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 1.5rem; flex-shrink: 0;">
		<div class="flex items-center gap-3 mb-2 flex-wrap" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
			{#if storyline.technologyLabel}
				<span class="px-3 py-1 rounded-full text-sm font-medium" style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: {storyline.technologyLabel.includes('Long Read') ? 'rgba(168,85,247,0.9)' : 'rgba(59,130,246,0.9)'};">
					{storyline.technologyLabel}
				</span>
			{/if}
			<span class="bg-green-500/80 px-3 py-1 rounded-full text-sm font-medium" style="background: rgba(34,197,94,0.8); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
				Phase {currentPhase()}
			</span>
			{#if storyline.organism}
				<span class="bg-amber-500/80 px-3 py-1 rounded-full text-sm font-medium" style="background: rgba(245,158,11,0.8); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
					{storyline.organism}
				</span>
			{/if}
		</div>
		<h1 class="text-2xl font-bold" style="font-size: 1.5rem; font-weight: 700;">{storyline.title}</h1>
		<p class="text-blue-100 mt-1" style="color: #dbeafe; margin-top: 0.25rem;">{storyline.subtitle}</p>
	</div>

	<!-- Progress Bar -->
	<div class="bg-gray-100 px-6 py-3 border-b border-gray-200" style="background: #f3f4f6; padding: 0.75rem 1.5rem; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;">
		<div class="flex items-center justify-between text-sm text-gray-600 mb-2" style="display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem; color: #4b5563; margin-bottom: 0.5rem;">
			<span>Progress</span>
			<span>Step {currentStep + 1} of {storyline.sections.length}</span>
		</div>
		<div class="w-full bg-gray-200 rounded-full h-2" style="width: 100%; background: #e5e7eb; border-radius: 9999px; height: 0.5rem;">
			<div
				class="bg-blue-600 h-2 rounded-full transition-all duration-300"
				style="width: {((currentStep + 1) / storyline.sections.length) * 100}%; background: #2563eb; height: 0.5rem; border-radius: 9999px; transition: all 0.3s;"
			></div>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-auto p-6" style="flex: 1; overflow: auto; padding: 1.5rem; min-height: 0;">
		{#each storyline.sections as section, i}
			{#if i <= currentStep}
				<div class="mb-6 animate-fade-in" style="margin-bottom: 1.5rem; opacity: {i < currentStep && section.type !== 'phase' ? '0.5' : '1'};">
					{#if section.type === 'intro'}
						<div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r" style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 1.25rem; border-radius: 0 0.25rem 0.25rem 0;">
							<div class="text-gray-700 leading-relaxed story-content" style="color: #374151; line-height: 1.625;">{@html section.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')}</div>
						</div>
					{:else if section.type === 'context'}
						<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r" style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1.25rem; border-radius: 0 0.25rem 0.25rem 0;">
							<div class="text-gray-700 story-content" style="color: #374151;">{@html section.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')}</div>
						</div>
					{:else if section.type === 'phase'}
						<div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-lg shadow-md" style="background: linear-gradient(to right, #6366f1, #9333ea); color: white; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
							<h2 class="text-lg font-bold" style="font-size: 1.125rem; font-weight: 700;">{section.title}</h2>
							<p class="text-indigo-100 text-sm mt-1" style="color: #e0e7ff; font-size: 0.875rem; margin-top: 0.25rem;">{section.text}</p>
						</div>
					{:else if section.type === 'complete'}
						<div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(to right, #22c55e, #059669); color: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
							<div class="text-center mb-4" style="text-align: center; margin-bottom: 1rem;">
								<span class="text-4xl" style="font-size: 2.25rem;">Completed!</span>
							</div>
							<h2 class="text-xl font-bold text-center" style="font-size: 1.25rem; font-weight: 700; text-align: center;">{section.title}</h2>
							<p class="text-green-100 mt-4 whitespace-pre-line" style="color: #dcfce7; margin-top: 1rem; white-space: pre-line;">{@html section.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}</p>
							<div class="mt-6 text-center" style="margin-top: 1.5rem; text-align: center;">
								<button
									onclick={handleFinish}
									class="px-8 py-3 bg-white text-green-600 font-bold rounded-lg hover:bg-green-50 transition-colors shadow-md"
									style="padding: 0.75rem 2rem; background: white; color: #16a34a; font-weight: 700; border-radius: 0.5rem; border: none; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"
								>
									Finished - Back to Topics
								</button>
							</div>
						</div>
					{:else if section.type === 'alert'}
						<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r" style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 1.25rem; border-radius: 0 0.25rem 0.25rem 0;">
							{#if section.title}
								<h3 class="font-bold text-red-800 mb-2" style="font-weight: 700; color: #991b1b; margin-bottom: 0.5rem;">{section.title}</h3>
							{/if}
							<p class="text-red-700 whitespace-pre-line" style="color: #b91c1c; white-space: pre-line;">{@html section.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}</p>
						</div>
					{:else if section.type === 'decision'}
						<div class="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r" style="background: #faf5ff; border-left: 4px solid #a855f7; padding: 1.25rem; border-radius: 0 0.25rem 0.25rem 0;">
							{#if section.title}
								<h3 class="font-bold text-purple-800 mb-2" style="font-weight: 700; color: #6b21a8; margin-bottom: 0.5rem;">{section.title}</h3>
							{/if}
							<p class="text-purple-700 mb-4" style="color: #7c3aed; margin-bottom: 1rem;">{section.text}</p>
							{#if section.options}
								<div class="space-y-3" style="display: flex; flex-direction: column; gap: 0.75rem;">
									{#each section.options as option}
										<button
											onclick={() => handleDecision(option.id)}
											style="width: 100%; text-align: left; padding: 1rem; border-radius: 0.5rem; border: 2px solid {selectedDecision === option.id ? '#9333ea' : '#e5e7eb'}; background: {selectedDecision === option.id ? '#f3e8ff' : 'white'}; cursor: pointer; transition: all 0.2s;"
										>
											<div class="font-semibold text-gray-800" style="font-weight: 600; color: #1f2937;">{option.label}</div>
											<div class="text-sm text-gray-600 mt-1" style="font-size: 0.875rem; color: #4b5563; margin-top: 0.25rem;">{option.description}</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{:else if section.type === 'image'}
						<div class="bg-gray-50 rounded-lg p-4 border border-gray-200" style="background: #f9fafb; border-radius: 0.5rem; padding: 1.25rem; border: 1px solid #e5e7eb;">
							{#if section.title}
								<h3 class="font-semibold text-gray-800 mb-2" style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">{section.title}</h3>
							{/if}
							{#if section.imageUrl}
								<div class="rounded-lg overflow-hidden mb-3 bg-gray-200" style="border-radius: 0.5rem; overflow: hidden; margin-bottom: 0.75rem; background: #e5e7eb;">
									<img
										src={section.imageUrl}
										alt={section.imageAlt || section.title || 'Storyline image'}
										class="w-full h-auto object-cover"
										style="width: 100%; height: auto; object-fit: cover;"
										onerror={(e) => {
											const target = e.currentTarget as HTMLImageElement;
											target.onerror = null;
											target.src = '/images/placeholder.svg';
											target.parentElement?.classList.add('bg-gray-100');
										}}
									/>
								</div>
							{/if}
							<p class="text-gray-600 text-sm italic" style="color: #4b5563; font-size: 0.875rem; font-style: italic;">{section.text}</p>
						</div>
					{:else if section.type === 'task'}
						<div class="bg-gray-50 rounded-lg p-4 border border-gray-200" style="background: {completedSteps.has(i) ? '#f0fdf4' : '#f9fafb'}; border-radius: 0.5rem; padding: 1.25rem; border: 1px solid {completedSteps.has(i) ? '#4ade80' : '#e5e7eb'};">
							<div class="flex items-center justify-between mb-2" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
								{#if section.title}
									<h3 class="font-semibold text-gray-800" style="font-weight: 600; color: #1f2937;">{section.title}</h3>
								{/if}
								{#if completedSteps.has(i)}
									<span class="text-green-600 text-sm font-medium" style="color: #16a34a; font-size: 0.875rem; font-weight: 500;">Completed</span>
								{/if}
							</div>
							<p class="text-gray-700 mb-3" style="color: #374151; margin-bottom: 0.75rem;">{section.text}</p>

							{#if section.command}
								<!-- Directory check warning -->
								{#if section.requiredDir && !isInCorrectDir(section.requiredDir) && !completedSteps.has(i)}
									<div class="bg-amber-50 border border-amber-300 rounded p-3 mb-3" style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 0.25rem; padding: 0.75rem; margin-bottom: 0.75rem;">
										<div class="flex items-start gap-2" style="display: flex; align-items: flex-start; gap: 0.5rem;">
											<span class="text-amber-500 font-medium" style="color: #f59e0b; font-weight: 500;">Warning</span>
											<div class="flex-1" style="flex: 1;">
												<p class="text-amber-800 text-sm font-medium" style="color: #92400e; font-size: 0.875rem; font-weight: 500;">Wrong directory</p>
												<p class="text-amber-700 text-sm" style="color: #b45309; font-size: 0.875rem;">
													You are in <code class="bg-amber-100 px-1 rounded" style="background: #fef3c7; padding: 0 0.25rem; border-radius: 0.25rem;">{getShortDir(userCurrentDir)}</code>
												</p>
												<p class="text-amber-700 text-sm mt-1" style="color: #b45309; font-size: 0.875rem; margin-top: 0.25rem;">Navigate to the required directory:</p>
												<div class="bg-gray-900 rounded p-2 mt-1 font-mono text-sm" style="background: #111827; border-radius: 0.25rem; padding: 0.5rem; margin-top: 0.25rem; font-family: monospace; font-size: 0.875rem;">
													<code class="text-yellow-400" style="color: #facc15;">cd {getShortDir(section.requiredDir)}</code>
												</div>
											</div>
										</div>
									</div>
								{:else if section.requiredDir && isInCorrectDir(section.requiredDir) && !completedSteps.has(i)}
									<div class="flex items-center gap-2 text-green-600 text-sm mb-2" style="display: flex; align-items: center; gap: 0.5rem; color: #16a34a; font-size: 0.875rem; margin-bottom: 0.5rem;">
										<span>OK</span>
										<span>You are in the correct directory ({getShortDir(section.requiredDir)})</span>
									</div>
								{/if}

								<!-- Instruction for users -->
								{#if !completedSteps.has(i)}
									<div class="bg-blue-50 border border-blue-200 rounded p-2 mb-3 flex items-center gap-2" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.25rem; padding: 0.5rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
										<span style="font-size: 1rem;">→</span>
										<span class="text-blue-700 text-sm" style="color: #1d4ed8; font-size: 0.875rem;">Type the command below into the terminal on the left screen</span>
									</div>
								{/if}

								<div class="bg-gray-900 rounded p-3 font-mono text-sm overflow-x-auto mb-3" style="background: #111827; border-radius: 0.25rem; padding: 0.75rem; font-family: monospace; font-size: 0.875rem; overflow-x: auto; margin-bottom: 0.75rem;">
									<div class="text-gray-400 text-xs mb-1" style="color: #9ca3af; font-size: 0.75rem; margin-bottom: 0.25rem;">Command:</div>
									<code class="text-green-400 whitespace-pre-wrap break-all" style="color: #4ade80; white-space: pre-wrap; word-break: break-all;">{section.command}</code>
								</div>

								{#if section.parameters && section.parameters.length > 0}
									<div class="bg-white rounded border border-gray-200 p-3 mb-3" style="background: white; border-radius: 0.25rem; border: 1px solid #e5e7eb; padding: 0.75rem; margin-bottom: 0.75rem;">
										<div class="text-xs font-semibold text-gray-500 uppercase mb-2" style="font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 0.5rem;">Parameter Reference</div>
										<dl class="space-y-1 text-sm" style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
											{#each section.parameters as param}
												<div class="flex" style="display: flex;">
													<dt class="font-mono text-blue-600 min-w-[180px] flex-shrink-0" style="font-family: monospace; color: #2563eb; min-width: 180px; flex-shrink: 0;">{param.name}</dt>
													<dd class="text-gray-600" style="color: #4b5563;">{param.desc}</dd>
												</div>
											{/each}
										</dl>
									</div>
								{/if}

								{#if section.explanation}
									<p class="text-gray-500 text-sm italic" style="color: #6b7280; font-size: 0.875rem; font-style: italic;">
										Info: {section.explanation}
									</p>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/each}

		<!-- Next step locked message -->
		{#if currentStep < storyline.sections.length - 1 && !canProceed(currentStep + 1) && !isAtComplete}
			<div class="text-center py-4 text-gray-500 border-t border-dashed" style="text-align: center; padding: 1rem 0; color: #6b7280; border-top: 1px dashed #d1d5db;">
				<span class="text-lg" style="font-size: 1.125rem;">Locked</span>
				<p class="text-sm mt-1" style="font-size: 0.875rem; margin-top: 0.25rem;">Execute the current command to unlock the next step</p>
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<div class="border-t border-gray-200 bg-gray-50 p-4 flex justify-between items-center" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f9fafb; border-top: 1px solid #e5e7eb; flex-shrink: 0;">
		<button
			class="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			style="padding: 0.5rem 1rem; color: #4b5563; background: transparent; border: none; border-radius: 0.25rem; cursor: pointer; font-size: inherit;"
			disabled={currentStep === 0}
			onclick={prevStep}
		>
			Previous
		</button>
		<div class="flex gap-1 overflow-x-auto max-w-[200px]" style="display: flex; gap: 0.25rem; overflow-x: auto; max-width: 200px;">
			{#each storyline.sections as section, i}
				{#if section.type === 'phase'}
					<div class="w-1 h-3 bg-indigo-400 rounded-full mx-1" style="width: 4px; height: 12px; background: #818cf8; border-radius: 9999px; margin: 0 4px;"></div>
				{:else}
					<button
						class="w-2 h-2 rounded-full transition-colors flex-shrink-0"
						style="width: 8px; height: 8px; border-radius: 9999px; border: none; flex-shrink: 0; cursor: pointer; background: {i <= currentStep ? '#2563eb' : '#d1d5db'};"
						onclick={() => goToStep(i)}
						aria-label="Go to step {i + 1}"
						disabled={!canProceed(i)}
					></button>
				{/if}
			{/each}
		</div>
		{#if isAtComplete}
			<button
				onclick={handleFinish}
				class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
				style="padding: 0.5rem 1rem; background: #16a34a; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: inherit;"
			>
				Finished
			</button>
		{:else}
			<button
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				style="padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: inherit;"
				disabled={currentStep >= storyline.sections.length - 1 || !canProceed(currentStep + 1)}
				onclick={nextStep}
			>
				{#if currentStep < storyline.sections.length - 1 && !canProceed(currentStep + 1)}
					Locked
				{:else}
					Next
				{/if}
			</button>
		{/if}
	</div>
</div>
{/if}

<style>
	.animate-fade-in {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Story content table styling */
	:global(.story-content table) {
		border-collapse: collapse;
		margin: 0.75rem 0;
		font-size: 0.875rem;
		width: auto;
		min-width: 300px;
	}

	:global(.story-content th),
	:global(.story-content td) {
		border: 1px solid #d1d5db;
		padding: 0.5rem 1rem;
		text-align: left;
	}

	:global(.story-content th) {
		background: #f3f4f6;
		font-weight: 600;
	}

	:global(.story-content tr:nth-child(even)) {
		background: #f9fafb;
	}

	:global(.story-content ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	:global(.story-content ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	:global(.story-content li) {
		margin: 0.25rem 0;
	}
</style>
