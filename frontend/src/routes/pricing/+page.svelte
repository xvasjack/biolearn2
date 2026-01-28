<script lang="ts">
	import { auth, isAuthenticated } from '$lib/stores/auth';
	import { authModalOpen } from '$lib/stores/authModal';
	import { API_BASE_URL } from '$lib/stores/terminal';

	const plans = [
		{ id: 'day', name: 'Day Pass', price: 'RM 20', duration: '24 hours', accounts: '1 user' },
		{ id: 'monthly', name: '1-Month Pass', price: 'RM 80', duration: '30 days', accounts: '1 user' },
		{ id: 'group_monthly', name: 'Group 1-Month Pass', price: 'RM 640', duration: '30 days', accounts: 'Up to 10 users' },
	];

	let selectedPlan = $state<string | null>(null);
	let checkoutLoading = $state(false);
	let groupEmails = $state('');
	let showGroupInput = $state(false);

	function handlePlanClick(planId: string) {
		if (!$isAuthenticated) {
			$authModalOpen = true;
			return;
		}
		if (planId === 'group_monthly') {
			selectedPlan = planId;
			showGroupInput = true;
			return;
		}
		selectedPlan = planId;
		startCheckout(planId);
	}

	async function startCheckout(planId: string) {
		checkoutLoading = true;
		selectedPlan = planId;
		try {
			const authHeader = auth.getAuthHeader();
			if (!authHeader) {
				$authModalOpen = true;
				return;
			}
			const body: Record<string, unknown> = { plan: planId };
			if (planId === 'group_monthly' && groupEmails.trim()) {
				body.group_emails = groupEmails.split(/[,\n]+/).map(e => e.trim()).filter(Boolean);
			}
			const res = await fetch(`${API_BASE_URL}/payments/create-checkout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: authHeader,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json();
				alert(err.detail || 'Failed to start checkout');
				return;
			}
			const data = await res.json();
			window.location.href = data.checkout_url;
		} finally {
			checkoutLoading = false;
		}
	}
</script>

<div class="pricing-page">
	<div class="mx-auto max-w-4xl px-6 py-16">
		<h1 class="mb-4 text-center text-4xl font-bold text-black">Pricing</h1>
		<p class="mb-12 text-center text-lg text-gray-500">Get access to all modules.</p>

		<div class="grid gap-6 md:grid-cols-3">
			{#each plans as plan}
				<button
					onclick={() => handlePlanClick(plan.id)}
					disabled={checkoutLoading && selectedPlan === plan.id}
					class="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg transition-all hover:border-blue-400 hover:shadow-xl {checkoutLoading && selectedPlan === plan.id ? 'cursor-wait opacity-70' : 'cursor-pointer'}"
				>
					<h2 class="mb-2 text-xl font-bold text-black">{plan.name}</h2>
					<p class="mb-1 text-3xl font-bold text-blue-500">{plan.price}</p>
					<p class="text-sm text-black">{plan.duration}</p>
					<p class="mt-2 text-sm text-black">{plan.accounts}</p>
					{#if checkoutLoading && selectedPlan === plan.id}
						<p class="mt-3 text-sm text-blue-500">Redirecting to checkout...</p>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Group emails modal -->
		{#if showGroupInput}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog">
				<div class="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-xl font-bold text-black">Group Member Emails</h2>
						<button onclick={() => showGroupInput = false} class="text-gray-400 hover:text-black">
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					<p class="mb-4 text-sm text-gray-500">Enter up to 10 member emails, comma or newline separated.</p>
					<textarea
						bind:value={groupEmails}
						rows="4"
						class="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none"
						placeholder="user1@example.com, user2@example.com"
					></textarea>
					<button
						onclick={() => startCheckout('group_monthly')}
						disabled={checkoutLoading}
						class="mt-4 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{checkoutLoading ? 'Redirecting to checkout...' : 'Continue to Payment'}
					</button>
				</div>
			</div>
		{/if}

		<div class="mt-12 text-center text-sm text-black">
			<p>Access starts immediately after payment.</p>
			<p class="mb-8">Upgrade or switch plans at anytime.</p>

			<h3 class="mb-2 text-base font-semibold">Payment methods</h3>
			<svg class="mx-auto mb-2" width="80" height="33" viewBox="0 0 80 33" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M74.8 0H5.2C2.3 0 0 2.3 0 5.2v22.6C0 30.7 2.3 33 5.2 33h69.6c2.9 0 5.2-2.3 5.2-5.2V5.2C80 2.3 77.7 0 74.8 0z" fill="#6772E5"/>
				<path d="M37.8 11.5c0-1.7 1.4-2.4 2.4-2.4 1.3 0 2.4.6 3.2 1.5l2.1-2.5c-1.3-1.4-3-2.2-5.2-2.2-4.2 0-6.3 2.8-6.3 5.6 0 5.5 7.5 4.6 7.5 7 0 .8-.7 1.6-1.9 1.6-1.7 0-3-.9-3.7-1.8L34 20.9c1.3 1.5 3.3 2.3 5.4 2.3 3 0 5.7-1.5 5.7-5 0-5.9-7.3-4.8-7.3-6.7zM24.5 6.2l-3.8.8v12.3c0 2.3 1.7 3.9 4 3.9 1.3 0 2.2-.2 2.7-.5v-3.1c-.5.2-2.9.9-2.9-1.3v-5.2h2.9V9.9h-2.9V6.2zM17.5 10.8l-.2-1h-3.4v13h3.9v-8.8c.9-1.2 2.5-1 3-.8V9.9c-.5-.2-2.4-.5-3.3 1zM12.5 9.9H8.6v13h3.9v-13zM12.5 5.7c0-1.3-1-2.3-2.3-2.3S7.9 4.4 7.9 5.7c0 1.3 1 2.3 2.3 2.3s2.3-1 2.3-2.3zM58.5 16.4c0-4.5-2.2-8-6.3-8-4.2 0-6.7 3.5-6.7 8 0 5.3 3 7.9 7.2 7.9 2.1 0 3.7-.5 4.9-1.1v-3c-1.2.6-2.6 1-4.3 1-1.7 0-3.2-.6-3.4-2.7h8.5c0-.2.1-1.2.1-2.1zm-8.6-1.7c0-2 1.2-2.8 2.3-2.8 1.1 0 2.2.8 2.2 2.8h-4.5zM71.8 8.4c-1.7 0-2.8.8-3.4 1.3l-.2-1.1h-3.5v17.8l3.9-.8v-4.3c.6.4 1.5 1 3 1 3 0 5.8-2.5 5.8-7.9.1-5-2.7-6-5.6-6zm-1 9.4c-1 0-1.6-.4-2-.8v-6.3c.4-.5 1-.9 2-.9 1.5 0 2.6 1.7 2.6 4 0 2.3-1 4-2.6 4z" fill="#fff"/>
			</svg>
			<p class="mb-8">Bank transfer / cards accepted</p>

			<p>Questions? Contact support at <a href="mailto:adriana.kreatbio@gmail.com" class="text-blue-500 underline">adriana.kreatbio@gmail.com</a></p>
		</div>
	</div>

</div>

<style>
	.pricing-page {
		height: 100vh;
		background: white;
		overflow-y: auto;
	}
</style>
