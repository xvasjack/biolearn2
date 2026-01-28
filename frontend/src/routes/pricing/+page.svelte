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
			<p class="mb-8">Access starts immediately after payment. Upgrade or switch plans at anytime.</p>

			<h3 class="mb-2 text-base font-semibold">Payment methods</h3>
			<img src="/images/stripe-logo-black-transparent.png" alt="Stripe" class="mx-auto mb-2" width="80" />
			<p>Payments processed securely by Stripe</p>
			<p class="mb-8">Bank transfer / cards accepted</p>

			<p>Questions? Contact support at <a href="mailto:adriana.kreatbio@gmail.com" class="text-blue-500 underline">adriana.kreatbio@gmail.com</a></p>
		</div>
	</div>

</div>

<style>
	.pricing-page {
		background: white;
		flex: 1;
	}
</style>
