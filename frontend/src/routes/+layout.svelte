<script lang="ts">
	import '../app.css';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import { isAuthenticated, currentUser, isPro, auth } from '$lib/stores/auth';
	import { authModalOpen } from '$lib/stores/authModal';

	let { children } = $props();

	function daysRemaining(): number | null {
		const user = $currentUser;
		if (!user?.subscription_expires_at) return null;
		const now = Date.now();
		const expires = new Date(user.subscription_expires_at).getTime();
		const diff = expires - now;
		if (diff <= 0) return 0;
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	}
</script>

<svelte:head>
	<title>BioLearn - Bioinformatics Learning Platform</title>
	<meta name="description" content="Learn bioinformatics through narrative-driven, hands-on analysis" />
</svelte:head>

<div class="app-shell">
	<nav class="top-bar">
		<div class="nav-left">
			<span class="brand">BioLearn</span>
			<span class="nav-sep">|</span>
			<a href="/" class="nav-link">Mainpage</a>
			<span class="nav-sep">|</span>
			<a href="/pricing" class="nav-link">Pricing</a>
		</div>
		<div class="auth-area">
			{#if $isAuthenticated && $currentUser}
				{#if $isPro}
					{@const days = daysRemaining()}
					{#if days !== null}
						<span class="sub-badge" class:expiring={days <= 3}>
							Pro · {days === 0 ? 'Expires today' : days === 1 ? '1 day left' : `${days} days left`}
						</span>
					{/if}
				{:else}
					<span class="sub-badge free">Free</span>
				{/if}
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

	<footer class="site-footer">
		<span class="footer-brand">Kreatbio Sdn. Bhd.</span>
		<span class="footer-sep">·</span>
		<a href="https://kreatbio.com" target="_blank" rel="noopener noreferrer">kreatbio.com</a>
	</footer>
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
		overflow-y: auto;
		display: flex;
		flex-direction: column;
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
	.nav-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.brand {
		font-weight: 700;
		font-size: 1.1rem;
		color: #89b4fa;
	}
	.nav-link {
		color: #a6adc8;
		font-size: 0.85rem;
		font-weight: 700;
		text-decoration: none;
	}
	.nav-sep {
		color: #45475a;
		font-size: 0.85rem;
		font-weight: 700;
	}
	.nav-link:hover {
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
	.sub-badge {
		font-size: 0.75rem;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: rgba(16, 185, 129, 0.15);
		color: #6ee7b7;
		font-weight: 600;
	}
	.sub-badge.expiring {
		background: rgba(245, 158, 11, 0.15);
		color: #fcd34d;
	}
	.sub-badge.free {
		background: rgba(100, 116, 139, 0.15);
		color: #94a3b8;
	}
	.site-footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0.8rem 1rem;
		background: #181825;
		border-top: 1px solid #313244;
		font-size: 0.79rem;
		color: #6c7086;
	}
	.footer-brand {
		font-weight: 600;
		color: #a6adc8;
	}
	.footer-sep {
		color: #45475a;
	}
	.site-footer a {
		color: #89b4fa;
		text-decoration: none;
	}
	.site-footer a:hover {
		text-decoration: underline;
	}
</style>
