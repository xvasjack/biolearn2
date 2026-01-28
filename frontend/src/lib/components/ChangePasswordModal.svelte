<script lang="ts">
	import { auth } from '$lib/stores/auth';

	let { open = $bindable(false) } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	function reset() {
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		error = '';
		success = '';
		loading = false;
	}

	function close() {
		open = false;
		reset();
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		if (newPassword !== confirmPassword) {
			error = 'New passwords do not match.';
			return;
		}

		loading = true;
		try {
			const authHeader = auth.getAuthHeader();
			if (!authHeader) throw new Error('Not authenticated');

			const res = await fetch('/api/users/change-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: authHeader
				},
				body: JSON.stringify({
					current_password: currentPassword,
					new_password: newPassword
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.detail || 'Something went wrong');
			success = 'Password changed successfully.';
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err: any) {
			error = err.message || 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" onclick={close}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<button class="close-btn" onclick={close}>&times;</button>
			<h2>Change Password</h2>

			<form onsubmit={handleSubmit}>
				<label>
					Current Password
					<input type="password" bind:value={currentPassword} required />
				</label>
				<label>
					New Password
					<input type="password" bind:value={newPassword} required minlength="4" />
				</label>
				<label>
					Confirm New Password
					<input type="password" bind:value={confirmPassword} required minlength="4" />
				</label>

				{#if error}
					<p class="error">{error}</p>
				{/if}
				{#if success}
					<p class="success">{success}</p>
				{/if}

				<button type="submit" class="submit-btn" disabled={loading}>
					{loading ? '...' : 'Change Password'}
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal {
		background: #1e1e2e;
		color: #cdd6f4;
		border-radius: 12px;
		padding: 2rem;
		width: 360px;
		max-width: 90vw;
		position: relative;
	}
	.close-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.75rem;
		background: none;
		border: none;
		color: #cdd6f4;
		font-size: 1.4rem;
		cursor: pointer;
	}
	h2 {
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
		font-size: 0.85rem;
		margin: 0.5rem 0;
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
