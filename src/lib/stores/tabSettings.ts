import { writable } from 'svelte/store';

export type TabId = 'list' | 'calendar' | 'kanban' | 'table';

export interface TabConfig {
	id: TabId;
	label: string;
	icon: string;
}

const DEFAULT_TABS: TabConfig[] = [
	{ id: 'list', label: 'รายการ', icon: 'List' },
	{ id: 'calendar', label: 'ปฏิทิน', icon: 'CalendarDays' },
	{ id: 'kanban', label: 'Kanban', icon: 'Columns3' },
	{ id: 'table', label: 'ตาราง', icon: 'Table' }
];

const STORAGE_KEY = 'tab-settings-v1';

function createTabSettingsStore() {
	// Load from localStorage
	const loadFromStorage = (): TabConfig[] => {
		if (typeof window === 'undefined') return DEFAULT_TABS;
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				// Validate that all required tabs exist
				if (Array.isArray(parsed) && parsed.length === 4) {
					return parsed;
				}
			}
		} catch (e) {
			console.error('Failed to load tab settings:', e);
		}
		return DEFAULT_TABS;
	};

	const { subscribe, set, update } = writable<TabConfig[]>(loadFromStorage());

	return {
		subscribe,
		set: (tabs: TabConfig[]) => {
			set(tabs);
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
			}
		},
		moveUp: (index: number) => {
			update(tabs => {
				if (index <= 0) return tabs;
				const newTabs = [...tabs];
				[newTabs[index - 1], newTabs[index]] = [newTabs[index], newTabs[index - 1]];
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs));
				}
				return newTabs;
			});
		},
		moveDown: (index: number) => {
			update(tabs => {
				if (index >= tabs.length - 1) return tabs;
				const newTabs = [...tabs];
				[newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]];
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs));
				}
				return newTabs;
			});
		},
		reset: () => {
			set(DEFAULT_TABS);
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TABS));
			}
		}
	};
}

export const tabSettings = createTabSettingsStore();
