<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CustomDatePicker from './CustomDatePicker.svelte';

	const { Story } = defineMeta({
		title: 'Components/Inputs/CustomDatePicker',
		component: CustomDatePicker,
		tags: ['autodocs'],
		args: {
			id: 'due-date',
			value: '',
			placeholder: 'เลือกกำหนดเสร็จ'
		},
		argTypes: {
			value: { control: 'text' },
			placeholder: { control: 'text' }
		},
		parameters: {
			docs: {
				description: {
					component: 'Date picker รูปแบบไทย (พ.ศ.) สำหรับฟอร์มงานและตัวกรองช่วงเวลา'
				}
			}
		}
	});
</script>

<Story name="EmptyState" />

<Story
	name="SelectedDate"
	args={{
		value: '2026-02-12'
	}}
/>
