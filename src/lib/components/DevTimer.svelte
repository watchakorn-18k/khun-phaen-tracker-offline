<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Play, Pause, RotateCcw, Timer, HelpCircle } from 'lucide-svelte';
	import { showKeyboardShortcuts } from '$lib/stores/keyboardShortcuts';

	let elapsed = 0;
	let isRunning = false;
	let interval: ReturnType<typeof setInterval> | null = null;
	let isExpanded = false;
	let expandTimeout: ReturnType<typeof setTimeout> | null = null;

	function formatTime(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	function start() {
		if (isRunning) return;
		isRunning = true;
		interval = setInterval(() => {
			elapsed++;
		}, 1000);
	}

	function pause() {
		isRunning = false;
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function stop() {
		pause();
		elapsed = 0;
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (elapsed > 0) {
			event.preventDefault();
			event.returnValue = 'มีการจับเวลาอยู่ คุณต้องการออกจากหน้านี้จริงหรือไม่?';
			return event.returnValue;
		}
	}

	function handleMouseEnter() {
		if (expandTimeout) {
			clearTimeout(expandTimeout);
			expandTimeout = null;
		}
		isExpanded = true;
	}

	function handleMouseLeave() {
		expandTimeout = setTimeout(() => {
			isExpanded = false;
		}, 200);
	}

	function openHelp() {
		showKeyboardShortcuts.set(true);
	}

	onMount(() => {
		window.addEventListener('beforeunload', handleBeforeUnload);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (expandTimeout) clearTimeout(expandTimeout);
		window.removeEventListener('beforeunload', handleBeforeUnload);
	});
</script>

<!-- Dev Timer & Help Button Container -->
<div class="fixed bottom-4 right-4 z-50 flex items-center gap-2">
	<!-- Help Button -->
	<button
		on:click={openHelp}
		class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-white/70 hover:text-white hover:bg-slate-700 shadow-lg transition-colors"
		title="คีย์ลัด (?)"
	>
		<HelpCircle size={18} />
	</button>

	<!-- Timer Container -->
	<div
		class="flex items-center"
		on:mouseenter={handleMouseEnter}
		on:mouseleave={handleMouseLeave}
	>
		<!-- Expanded Controls -->
		{#if isExpanded}
			<div class="flex items-center gap-1 mr-2 animate-slide-in">
				<!-- Reset Button -->
				{#if elapsed > 0}
					<button
						on:click={stop}
						class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white/70 hover:text-white hover:bg-slate-700 transition-colors"
						title="รีเซ็ต"
					>
						<RotateCcw size={14} />
					</button>
				{/if}

				<!-- Play/Pause Button (Red) -->
				{#if isRunning}
					<button
						on:click={pause}
						class="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors"
						title="หยุด"
					>
						<Pause size={18} fill="currentColor" />
					</button>
				{:else}
					<button
						on:click={start}
						class="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors"
						title={elapsed > 0 ? 'ต่อ' : 'เริ่ม'}
					>
						<Play size={18} fill="currentColor" />
					</button>
				{/if}
			</div>
		{/if}

		<!-- Main Timer Button -->
		<button
			class="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300 {isRunning ? 'bg-red-600' : 'bg-slate-800'}"
		>
			{#if isRunning}
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
				</span>
			{:else}
				<Timer size={16} class="text-white" />
			{/if}
			
			<span class="font-mono text-sm font-semibold text-white tabular-nums tracking-wide">
				{formatTime(elapsed)}
			</span>
		</button>
	</div>
</div>

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-slide-in {
		animation: slide-in 0.2s ease-out;
	}
</style>
