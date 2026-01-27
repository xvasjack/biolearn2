<script lang="ts">
	import ThreePanelLayout from '$lib/components/ThreePanelLayout.svelte';
	import { getStoryline } from '$lib/storylines/amplicon-bacteria';

	const storyline = getStoryline('water');
</script>

<ThreePanelLayout {storyline} />
