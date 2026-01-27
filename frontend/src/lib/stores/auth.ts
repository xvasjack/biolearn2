import { writable, derived } from 'svelte/store';
import { API_BASE_URL } from '$lib/stores/terminal';

export interface AuthUser {
	id: string;
	email: string;
	username: string;
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

		async login(email: string, password: string) {
			const res = await apiFetch('/login', {
				method: 'POST',
				body: JSON.stringify({ email, password }),
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
