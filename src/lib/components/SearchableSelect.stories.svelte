<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SearchableSelect from './SearchableSelect.svelte';

	const { Story } = defineMeta({
		title: 'Components/Filters/SearchableSelect',
		component: SearchableSelect,
		tags: ['autodocs'],
		args: {
			id: 'project-filter',
			value: 'all',
			placeholder: 'ค้นหาโปรเจกต์...',
			emptyText: 'ไม่พบโปรเจกต์',
			showSearch: true,
			maxDisplay: 8,
			options: [
				{ value: 'all', label: 'ทั้งหมด' },
				{ value: 'web', label: 'Web App', badge: true, badgeColor: 'bg-blue-500' },
				{ value: 'mobile', label: 'Mobile App', badge: true, badgeColor: 'bg-green-500' },
				{ value: 'infra', label: 'Infrastructure', badge: true, badgeColor: 'bg-amber-500' },
				{ value: 'design', label: 'Design System' },
				{ value: 'api', label: 'API Gateway' },
				{ value: 'billing', label: 'Billing Service' },
				{ value: 'analytics', label: 'Analytics' },
				{ value: 'ops', label: 'DevOps' },
				{ value: 'docs', label: 'Documentation' }
			]
		},
		argTypes: {
			options: { control: 'object' },
			value: { control: 'text' },
			maxDisplay: { control: { type: 'number', min: 1, step: 1 } }
		},
		parameters: {
			docs: {
				description: {
					component: 'Dropdown สำหรับเลือกค่าแบบค้นหาได้ เหมาะกับ filter ที่มีรายการจำนวนมาก'
				}
			}
		}
	});
</script>

<Story name="Default" />

<Story
	name="WithoutSearch"
	args={{
		showSearch: false,
		options: [
			{ value: 'all', label: 'ทั้งหมด' },
			{ value: 'todo', label: 'Todo' },
			{ value: 'in_progress', label: 'In Progress' },
			{ value: 'done', label: 'Done' }
		]
	}}
/>
