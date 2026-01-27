<script lang="ts">
	import ThreePanelLayout from '$lib/components/ThreePanelLayout.svelte';
	import { getStoryline } from '$lib/storylines/r-reports';

	const storyline = getStoryline('amplicon');
</script>

<ThreePanelLayout {storyline} />
