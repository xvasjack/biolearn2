<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated } from '$lib/stores/auth';
	import ThreePanelLayout from '$lib/components/ThreePanelLayout.svelte';
	import { getStoryline } from '$lib/storylines/amplicon-bacteria';

	onMount(() => {
		if (!$isAuthenticated) goto('/');
	});

	const storyline = getStoryline('soil');
</script>

<ThreePanelLayout {storyline} />
