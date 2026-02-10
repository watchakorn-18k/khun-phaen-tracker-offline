<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Download, Upload, FileSpreadsheet, FileText, ChevronDown } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	
	const dispatch = createEventDispatcher<{
		exportCSV: void;
		exportPDF: void;
		importCSV: string;
	}>();
	
	let fileInput: HTMLInputElement;
	let showImportConfirm = false;
	let importContent = '';
	let importError = '';
	let showExportDropdown = false;
	let dropdownRef: HTMLDivElement;
	
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			if (content) {
				importContent = content;
				showImportConfirm = true;
				importError = '';
			}
		};
		reader.readAsText(file);
	}
	
	function confirmImport() {
		if (importContent) {
			dispatch('importCSV', importContent);
			showImportConfirm = false;
			importContent = '';
			if (fileInput) fileInput.value = '';
		}
	}
	
	function cancelImport() {
		showImportConfirm = false;
		importContent = '';
		if (fileInput) fileInput.value = '';
	}

	function handleExportCSV() {
		dispatch('exportCSV');
		showExportDropdown = false;
	}

	function handleExportPDF() {
		dispatch('exportPDF');
		showExportDropdown = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			showExportDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="flex flex-wrap gap-2">
	<!-- Export Dropdown -->
	<div class="relative" bind:this={dropdownRef}>
		<button
			on:click|stopPropagation={() => showExportDropdown = !showExportDropdown}
			class="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-success/10 hover:bg-success/20 text-success rounded-lg font-medium transition-colors"
		>
			<Download size={16} />
			<span class="hidden sm:inline">ส่งออก</span>
			<ChevronDown size={16} class="transition-transform {showExportDropdown ? 'rotate-180' : ''}" />
		</button>

		{#if showExportDropdown}
			<div class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px] z-20 animate-fade-in">
				<button
					on:click={handleExportCSV}
					class="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					<FileSpreadsheet size={16} class="text-green-600" />
					ส่งออก CSV
				</button>
				<button
					on:click={handleExportPDF}
					class="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					<FileText size={16} class="text-red-600" />
					ส่งออก PDF
				</button>
			</div>
		{/if}
	</div>

	<input
		type="file"
		accept=".csv"
		bind:this={fileInput}
		on:change={handleFileSelect}
		class="hidden"
	/>

	<button
		on:click={() => fileInput?.click()}
		class="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition-colors"
	>
		<Upload size={16} />
		<span class="hidden sm:inline">นำเข้า CSV</span>
		<span class="sm:hidden">นำเข้า</span>
	</button>
</div>

{#if showImportConfirm}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transition-colors">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">ยืนยันการนำเข้าข้อมูล</h3>
			<p class="text-gray-600 dark:text-gray-400 mb-4">
				คุณต้องการนำเข้าข้อมูลจากไฟล์ CSV หรือไม่? ข้อมูลที่มีอยู่จะไม่ถูกแทนที่
			</p>

			{#if importError}
				<div class="bg-danger/10 text-danger p-3 rounded-lg mb-4 text-sm">
					{importError}
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					on:click={confirmImport}
					class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-lg font-medium transition-colors"
				>
					นำเข้า
				</button>
				<button
					on:click={cancelImport}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					ยกเลิก
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.15s ease-out;
	}
</style>
