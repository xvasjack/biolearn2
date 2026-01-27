<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated } from '$lib/stores/auth';
	import ThreePanelLayout from '$lib/components/ThreePanelLayout.svelte';
	import { getStoryline } from '$lib/storylines/wgs-bacteria';

	onMount(() => {
		if (!$isAuthenticated) goto('/');
	});

	const storyline = getStoryline('hospital');
</script>

<ThreePanelLayout {storyline} />
