import { writable, derived } from 'svelte/store';
import { API_BASE_URL } from '$lib/stores/terminal';

export interface AuthUser {
	id: string;
	email: string;
	username: string;
	subscription_tier: string;
	subscription_plan: string | null;
	subscription_expires_at: string | null;
	is_pro: boolean;
}

interface AuthState {
	user: AuthUser | null;
	accessToken: string | null;
	refreshToken: string | null;
}

function createAuthStore() {
	// Restore from localStorage
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('biolearn_auth') : null;
	const initial: AuthState = stored
		? JSON.parse(stored)
		: { user: null, accessToken: null, refreshToken: null };

	const { subscribe, set, update } = writable<AuthState>(initial);

	function persist(state: AuthState) {
		if (typeof localStorage !== 'undefined') {
			if (state.accessToken) {
				localStorage.setItem('biolearn_auth', JSON.stringify(state));
			} else {
				localStorage.removeItem('biolearn_auth');
			}
		}
	}

	async function apiFetch(path: string, options: RequestInit = {}) {
		return fetch(`${API_BASE_URL}/users${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		});
	}

	return {
		subscribe,

		async register(email: string, username: string, password: string) {
			const res = await apiFetch('/register', {
				method: 'POST',
				body: JSON.stringify({ email, username, password }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Registration failed');
			}
			const data = await res.json();
			const state: AuthState = {
				user: data.user,
				accessToken: data.tokens.access_token,
				refreshToken: data.tokens.refresh_token,
			};
			set(state);
			persist(state);
		},

		async login(identifier: string, password: string) {
			const res = await apiFetch('/login', {
				method: 'POST',
				body: JSON.stringify({ identifier, password }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Login failed');
			}
			const data = await res.json();
			const state: AuthState = {
				user: data.user,
				accessToken: data.tokens.access_token,
				refreshToken: data.tokens.refresh_token,
			};
			set(state);
			persist(state);
		},

		logout() {
			const state: AuthState = { user: null, accessToken: null, refreshToken: null };
			set(state);
			persist(state);
		},

		async refreshToken() {
			let current: AuthState = { user: null, accessToken: null, refreshToken: null };
			const unsub = subscribe((s) => (current = s));
			unsub();

			if (!current.refreshToken) return;

			const res = await apiFetch('/refresh', {
				method: 'POST',
				body: JSON.stringify({ refresh_token: current.refreshToken }),
			});
			if (!res.ok) {
				// Refresh failed — log out
				const empty: AuthState = { user: null, accessToken: null, refreshToken: null };
				set(empty);
				persist(empty);
				return;
			}
			const tokens = await res.json();
			update((s) => {
				const next = {
					...s,
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token,
				};
				persist(next);
				return next;
			});
		},

		/** Fetch fresh user data (including subscription status) from /me. */
		async fetchMe() {
			let current: AuthState = { user: null, accessToken: null, refreshToken: null };
			const unsub = subscribe((s) => (current = s));
			unsub();
			if (!current.accessToken) return;

			const res = await fetch(`${API_BASE_URL}/users/me`, {
				headers: { Authorization: `Bearer ${current.accessToken}` },
			});
			if (!res.ok) return;
			const user = await res.json();
			update((s) => {
				const next = { ...s, user };
				persist(next);
				return next;
			});
		},

		/** Helper: get an Authorization header value for API calls. */
		getAuthHeader(): string | null {
			let token: string | null = null;
			const unsub = subscribe((s) => (token = s.accessToken));
			unsub();
			return token ? `Bearer ${token}` : null;
		},
	};
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, ($a) => !!$a.accessToken);
export const currentUser = derived(auth, ($a) => $a.user);

const ADMIN_USERNAMES = ['kreatbio'];

export const isAdmin = derived(auth, ($a) =>
	!!$a.user && ADMIN_USERNAMES.includes($a.user.username)
);

const ADMIN_EMAILS = ['adriana.kreatbio@gmail.com'];

export const isPro = derived(auth, ($a) =>
	!!$a.user?.is_pro || (!!$a.user && ADMIN_EMAILS.includes($a.user.email))
);

export const subscriptionTier = derived(auth, ($a) => $a.user?.subscription_tier ?? 'free');

export function isTutorialRoute(path: string): boolean {
	return path === '/tutorial' || path.startsWith('/tutorial/');
}
