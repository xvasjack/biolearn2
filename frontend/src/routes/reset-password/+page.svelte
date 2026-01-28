<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);

	const token = $derived($page.url.searchParams.get('token') ?? '');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		loading = true;
		try {
			const res = await fetch('/api/users/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, new_password: newPassword })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.detail || 'Something went wrong');
			success = true;
			setTimeout(() => goto('/'), 3000);
		} catch (err: any) {
			error = err.message || 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<div class="card">
		<h1>Reset Password</h1>

		{#if !token}
			<p class="error">Missing reset token. Please use the link from your email.</p>
		{:else if success}
			<p class="success">Password reset successfully! Redirecting to home page...</p>
		{:else}
			<form onsubmit={handleSubmit}>
				<label>
					New Password
					<input type="password" bind:value={newPassword} required minlength="4" />
				</label>
				<label>
					Confirm Password
					<input type="password" bind:value={confirmPassword} required minlength="4" />
				</label>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<button type="submit" class="submit-btn" disabled={loading}>
					{loading ? '...' : 'Reset Password'}
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #11111b;
	}
	.card {
		background: #1e1e2e;
		color: #cdd6f4;
		border-radius: 12px;
		padding: 2rem;
		width: 360px;
		max-width: 90vw;
	}
	h1 {
		margin: 0 0 1.25rem;
		font-size: 1.3rem;
	}
	label {
		display: block;
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
	}
	input {
		display: block;
		width: 100%;
		margin-top: 0.25rem;
		padding: 0.5rem 0.6rem;
		border: 1px solid #45475a;
		border-radius: 6px;
		background: #313244;
		color: #cdd6f4;
		font-size: 0.95rem;
		box-sizing: border-box;
	}
	input:focus {
		outline: none;
		border-color: #89b4fa;
	}
	.error {
		color: #f38ba8;
		font-size: 0.85rem;
		margin: 0.5rem 0;
	}
	.success {
		color: #a6e3a1;
		font-size: 0.9rem;
	}
	.submit-btn {
		width: 100%;
		padding: 0.6rem;
		margin-top: 0.5rem;
		background: #89b4fa;
		color: #1e1e2e;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
	}
	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
