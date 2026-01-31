<script lang="ts">
	import { onMount } from 'svelte';

	interface SpotlightStep {
		selector: string;
		title: string;
		description: string;
		position: 'top' | 'bottom' | 'left' | 'right';
	}

	let {
		steps = [],
		onComplete = () => {}
	}: {
		steps: SpotlightStep[];
		onComplete: () => void;
	} = $props();

	let currentStepIndex = $state(0);
	let spotlightRect = $state<DOMRect | null>(null);
	let tooltipStyle = $state('');
	let isVisible = $state(false);

	const padding = 8;
	const borderRadius = 8;

	function calculatePosition() {
		if (currentStepIndex >= steps.length) return;
		const step = steps[currentStepIndex];
		const el = document.querySelector(step.selector);
		if (!el) {
			// If element not found, skip to next step
			if (currentStepIndex < steps.length - 1) {
				currentStepIndex++;
				requestAnimationFrame(calculatePosition);
			}
			return;
		}

		const rect = el.getBoundingClientRect();
		spotlightRect = rect;

		// Calculate tooltip position
		const tooltipWidth = 320;
		const tooltipGap = 16;
		let top = 0;
		let left = 0;

		switch (step.position) {
			case 'bottom':
				top = rect.bottom + padding + tooltipGap;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case 'top':
				top = rect.top - padding - tooltipGap - 160; // approximate tooltip height
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case 'right':
				top = rect.top + rect.height / 2 - 80;
				left = rect.right + padding + tooltipGap;
				break;
			case 'left':
				top = rect.top + rect.height / 2 - 80;
				left = rect.left - padding - tooltipGap - tooltipWidth;
				break;
		}

		// Clamp to viewport
		left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
		top = Math.max(16, Math.min(top, window.innerHeight - 200));

		tooltipStyle = `position: fixed; top: ${top}px; left: ${left}px; width: ${tooltipWidth}px; z-index: 10000;`;
	}

	function nextStep() {
		if (currentStepIndex < steps.length - 1) {
			currentStepIndex++;
			requestAnimationFrame(calculatePosition);
		} else {
			isVisible = false;
			onComplete();
		}
	}

	function skip() {
		isVisible = false;
		onComplete();
	}

	onMount(() => {
		isVisible = true;
		requestAnimationFrame(calculatePosition);

		const handleResize = () => calculatePosition();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

{#if isVisible && spotlightRect}
	<!-- SVG overlay with cutout -->
	<svg
		style="position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 9999; pointer-events: none;"
		xmlns="http://www.w3.org/2000/svg"
	>
		<defs>
			<mask id="spotlight-mask">
				<rect width="100%" height="100%" fill="white" />
				<rect
					x={spotlightRect.left - padding}
					y={spotlightRect.top - padding}
					width={spotlightRect.width + padding * 2}
					height={spotlightRect.height + padding * 2}
					rx={borderRadius}
					ry={borderRadius}
					fill="black"
				/>
			</mask>
		</defs>
		<rect
			width="100%"
			height="100%"
			fill="rgba(0,0,0,0.65)"
			mask="url(#spotlight-mask)"
			style="pointer-events: all;"
			role="presentation"
		/>
	</svg>

	<!-- Spotlight border -->
	<div
		style="position: fixed; left: {spotlightRect.left - padding}px; top: {spotlightRect.top - padding}px; width: {spotlightRect.width + padding * 2}px; height: {spotlightRect.height + padding * 2}px; border: 2px solid rgba(96, 165, 250, 0.8); border-radius: {borderRadius}px; z-index: 9999; pointer-events: none; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);"
	></div>

	<!-- Tooltip -->
	<div style={tooltipStyle}>
		<div style="background: white; border-radius: 0.75rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); padding: 1.25rem; border: 1px solid #e5e7eb;">
			<!-- Step counter -->
			<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
				<span style="font-size: 0.75rem; color: #6b7280; font-weight: 500;">
					Step {currentStepIndex + 1} of {steps.length}
				</span>
				<div style="display: flex; gap: 4px;">
					{#each steps as _, i}
						<div
							style="width: 8px; height: 8px; border-radius: 9999px; background: {i <= currentStepIndex ? '#3b82f6' : '#d1d5db'}; transition: background 0.2s;"
						></div>
					{/each}
				</div>
			</div>

			<!-- Title -->
			<h3 style="font-size: 1.05rem; font-weight: 700; color: #1f2937; margin-bottom: 0.5rem;">
				{steps[currentStepIndex].title}
			</h3>

			<!-- Description -->
			<p style="font-size: 0.875rem; color: #4b5563; line-height: 1.5; margin-bottom: 1rem;">
				{steps[currentStepIndex].description}
			</p>

			<!-- Actions -->
			<div style="display: flex; align-items: center; justify-content: space-between;">
				<button
					onclick={skip}
					style="font-size: 0.8rem; color: #9ca3af; background: none; border: none; cursor: pointer; padding: 0.25rem;"
				>
					Skip tour
				</button>
				<button
					onclick={nextStep}
					style="padding: 0.5rem 1.25rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer;"
				>
					{currentStepIndex < steps.length - 1 ? 'Next' : 'Finish'}
				</button>
			</div>
		</div>
	</div>
{/if}
