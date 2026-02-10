<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';

	export let totalItems: number;
	export let pageSize: number = 50;
	export let currentPage: number = 1;
	export let pageSizeOptions: number[] = [20, 50, 100];

	$: totalPages = Math.ceil(totalItems / pageSize);
	$: startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	$: endItem = Math.min(currentPage * pageSize, totalItems);

	// Reset to page 1 when pageSize changes
	$: if (pageSize) {
		currentPage = 1;
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	function handlePageSizeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const value = parseInt(select.value);
		if (value === -1) {
			// Custom option - show prompt
			const custom = prompt('กรอกจำนวนรายการต่อหน้า:', '200');
			if (custom) {
				const customValue = parseInt(custom);
				if (customValue > 0) {
					pageSize = customValue;
				}
			}
		} else {
			pageSize = value;
		}
	}

	// Generate page numbers to show
	$: pageNumbers = generatePageNumbers(currentPage, totalPages);

	function generatePageNumbers(current: number, total: number): (number | string)[] {
		if (total <= 7) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}

		const pages: (number | string)[] = [];
		
		if (current <= 4) {
			// Near start
			for (let i = 1; i <= 5; i++) pages.push(i);
			pages.push('...');
			pages.push(total);
		} else if (current >= total - 3) {
			// Near end
			pages.push(1);
			pages.push('...');
			for (let i = total - 4; i <= total; i++) pages.push(i);
		} else {
			// Middle
			pages.push(1);
			pages.push('...');
			for (let i = current - 1; i <= current + 1; i++) pages.push(i);
			pages.push('...');
			pages.push(total);
		}
		
		return pages;
	}
</script>

<div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
	<!-- Page Size Selector -->
	<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
		<span>แสดง</span>
		<select
			value={pageSize}
			on:change={handlePageSizeChange}
			class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none dark:bg-gray-700 dark:text-white"
		>
			{#each pageSizeOptions as opt}
				<option value={opt}>{opt}</option>
			{/each}
			<option value={-1}>กำหนดเอง...</option>
		</select>
		<span>รายการ</span>
	</div>

	<!-- Pagination Info -->
	<div class="text-sm text-gray-600 dark:text-gray-400 order-first sm:order-none">
		{#if totalItems > 0}
			<span>รายการ {startItem}-{endItem} จาก {totalItems}</span>
		{:else}
			<span>ไม่มีรายการ</span>
		{/if}
	</div>

	<!-- Page Navigation -->
	{#if totalPages > 1}
		<div class="flex items-center gap-1">
			<!-- First Page -->
			<button
				on:click={() => goToPage(1)}
				disabled={currentPage === 1}
				class="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				title="หน้าแรก"
			>
				<ChevronsLeft size={18} />
			</button>

			<!-- Previous Page -->
			<button
				on:click={() => goToPage(currentPage - 1)}
				disabled={currentPage === 1}
				class="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				title="หน้าก่อนหน้า"
			>
				<ChevronLeft size={18} />
			</button>

			<!-- Page Numbers -->
			<div class="flex items-center gap-1 mx-1">
				{#each pageNumbers as page}
					{#if page === '...'}
						<span class="px-2 text-gray-400 dark:text-gray-500">...</span>
					{:else}
						<button
							on:click={() => goToPage(page as number)}
							class="min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors {currentPage === page ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
						>
							{page}
						</button>
					{/if}
				{/each}
			</div>

			<!-- Next Page -->
			<button
				on:click={() => goToPage(currentPage + 1)}
				disabled={currentPage === totalPages}
				class="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				title="หน้าถัดไป"
			>
				<ChevronRight size={18} />
			</button>

			<!-- Last Page -->
			<button
				on:click={() => goToPage(totalPages)}
				disabled={currentPage === totalPages}
				class="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				title="หน้าสุดท้าย"
			>
				<ChevronsRight size={18} />
			</button>
		</div>
	{/if}
</div>
