<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated } from '$lib/stores/auth';
	import ThreePanelLayout from '$lib/components/ThreePanelLayout.svelte';
	import { getStoryline } from '$lib/storylines/r-reports';

	onMount(() => {
		if (!$isAuthenticated) goto('/');
	});

	const storyline = getStoryline('rnaseq');
</script>

<ThreePanelLayout {storyline} />
