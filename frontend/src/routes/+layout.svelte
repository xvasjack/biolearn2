<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>BioLearn - Bioinformatics Learning Platform</title>
	<meta name="description" content="Learn bioinformatics through narrative-driven, hands-on analysis" />
</svelte:head>

{@render children()}
