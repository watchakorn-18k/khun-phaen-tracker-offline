import { writable, derived, get } from 'svelte/store';
import type { Task, Project, Assignee } from '$lib/types';

interface SearchDocument {
	id: number;
	title: string;
	project: string;
	category: string;
	notes: string;
	status: string;
	assignee: string;
}

// WASM Search Engine instance
let wasmEngine: any = null;
let wasmModule: any = null;

// Loading state
export const wasmLoading = writable(false);
export const wasmReady = writable(false);
export const wasmError = writable<string | null>(null);

// Search state
export const searchQuery = writable('');
export const searchResults = writable<Task[]>([]);
export const searchSuggestions = writable<string[]>([]);
export const isSearching = writable(false);

// Initialize WASM module
export async function initWasmSearch() {
	if (wasmReady.get() || wasmLoading.get()) return;
	
	wasmLoading.set(true);
	wasmError.set(null);
	
	try {
		// Dynamic import of WASM module
		const wasm = await import('../../../static/wasm/wasm_search.js');
		await wasm.default();
		wasmModule = wasm;
		wasmEngine = new wasm.SearchEngine();
		
		wasmReady.set(true);
		console.log('WASM Search Engine initialized');
	} catch (error) {
		console.error('Failed to load WASM:', error);
		wasmError.set('ไม่สามารถโหลด WASM Search Engine ได้');
	} finally {
		wasmLoading.set(false);
	}
}

// Index tasks for searching
export function indexTasks(tasks: Task[]) {
	if (!wasmEngine) return;
	
	const documents: SearchDocument[] = tasks.map(task => ({
		id: task.id || 0,
		title: task.title,
		project: task.project || '',
		category: task.category,
		notes: task.notes || '',
		status: task.status,
		assignee: task.assignee?.name || ''
	}));
	
	try {
		wasmEngine.index_documents(documents);
		console.log(`Indexed ${documents.length} tasks`);
	} catch (error) {
		console.error('Failed to index tasks:', error);
	}
}

// Perform search
export function performSearch(query: string, allTasks: Task[]) {
	if (!wasmEngine || !query.trim()) {
		searchResults.set(allTasks);
		return allTasks;
	}
	
	isSearching.set(true);
	
	try {
		const results = wasmEngine.search(query, 100);
		const resultIds = new Set(results.map((r: SearchDocument) => r.id));
		
		// Map back to full Task objects
		const matchedTasks = allTasks.filter(task => 
			task.id && resultIds.has(task.id)
		);
		
		// Sort by search result order
		const orderedTasks: Task[] = [];
		for (const result of results) {
			const task = allTasks.find(t => t.id === result.id);
			if (task) orderedTasks.push(task);
		}
		
		searchResults.set(orderedTasks);
		isSearching.set(false);
		return orderedTasks;
	} catch (error) {
		console.error('Search error:', error);
		searchResults.set(allTasks);
		isSearching.set(false);
		return allTasks;
	}
}

// Get search suggestions
export function getSuggestions(partial: string) {
	if (!wasmEngine || partial.length < 2) {
		searchSuggestions.set([]);
		return;
	}
	
	try {
		const suggestions = wasmEngine.suggest(partial, 10);
		searchSuggestions.set(suggestions);
	} catch (error) {
		console.error('Suggestion error:', error);
		searchSuggestions.set([]);
	}
}

// Clear search
export function clearSearch() {
	searchQuery.set('');
	searchResults.set([]);
	searchSuggestions.set([]);
}

// Derived store for filtered tasks based on search
export function createFilteredTasksStore(tasksStore: ReturnType<typeof writable<Task[]>>) {
	return derived(
		[tasksStore, searchQuery, wasmReady],
		([$tasks, $query, $wasmReady]) => {
			if (!$wasmReady || !$query.trim()) {
				return $tasks;
			}
			
			// Trigger search and return results
			performSearch($query, $tasks);
			return get(searchResults);
		}
	);
}
