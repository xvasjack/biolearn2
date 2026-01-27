<script lang="ts">
	import '../app.css';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import { isAuthenticated, currentUser, auth } from '$lib/stores/auth';
	import { authModalOpen } from '$lib/stores/authModal';

	let { children } = $props();
</script>

<svelte:head>
	<title>BioLearn - Bioinformatics Learning Platform</title>
	<meta name="description" content="Learn bioinformatics through narrative-driven, hands-on analysis" />
</svelte:head>

<div class="app-shell">
	<nav class="top-bar">
		<span class="brand">BioLearn</span>
		<div class="auth-area">
			{#if $isAuthenticated && $currentUser}
				<span class="username">{$currentUser.username}</span>
				<button class="nav-btn" onclick={() => auth.logout()}>Log out</button>
			{:else}
				<button class="nav-btn" onclick={() => ($authModalOpen = true)}>Log in / Register</button>
			{/if}
		</div>
	</nav>

	<AuthModal bind:open={$authModalOpen} />

	<div class="app-content">
		{@render children()}
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}
	.app-content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.top-bar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: #181825;
		border-bottom: 1px solid #313244;
	}
	.brand {
		font-weight: 700;
		font-size: 1.1rem;
		color: #89b4fa;
	}
	.auth-area {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.username {
		color: #a6adc8;
		font-size: 0.85rem;
	}
	.nav-btn {
		background: none;
		border: 1px solid #45475a;
		color: #cdd6f4;
		padding: 0.3rem 0.75rem;
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: pointer;
	}
	.nav-btn:hover {
		border-color: #89b4fa;
		color: #89b4fa;
	}
</style>
