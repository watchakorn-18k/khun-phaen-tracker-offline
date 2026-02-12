// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import TaskForm from './TaskForm.svelte';
import type { Task } from '$lib/types';
import { cleanup } from '@testing-library/svelte';

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: 1,
		title: 'Original task',
		project: 'Alpha',
		duration_minutes: 0,
		date: '2026-02-10',
		status: 'in-progress',
		category: 'งานหลัก',
		notes: 'Initial notes',
		assignee_id: null,
		sprint_id: null,
		...overrides
	};
}

describe('TaskForm', () => {
	afterEach(() => cleanup());

	it('renders create mode defaults and allows typing', async () => {
		const { getByLabelText, getByRole } = render(TaskForm, {
			show: true,
			editingTask: null,
			assignees: [],
			projects: [],
			sprints: []
		});

		const titleInput = getByLabelText('ชื่องาน *') as HTMLInputElement;
		expect(titleInput.value).toBe('');
		expect(getByRole('button', { name: 'เพิ่มงาน' })).toBeTruthy();

		await fireEvent.input(titleInput, { target: { value: 'New task' } });
		expect(titleInput.value).toBe('New task');
	});

	it('prefills edit mode values and shows edit action text', async () => {
		const editingTask = createTask();
		const { getByLabelText, getByRole } = render(TaskForm, {
			show: true,
			editingTask,
			assignees: [],
			projects: [],
			sprints: []
		});

		const titleInput = getByLabelText('ชื่องาน *') as HTMLInputElement;
		expect(titleInput.value).toBe('Original task');
		expect((getByLabelText('หมายเหตุ') as HTMLTextAreaElement).value).toBe('Initial notes');
		expect(getByRole('button', { name: 'บันทึกการแก้ไข' })).toBeTruthy();
	});
});
