/**
 * ブランドカラー履歴管理モジュールのテスト（TDD Red Phase）
 *
 * @module @/ui/demo/brand-color-history.test
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	addHistoryEntry,
	BRAND_COLOR_HISTORY_STORAGE_KEY,
	type BrandColorHistoryEntry,
	clearBrandColorHistory,
	createHistoryEntry,
	formatHistoryTimestamp,
	loadBrandColorHistory,
	MAX_HISTORY_ENTRIES,
	persistBrandColorHistory,
} from "./brand-color-history";

/**
 * localStorageのモック実装
 */
function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, value);
		},
		removeItem: (key: string): void => {
			store.delete(key);
		},
		clear: (): void => {
			store.clear();
		},
		get length(): number {
			return store.size;
		},
		key: (index: number): string | null => {
			const keys = Array.from(store.keys());
			return keys[index] ?? null;
		},
	};
}

// グローバルにlocalStorageモックを設定
const localStorageMock = createLocalStorageMock();
(globalThis as unknown as { localStorage: Storage }).localStorage =
	localStorageMock as Storage;

describe("brand-color-history module", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	describe("BRAND_COLOR_HISTORY_STORAGE_KEY", () => {
		it("should be leonardo-brandColorHistory", () => {
			expect(BRAND_COLOR_HISTORY_STORAGE_KEY).toBe(
				"leonardo-brandColorHistory",
			);
		});
	});

	describe("MAX_HISTORY_ENTRIES", () => {
		it("should be 10", () => {
			expect(MAX_HISTORY_ENTRIES).toBe(10);
		});
	});

	describe("createHistoryEntry", () => {
		it("should create an entry with valid UUID", () => {
			const entry = createHistoryEntry("#3366cc", 3);

			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			expect(entry.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it("should create an entry with correct brandColorHex", () => {
			const entry = createHistoryEntry("#3366cc", 3);

			expect(entry.brandColorHex).toBe("#3366cc");
		});

		it("should create an entry with correct accentCount", () => {
			const entry = createHistoryEntry("#3366cc", 4);

			expect(entry.accentCount).toBe(4);
		});

		it("should create an entry with ISO 8601 timestamp", () => {
			const before = new Date().toISOString();
			const entry = createHistoryEntry("#3366cc", 3);
			const after = new Date().toISOString();

			// Timestamp should be between before and after
			expect(entry.timestamp >= before).toBe(true);
			expect(entry.timestamp <= after).toBe(true);

			// Should be valid ISO 8601 format
			expect(() => new Date(entry.timestamp)).not.toThrow();
		});

		it("should handle all valid accentCount values (2-5)", () => {
			const entry2 = createHistoryEntry("#ff0000", 2);
			const entry3 = createHistoryEntry("#00ff00", 3);
			const entry4 = createHistoryEntry("#0000ff", 4);
			const entry5 = createHistoryEntry("#ffff00", 5);

			expect(entry2.accentCount).toBe(2);
			expect(entry3.accentCount).toBe(3);
			expect(entry4.accentCount).toBe(4);
			expect(entry5.accentCount).toBe(5);
		});

		it("should normalize hex to lowercase", () => {
			const entry = createHistoryEntry("#AABBCC", 3);

			expect(entry.brandColorHex).toBe("#aabbcc");
		});
	});

	describe("addHistoryEntry", () => {
		it("should add new entry to empty history", () => {
			const entry = createHistoryEntry("#3366cc", 3);
			const result = addHistoryEntry([], entry);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(entry);
		});

		it("should add new entry at the beginning (most recent first)", () => {
			const entry1 = createHistoryEntry("#ff0000", 2);
			const entry2 = createHistoryEntry("#00ff00", 3);

			const history1 = addHistoryEntry([], entry1);
			const history2 = addHistoryEntry(history1, entry2);

			expect(history2).toHaveLength(2);
			expect(history2[0]).toEqual(entry2); // Most recent first
			expect(history2[1]).toEqual(entry1);
		});

		it("should move existing entry to top when duplicate (same hex + accentCount)", () => {
			const entry1 = createHistoryEntry("#3366cc", 3);
			const entry2 = createHistoryEntry("#ff0000", 4);
			const entry3 = createHistoryEntry("#3366cc", 3); // Duplicate of entry1

			let history = addHistoryEntry([], entry1);
			history = addHistoryEntry(history, entry2);
			history = addHistoryEntry(history, entry3);

			expect(history).toHaveLength(2);
			expect(history[0]?.brandColorHex).toBe("#3366cc");
			expect(history[0]?.id).toBe(entry3.id); // Should be the new entry's ID
			expect(history[1]?.brandColorHex).toBe("#ff0000");
		});

		it("should update timestamp when duplicate entry is added", () => {
			const oldEntry = createHistoryEntry("#3366cc", 3);
			// Simulate older timestamp
			const oldEntryWithOldTimestamp: BrandColorHistoryEntry = {
				...oldEntry,
				timestamp: new Date("2020-01-01").toISOString(),
			};

			const history = addHistoryEntry([], oldEntryWithOldTimestamp);

			// Create new entry with same color combination
			const newEntry = createHistoryEntry("#3366cc", 3);
			const updatedHistory = addHistoryEntry(history, newEntry);

			expect(updatedHistory).toHaveLength(1);
			expect(updatedHistory[0]?.timestamp).toBe(newEntry.timestamp);
		});

		it("should NOT treat same hex with different accentCount as duplicate", () => {
			const entry1 = createHistoryEntry("#3366cc", 3);
			const entry2 = createHistoryEntry("#3366cc", 4); // Same hex, different accentCount

			let history = addHistoryEntry([], entry1);
			history = addHistoryEntry(history, entry2);

			expect(history).toHaveLength(2);
			expect(history[0]?.accentCount).toBe(4);
			expect(history[1]?.accentCount).toBe(3);
		});

		it("should limit history to MAX_HISTORY_ENTRIES (10)", () => {
			let history: BrandColorHistoryEntry[] = [];

			// Add 12 entries
			for (let i = 0; i < 12; i++) {
				const hex = `#${i.toString(16).padStart(6, "0")}`;
				const entry = createHistoryEntry(hex, ((i % 4) + 2) as 2 | 3 | 4 | 5);
				history = addHistoryEntry(history, entry);
			}

			expect(history).toHaveLength(MAX_HISTORY_ENTRIES);
		});

		it("should remove oldest entry when exceeding limit", () => {
			let history: BrandColorHistoryEntry[] = [];
			const entries: BrandColorHistoryEntry[] = [];

			// Add 10 entries
			for (let i = 0; i < 10; i++) {
				const hex = `#${i.toString(16).padStart(6, "0")}`;
				const entry = createHistoryEntry(hex, ((i % 4) + 2) as 2 | 3 | 4 | 5);
				entries.push(entry);
				history = addHistoryEntry(history, entry);
			}

			// Add 11th entry
			const newEntry = createHistoryEntry("#ffffff", 5);
			history = addHistoryEntry(history, newEntry);

			expect(history).toHaveLength(10);
			expect(history[0]).toEqual(newEntry); // Newest at top
			// Oldest entry (first one added) should be removed
			expect(history.some((e) => e.id === entries[0]?.id)).toBe(false);
		});

		it("should handle case-insensitive hex comparison", () => {
			const entry1 = createHistoryEntry("#AABBCC", 3);
			const entry2 = createHistoryEntry("#aabbcc", 3); // Same color, different case

			let history = addHistoryEntry([], entry1);
			history = addHistoryEntry(history, entry2);

			// Should be treated as duplicate
			expect(history).toHaveLength(1);
		});
	});

	describe("persistBrandColorHistory", () => {
		it("should save entries to localStorage as JSON", () => {
			const entry = createHistoryEntry("#3366cc", 3);
			persistBrandColorHistory([entry]);

			const stored = localStorage.getItem(BRAND_COLOR_HISTORY_STORAGE_KEY);
			expect(stored).not.toBeNull();
			if (!stored) {
				throw new Error(
					`Expected localStorage item: ${BRAND_COLOR_HISTORY_STORAGE_KEY}`,
				);
			}

			const parsed = JSON.parse(stored) as unknown[];
			expect(parsed).toHaveLength(1);
			expect((parsed[0] as { brandColorHex: string }).brandColorHex).toBe(
				"#3366cc",
			);
		});

		it("should save empty array", () => {
			persistBrandColorHistory([]);

			const stored = localStorage.getItem(BRAND_COLOR_HISTORY_STORAGE_KEY);
			expect(stored).toBe("[]");
		});

		it("should overwrite previous value", () => {
			const entry1 = createHistoryEntry("#ff0000", 2);
			const entry2 = createHistoryEntry("#00ff00", 3);

			persistBrandColorHistory([entry1]);
			persistBrandColorHistory([entry2]);

			const stored = localStorage.getItem(BRAND_COLOR_HISTORY_STORAGE_KEY);
			expect(stored).not.toBeNull();
			if (!stored) {
				throw new Error(
					`Expected localStorage item: ${BRAND_COLOR_HISTORY_STORAGE_KEY}`,
				);
			}
			const parsed = JSON.parse(stored) as unknown[];

			expect(parsed).toHaveLength(1);
			expect((parsed[0] as { brandColorHex: string }).brandColorHex).toBe(
				"#00ff00",
			);
		});
	});

	describe("loadBrandColorHistory", () => {
		it("should return empty array when localStorage is empty", () => {
			const result = loadBrandColorHistory();

			expect(result).toEqual([]);
		});

		it("should restore valid entries from localStorage", () => {
			const entry = createHistoryEntry("#3366cc", 3);
			localStorage.setItem(
				BRAND_COLOR_HISTORY_STORAGE_KEY,
				JSON.stringify([entry]),
			);

			const result = loadBrandColorHistory();

			expect(result).toHaveLength(1);
			expect(result[0]?.brandColorHex).toBe("#3366cc");
			expect(result[0]?.accentCount).toBe(3);
		});

		it("should return empty array for invalid JSON", () => {
			localStorage.setItem(BRAND_COLOR_HISTORY_STORAGE_KEY, "invalid-json");

			const result = loadBrandColorHistory();

			expect(result).toEqual([]);
		});

		it("should return empty array for non-array JSON", () => {
			localStorage.setItem(
				BRAND_COLOR_HISTORY_STORAGE_KEY,
				JSON.stringify({ not: "an array" }),
			);

			const result = loadBrandColorHistory();

			expect(result).toEqual([]);
		});

		it("should filter out entries with invalid hex format", () => {
			const validEntry = createHistoryEntry("#3366cc", 3);
			const invalidEntry = {
				id: crypto.randomUUID(),
				brandColorHex: "not-a-hex",
				accentCount: 3,
				timestamp: new Date().toISOString(),
			};

			localStorage.setItem(
				BRAND_COLOR_HISTORY_STORAGE_KEY,
				JSON.stringify([validEntry, invalidEntry]),
			);

			const result = loadBrandColorHistory();

			expect(result).toHaveLength(1);
			expect(result[0]?.brandColorHex).toBe("#3366cc");
		});

		it("should filter out entries with invalid accentCount", () => {
			const validEntry = createHistoryEntry("#3366cc", 3);
			const invalidEntry = {
				id: crypto.randomUUID(),
				brandColorHex: "#ff0000",
				accentCount: 10, // Invalid
				timestamp: new Date().toISOString(),
			};

			localStorage.setItem(
				BRAND_COLOR_HISTORY_STORAGE_KEY,
				JSON.stringify([validEntry, invalidEntry]),
			);

			const result = loadBrandColorHistory();

			expect(result).toHaveLength(1);
		});

		it("should filter out entries with missing required fields", () => {
			const validEntry = createHistoryEntry("#3366cc", 3);
			const incompleteEntry = {
				id: crypto.randomUUID(),
				// Missing brandColorHex, accentCount, timestamp
			};

			localStorage.setItem(
				BRAND_COLOR_HISTORY_STORAGE_KEY,
				JSON.stringify([validEntry, incompleteEntry]),
			);

			const result = loadBrandColorHistory();

			expect(result).toHaveLength(1);
		});
	});

	describe("clearBrandColorHistory", () => {
		it("should remove history from localStorage", () => {
			const entry = createHistoryEntry("#3366cc", 3);
			persistBrandColorHistory([entry]);

			expect(
				localStorage.getItem(BRAND_COLOR_HISTORY_STORAGE_KEY),
			).not.toBeNull();

			clearBrandColorHistory();

			expect(localStorage.getItem(BRAND_COLOR_HISTORY_STORAGE_KEY)).toBeNull();
		});

		it("should not throw when localStorage is already empty", () => {
			expect(() => clearBrandColorHistory()).not.toThrow();
		});
	});

	describe("formatHistoryTimestamp", () => {
		it("should format today's timestamp as time only (HH:MM)", () => {
			const now = new Date();
			const isoString = now.toISOString();

			const result = formatHistoryTimestamp(isoString);

			// Should be in format "HH:MM"
			expect(result).toMatch(/^\d{1,2}:\d{2}$/);
		});

		it("should format yesterday's timestamp with date", () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const isoString = yesterday.toISOString();

			const result = formatHistoryTimestamp(isoString);

			// Should include date part (e.g., "1/7 18:00" or "M/D H:MM")
			expect(result).toMatch(/\d+\/\d+\s+\d+:\d{2}/);
		});

		it("should format old date with month/day and time", () => {
			const oldDate = new Date("2024-06-15T14:30:00Z");
			const isoString = oldDate.toISOString();

			const result = formatHistoryTimestamp(isoString);

			// Should include month and day
			expect(result).toMatch(/\d+\/\d+/);
		});

		it("should handle invalid date gracefully", () => {
			const result = formatHistoryTimestamp("invalid-date");

			// Should return some fallback string
			expect(typeof result).toBe("string");
		});

		it("should handle empty string gracefully", () => {
			const result = formatHistoryTimestamp("");

			expect(typeof result).toBe("string");
		});
	});
});
