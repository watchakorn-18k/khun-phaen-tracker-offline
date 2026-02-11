import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SQLITE_HEADER = new TextEncoder().encode('SQLite format 3\u0000');

type TaskRow = Record<string, any>;

const state = {
	tasks: [] as TaskRow[],
	assignees: [] as Record<string, any>[],
	projects: [] as Record<string, any>[],
	lastInsertId: 0
};

function resetState() {
	state.tasks = [];
	state.assignees = [];
	state.projects = [];
	state.lastInsertId = 0;
}

function normalize(sql: string): string {
	return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function splitCsvColumns(raw: string): string[] {
	return raw.split(',').map((x) => x.trim());
}

function evaluateSelect(sql: string, bind: any[]): Record<string, any>[] {
	const n = normalize(sql);
	if (n.startsWith('select * from tasks order by date desc')) {
		return [...state.tasks].sort((a, b) => String(b.date).localeCompare(String(a.date)));
	}
	if (n === 'select * from tasks') {
		return [...state.tasks];
	}
	if (n.startsWith('select count(*) as count from tasks')) {
		return [{ count: state.tasks.length }];
	}
	if (n.startsWith('select status, count(*) as count from tasks group by status')) {
		const by = new Map<string, number>();
		for (const t of state.tasks) by.set(t.status, (by.get(t.status) || 0) + 1);
		return Array.from(by.entries()).map(([status, count]) => ({ status, count }));
	}
	if (n.startsWith('select max(created_at) as last from tasks')) {
		const last = state.tasks.reduce<string | null>((acc, cur) => {
			if (!cur.created_at) return acc;
			if (!acc || String(cur.created_at) > acc) return String(cur.created_at);
			return acc;
		}, null);
		return [{ last }];
	}
	if (n.includes('from tasks t') && n.includes('where t.id = ?')) {
		const id = Number(bind[0]);
		const row = state.tasks.find((t) => Number(t.id) === id);
		if (!row) return [];
		return [
			{
				...row,
				a_id: null,
				a_name: null,
				a_color: null,
				a_created_at: null
			}
		];
	}
	return [];
}

class FakeStmt {
	private bindValues: any[] = [];
	private rows: Record<string, any>[] = [];
	private idx = -1;
	private current: Record<string, any> | null = null;

	constructor(private readonly sql: string) {}

	bind(values: any[]) {
		this.bindValues = values;
		this.rows = evaluateSelect(this.sql, this.bindValues);
		this.idx = -1;
	}

	step(): boolean {
		if (this.rows.length === 0) this.rows = evaluateSelect(this.sql, this.bindValues);
		this.idx += 1;
		this.current = this.rows[this.idx] || null;
		return this.current !== null;
	}

	get(): Record<string, any> {
		return this.current || {};
	}

	finalize() {}
}

class FakeDB {
	pointer = 1;

	constructor(_name: string, _mode: string) {}

	checkRc(rc: number) {
		if (rc !== 0) throw new Error(`SQLite error: ${rc}`);
	}

	exec(input: string | { sql: string; bind?: any[] }) {
		const sql = typeof input === 'string' ? input : input.sql;
		const bind = (typeof input === 'string' ? [] : input.bind) || [];
		const n = normalize(sql);

		if (
			n.startsWith('create table') ||
			n.startsWith('alter table') ||
			n === 'begin transaction' ||
			n === 'commit' ||
			n === 'rollback'
		) {
			return;
		}

		if (n === 'delete from tasks') {
			state.tasks = [];
			return;
		}

		if (n.startsWith('delete from tasks where id = ?')) {
			const id = Number(bind[0]);
			state.tasks = state.tasks.filter((t) => Number(t.id) !== id);
			return;
		}

		const insertTaskMatch = sql.match(/(insert|replace)\s+into\s+tasks\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
		if (insertTaskMatch) {
			const isReplace = insertTaskMatch[1].toLowerCase() === 'replace';
			const cols = splitCsvColumns(insertTaskMatch[2]);
			const row: TaskRow = {};
			cols.forEach((c, i) => (row[c] = bind[i]));

			if (!row.id) row.id = ++state.lastInsertId;
			else state.lastInsertId = Math.max(state.lastInsertId, Number(row.id));
			if (!row.created_at) row.created_at = new Date().toISOString();
			if (!row.updated_at) row.updated_at = row.created_at;

			if (isReplace) state.tasks = state.tasks.filter((t) => Number(t.id) !== Number(row.id));
			state.tasks.push(row);
			return;
		}

		const updateTaskMatch = sql.match(/update\s+tasks\s+set\s+([\s\S]+?)\s+where\s+id\s*=\s*\?/i);
		if (updateTaskMatch) {
			const setPart = updateTaskMatch[1];
			const id = Number(bind[bind.length - 1]);
			const target = state.tasks.find((t) => Number(t.id) === id);
			if (!target) return;

			const assignments = setPart.split(',').map((x) => x.trim());
			let i = 0;
			for (const assignment of assignments) {
				if (/updated_at\s*=\s*current_timestamp/i.test(assignment)) {
					target.updated_at = new Date().toISOString();
					continue;
				}
				const m = assignment.match(/^([a-z_]+)\s*=\s*\?$/i);
				if (m) {
					target[m[1]] = bind[i];
					i += 1;
				}
			}
			return;
		}
	}

	selectValue(sql: string): number {
		const n = normalize(sql);
		if (n.startsWith('select last_insert_rowid()')) return state.lastInsertId;
		if (n.startsWith('select count(*) from tasks')) return state.tasks.length;
		return 0;
	}

	selectObjects(sql: string): Record<string, any>[] {
		const n = normalize(sql);
		if (n.startsWith('pragma table_info(tasks)')) {
			return [{ name: 'updated_at' }];
		}
		return [];
	}

	prepare(sql: string) {
		return new FakeStmt(sql);
	}

	close() {}
}

const fakeSqlite = {
	oo1: { DB: FakeDB },
	wasm: { allocFromTypedArray: () => 1 },
	capi: {
		SQLITE_DESERIALIZE_FREEONCLOSE: 1,
		sqlite3_deserialize: () => 0,
		sqlite3_js_db_export: () => SQLITE_HEADER
	}
};

vi.mock('@sqlite.org/sqlite-wasm', () => ({
	default: vi.fn(async () => fakeSqlite)
}));

vi.mock('./stores/storage', () => {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value),
		initCompression: vi.fn(),
		compressionReady: { subscribe: () => () => {} }
	};
});

vi.mock('./stores/crdt-sync', () => ({
	syncTaskToCRDT: vi.fn(),
	deleteTaskFromCRDT: vi.fn(),
	initCRDT: vi.fn()
}));

vi.mock('svelte/store', () => ({
	get: () => false
}));

import {
	addTask,
	closeDB,
	exportToCSV,
	getTaskStats,
	importFromCSV,
	initDB,
	mergeTasksFromCSV,
	updateTask
} from './db';

class LocalStorageMock {
	private store = new Map<string, string>();
	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.store.set(key, value);
	}
	removeItem(key: string) {
		this.store.delete(key);
	}
	clear() {
		this.store.clear();
	}
	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}
	get length(): number {
		return this.store.size;
	}
}

beforeEach(async () => {
	resetState();
	(globalThis as any).window = { addEventListener: vi.fn() };
	(globalThis as any).localStorage = new LocalStorageMock();
	(globalThis as any).atob = (s: string) => Buffer.from(s, 'base64').toString('binary');
	(globalThis as any).btoa = (s: string) => Buffer.from(s, 'binary').toString('base64');
	await initDB();
});

afterEach(async () => {
	await closeDB();
	vi.restoreAllMocks();
});

describe('db logic', () => {
	it('imports CSV with quoted fields and computes stats from imported rows', async () => {
		const csv = [
			'id,title,project,duration_minutes,date,status,category,notes,assignee_id,sprint_id,is_archived,created_at',
			'1,Task A,Alpha,30,2026-02-10,todo,งานหลัก,"note, with comma",,,0,2026-02-10T00:00:00.000Z',
			'2,Task B,Beta,45,2026-02-11,done,อื่นๆ,"quoted ""value""",,,1,2026-02-11T00:00:00.000Z'
		].join('\n');

		const imported = await importFromCSV(csv);
		const stats = getTaskStats();
		const exported = await exportToCSV();

		expect(imported).toBe(2);
		expect(stats.total).toBe(2);
		expect(stats.byStatus.todo).toBe(1);
		expect(stats.byStatus.done).toBe(1);
		expect(exported).toContain('"note, with comma"');
		expect(exported).toContain('Task B');
	});

	it('updates only provided task fields and persists boolean archive mapping', async () => {
		const id = await addTask({
			title: 'Initial',
			project: 'P',
			duration_minutes: 10,
			date: '2026-02-11',
			status: 'todo',
			category: 'อื่นๆ',
			notes: '',
			assignee_id: null,
			sprint_id: null,
			is_archived: false,
			updated_at: '2026-02-11T00:00:00.000Z'
		});

		await updateTask(id, { status: 'done', notes: 'updated', is_archived: true });
		const exported = await exportToCSV();

		expect(exported).toContain('done');
		expect(exported).toContain('updated');
		expect(exported).toContain(',1,');
	});

	it('merges server CSV by comparing timestamps and returns accurate counters', async () => {
		await importFromCSV(
			[
				'id,title,project,duration_minutes,date,status,category,notes,assignee_id,sprint_id,is_archived,created_at',
				'1,Local Older,P,10,2026-02-10,todo,อื่นๆ,,,,0,2026-02-10T00:00:00.000Z',
				'2,Local Keep,P,20,2026-02-11,todo,อื่นๆ,,,,0,2026-02-11T00:00:00.000Z'
			].join('\n')
		);

		const result = await mergeTasksFromCSV(
			[
				'id,title,project,duration_minutes,date,status,category,notes,assignee_id,sprint_id,is_archived,created_at',
				'1,Server Newer,P,10,2026-02-10,done,อื่นๆ,,,,0,2026-02-12T00:00:00.000Z',
				'2,Server Older Diff,P,20,2026-02-11,done,อื่นๆ,,,,0,2026-02-09T00:00:00.000Z',
				'3,Server Added,P,15,2026-02-12,todo,อื่นๆ,,,,0,2026-02-12T00:00:00.000Z'
			].join('\n')
		);

		const stats = getTaskStats();
		const exported = await exportToCSV();

		expect(result).toEqual({ added: 1, updated: 1, unchanged: 1 });
		expect(stats.total).toBe(3);
		expect(exported).toContain('Server Newer');
		expect(exported).toContain('Server Added');
		expect(exported).toContain('Local Keep');
	});
});
