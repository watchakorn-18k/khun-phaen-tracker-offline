// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import TableView from './TableView.svelte';
import type { Task } from '$lib/types';
import { cleanup } from '@testing-library/svelte';

function makeTask(id: number): Task {
	return {
		id,
		title: `Task ${id}`,
		project: id % 2 === 0 ? 'Beta' : 'Alpha',
		duration_minutes: 0,
		date: '2026-02-10',
		status: 'todo',
		category: 'งานหลัก',
		notes: '',
		assignee_id: null,
		sprint_id: null
	};
}

describe('TableView', () => {
	afterEach(() => cleanup());

	it('sorts rows by title when title header is clicked', async () => {
		const tasks = [makeTask(1), makeTask(2)];
		const { container } = render(TableView, {
			tasks,
			sprints: []
		});

		const titleSortBtn = Array.from(container.querySelectorAll('th button')).find((btn) =>
			btn.textContent?.includes('ชื่องาน')
		) as HTMLButtonElement;
		expect(titleSortBtn).toBeTruthy();
		await fireEvent.click(titleSortBtn);

		const firstRowTitle = container.querySelector('tbody tr td:nth-child(2) span')?.textContent?.trim();
		expect(firstRowTitle).toBe('Task 1');
	});

	it('bulk select-all affects current page and shows selection count', async () => {
		const tasks = Array.from({ length: 55 }, (_, i) => makeTask(i + 1));
		const { container, getByRole, queryByText } = render(TableView, {
			tasks,
			sprints: []
		});

		const headerCheckbox = container.querySelector('table thead input[type="checkbox"]') as HTMLInputElement;
		expect(headerCheckbox).toBeTruthy();
		await fireEvent.click(headerCheckbox);
		expect(queryByText('เลือก 50 รายการ')).toBeTruthy();

		await fireEvent.click(getByRole('button', { name: 'ยกเลิกเลือก' }));
		expect(queryByText('เลือก 50 รายการ')).toBeNull();
	});
});
