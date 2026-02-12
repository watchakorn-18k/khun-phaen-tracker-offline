<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SearchableSprintSelect from './SearchableSprintSelect.svelte';
	import type { Sprint } from '$lib/stores/sprintStore';

	const sampleSprints: Sprint[] = [
		{ id: 101, name: 'Sprint 24', start_date: '2026-01-20', end_date: '2026-02-02', status: 'active' },
		{ id: 100, name: 'Sprint 23', start_date: '2026-01-06', end_date: '2026-01-19', status: 'completed' },
		{ id: 99, name: 'Sprint 22', start_date: '2025-12-23', end_date: '2026-01-05', status: 'completed' },
		{ id: 102, name: 'Sprint 25', start_date: '2026-02-03', end_date: '2026-02-16', status: 'planned' },
		{ id: 103, name: 'Sprint 26', start_date: '2026-02-17', end_date: '2026-03-01', status: 'planned' }
	];

	const { Story } = defineMeta({
		title: 'Components/Filters/SearchableSprintSelect',
		component: SearchableSprintSelect,
		tags: ['autodocs'],
		args: {
			sprints: sampleSprints,
			value: 'all',
			id: 'sprint-select',
			formMode: false
		},
		argTypes: {
			sprints: { control: 'object' },
			formMode: { control: 'boolean' }
		},
		parameters: {
			docs: {
				description: {
					component: 'Dropdown เลือก Sprint โดยเรียง active ก่อน และรองรับโหมดฟอร์ม (`formMode`)'
				}
			}
		}
	});
</script>

<Story name="FilterMode" />

<Story
	name="FormMode"
	args={{
		formMode: true,
		value: null
	}}
/>
