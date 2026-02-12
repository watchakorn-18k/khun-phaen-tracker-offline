<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Pagination from './Pagination.svelte';

	const { Story } = defineMeta({
		title: 'Components/Pagination',
		component: Pagination,
		tags: ['autodocs'],
		argTypes: {
			totalItems: { control: { type: 'number', min: 0, step: 1 } },
			pageSize: { control: { type: 'number', min: 1, step: 1 } },
			currentPage: { control: { type: 'number', min: 1, step: 1 } },
			pageSizeOptions: { control: 'object' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		totalItems: 245,
		pageSize: 50,
		currentPage: 1,
		pageSizeOptions: [20, 50, 100]
	}}
/>

<Story
	name="MiddlePage"
	args={{
		totalItems: 245,
		pageSize: 20,
		currentPage: 6,
		pageSizeOptions: [10, 20, 50, 100]
	}}
/>

<Story
	name="NoItems"
	args={{
		totalItems: 0,
		pageSize: 50,
		currentPage: 1,
		pageSizeOptions: [20, 50, 100]
	}}
/>
