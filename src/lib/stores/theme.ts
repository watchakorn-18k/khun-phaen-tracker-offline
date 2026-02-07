import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'khu-phaen-theme';

type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
	// Get initial value from localStorage or default to 'system'
	const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
	const initial: Theme = (stored as Theme) || 'system';

	const { subscribe, set: internalSet, update } = writable<Theme>(initial);

	function applyTheme(theme: Theme) {
		if (typeof window === 'undefined') return;

		const root = document.documentElement;
		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);

		console.log('applyTheme:', { theme, systemPrefersDark, isDark, rootClasses: root.classList.toString() });

		// Apply dark class based on theme
		if (isDark) {
			root.classList.add('dark');
		} else {
			// Force remove dark class with multiple approaches
			root.classList.remove('dark');
			document.body.classList.remove('dark');

			// Force remove using className directly
			root.className = root.className.replace(/\bdark\b/g, '').trim();
			document.body.className = document.body.className.replace(/\bdark\b/g, '').trim();

			console.log('After removal - root:', root.classList.toString(), 'body:', document.body.classList.toString());
		}

		localStorage.setItem(STORAGE_KEY, theme);
	}

	// Apply initial theme
	if (typeof window !== 'undefined') {
		applyTheme(initial);

		// Listen for system theme changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			const current = localStorage.getItem(STORAGE_KEY) as Theme || 'system';
			if (current === 'system') {
				applyTheme('system');
			}
		});
	}

	return {
		subscribe,
		set: (theme: Theme) => {
			internalSet(theme);
			applyTheme(theme);
		},
		update,
		toggle: () => {
			// Use get to retrieve current value
			const currentTheme: Theme = get(theme);

			// Determine if currently dark
			const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
			const isCurrentlyDark = currentTheme === 'dark' || (currentTheme === 'system' && systemPrefersDark);

			// Toggle to the opposite
			const next: Theme = isCurrentlyDark ? 'light' : 'dark';

			// Use the custom set method which calls applyTheme
			internalSet(next);
			applyTheme(next);
		}
	};
}

export const theme = createThemeStore();
