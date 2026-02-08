import { writable, get } from 'svelte/store';

// WASM Compression module
let wasmModule: any = null;
let compress: ((data: string) => string) | null = null;
let decompress: ((data: string) => string) | null = null;

// Loading state
export const compressionReady = writable(false);
export const compressionLoading = writable(false);
export const compressionStats = writable({
	originalSize: 0,
	compressedSize: 0,
	savings: 0,
	ratio: 0
});

// Initialize WASM compression
export async function initCompression() {
	if (compressionLoading.get() || compressionReady.get()) return;
	
	compressionLoading.set(true);
	
	try {
		const wasm = await import('../../../static/wasm-compress/wasm_compress.js');
		await wasm.default();
		wasmModule = wasm;
		
		compress = wasm.compress;
		decompress = wasm.decompress;
		
		compressionReady.set(true);
		console.log('✅ WASM Compression initialized');
		
		// Show stats of current data
		showStorageStats();
	} catch (error) {
		console.error('❌ Failed to load WASM Compression:', error);
		// Fallback to plain localStorage
		compress = null;
		decompress = null;
	} finally {
		compressionLoading.set(false);
	}
}

// Get item from storage (auto-detect compression)
export function getItem(key: string): string | null {
	const data = localStorage.getItem(key);
	if (!data) return null;
	
	// Check if compressed (starts with specific pattern)
	if (decompress && isCompressed(data)) {
		try {
			return decompress(data);
		} catch (e) {
			console.warn('Decompression failed, returning raw:', e);
			return data;
		}
	}
	
	return data;
}

// Set item to storage (with compression if available)
export function setItem(key: string, value: string): void {
	if (compress) {
		try {
			const compressed = compress(value);
			
			// Only use compression if it actually saves space
			if (compressed.length < value.length) {
				localStorage.setItem(key, compressed);
				
				// Update stats
				const original = new Blob([value]).size;
				const compressed_size = new Blob([compressed]).size;
				const savings = original - compressed_size;
				const ratio = (savings / original) * 100;
				
				compressionStats.set({
					originalSize: original,
					compressedSize: compressed_size,
					savings,
					ratio
				});
				
				console.log(`📦 Compressed ${key}: ${original} -> ${compressed_size} bytes (${ratio.toFixed(1)}% saved)`);
				return;
			}
		} catch (e) {
			console.warn('Compression failed, storing raw:', e);
		}
	}
	
	// Fallback to raw storage
	localStorage.setItem(key, value);
}

// Remove item
export function removeItem(key: string): void {
	localStorage.removeItem(key);
}

// Check if data is compressed
function isCompressed(data: string): boolean {
	// Check if it looks like base64 encoded compressed data
	// LZ4 compressed data in base64 typically starts with these patterns
	if (data.length < 20) return false;
	
	// Simple heuristic: if it's valid base64 and decodes to something
	// that looks like binary data, it's probably compressed
	const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
	return base64Pattern.test(data) && data.length % 4 === 0;
}

// Show storage statistics
export function showStorageStats(): void {
	let total = 0;
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key) {
			const value = localStorage.getItem(key) || '';
			total += value.length;
		}
	}
	
	const quota = 5 * 1024 * 1024; // 5MB typical limit
	const usage = (total / quota) * 100;
	
	console.log(`💾 Storage usage: ${(total / 1024).toFixed(2)} KB / ${(quota / 1024).toFixed(2)} KB (${usage.toFixed(1)}%)`);
}

// Get storage info
export function getStorageInfo(): { used: number; total: number; percentage: number } {
	let total = 0;
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key) {
			const value = localStorage.getItem(key) || '';
			total += value.length * 2; // UTF-16 = 2 bytes per char
		}
	}
	
	const quota = 5 * 1024 * 1024; // 5MB
	return {
		used: total,
		total: quota,
		percentage: (total / quota) * 100
	};
}

// Clear all storage
export function clear(): void {
	localStorage.clear();
}

// Migrate existing data to compressed format
export async function migrateToCompressed(): Promise<void> {
	if (!compress) {
		console.warn('Compression not available, skipping migration');
		return;
	}
	
	console.log('🔄 Migrating storage to compressed format...');
	
	const keys: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key) keys.push(key);
	}
	
	let migrated = 0;
	let saved = 0;
	
	for (const key of keys) {
		const value = localStorage.getItem(key);
		if (!value) continue;
		
		// Skip if already compressed
		if (isCompressed(value)) continue;
		
		try {
			const compressed = compress(value);
			
			// Only migrate if it saves space
			if (compressed.length < value.length) {
				localStorage.setItem(key, compressed);
				migrated++;
				saved += value.length - compressed.length;
			}
		} catch (e) {
			console.warn(`Failed to compress ${key}:`, e);
		}
	}
	
	console.log(`✅ Migration complete: ${migrated} items, saved ${saved} bytes`);
}
