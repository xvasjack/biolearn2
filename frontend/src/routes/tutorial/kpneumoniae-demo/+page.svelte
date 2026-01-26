<script lang="ts">
	import ThreePanelLayout from '$lib/components/ThreePanelLayout.svelte';
	import { getStoryline } from '$lib/storylines/tutorial';

	const storyline = getStoryline('kpneumoniae-demo');
</script>

<ThreePanelLayout {storyline} />
