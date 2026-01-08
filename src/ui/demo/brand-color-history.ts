/**
 * ブランドカラー履歴管理モジュール
 *
 * ランダムボタンや手動入力で選択したブランドカラーを履歴として保存し、
 * 後から復元できる機能を提供する。
 *
 * @module @/ui/demo/brand-color-history
 */

/**
 * ブランドカラー履歴エントリの型定義
 */
export interface BrandColorHistoryEntry {
	/** 一意識別子（UUID v4） */
	id: string;
	/** ブランドカラー（HEX形式 #RRGGBB） */
	brandColorHex: string;
	/** アクセント色数（2-5） */
	accentCount: 2 | 3 | 4 | 5;
	/** タイムスタンプ（ISO 8601形式） */
	timestamp: string;
}

/**
 * localStorageのキー
 */
export const BRAND_COLOR_HISTORY_STORAGE_KEY = "leonardo-brandColorHistory";

/**
 * 履歴の最大件数
 */
export const MAX_HISTORY_ENTRIES = 10;

/**
 * HEX形式のバリデーション
 * @param hex 検証する文字列
 * @returns 有効な6文字HEX形式の場合true
 */
function isValidHex(hex: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * 有効なアクセント数かどうかを検証
 * @param count 検証する数値
 * @returns 2-5の範囲内の場合true
 */
function isValidAccentCount(count: unknown): count is 2 | 3 | 4 | 5 {
	return (
		typeof count === "number" &&
		Number.isInteger(count) &&
		count >= 2 &&
		count <= 5
	);
}

/**
 * 履歴エントリを生成する
 *
 * @param hex ブランドカラー（HEX形式）
 * @param accentCount アクセント色数（2-5）
 * @returns 新しい履歴エントリ
 */
export function createHistoryEntry(
	hex: string,
	accentCount: 2 | 3 | 4 | 5,
): BrandColorHistoryEntry {
	return {
		id: crypto.randomUUID(),
		brandColorHex: hex.toLowerCase(),
		accentCount,
		timestamp: new Date().toISOString(),
	};
}

/**
 * 履歴にエントリを追加する
 *
 * 重複検知（同じhex + accentCount）: 既存エントリを削除し、新エントリを先頭に追加
 * 最大件数制限: 10件を超えた場合、古いエントリを削除
 *
 * @param history 現在の履歴
 * @param entry 追加するエントリ
 * @returns 更新された履歴
 */
export function addHistoryEntry(
	history: BrandColorHistoryEntry[],
	entry: BrandColorHistoryEntry,
): BrandColorHistoryEntry[] {
	// 重複エントリを除外（hex + accentCountが同じもの）
	const filteredHistory = history.filter(
		(h) =>
			!(
				h.brandColorHex.toLowerCase() === entry.brandColorHex.toLowerCase() &&
				h.accentCount === entry.accentCount
			),
	);

	// 新エントリを先頭に追加
	const newHistory = [entry, ...filteredHistory];

	// 最大件数を超えた場合、古いエントリを削除
	if (newHistory.length > MAX_HISTORY_ENTRIES) {
		return newHistory.slice(0, MAX_HISTORY_ENTRIES);
	}

	return newHistory;
}

/**
 * 履歴をlocalStorageに永続化する
 *
 * @param entries 保存する履歴エントリ
 */
export function persistBrandColorHistory(
	entries: BrandColorHistoryEntry[],
): void {
	try {
		localStorage.setItem(
			BRAND_COLOR_HISTORY_STORAGE_KEY,
			JSON.stringify(entries),
		);
	} catch {
		// localStorageが利用できない場合は無視
	}
}

/**
 * localStorageから履歴を読み込む
 *
 * 保存されたデータを検証し、無効なエントリは除外する。
 *
 * @returns 履歴エントリの配列
 */
export function loadBrandColorHistory(): BrandColorHistoryEntry[] {
	try {
		const stored = localStorage.getItem(BRAND_COLOR_HISTORY_STORAGE_KEY);
		if (stored === null) {
			return [];
		}

		const parsed = JSON.parse(stored);

		// 配列でない場合は空配列を返す
		if (!Array.isArray(parsed)) {
			return [];
		}

		// 各エントリを検証し、有効なもののみを返す
		return parsed.filter(
			(entry: unknown): entry is BrandColorHistoryEntry =>
				typeof entry === "object" &&
				entry !== null &&
				"id" in entry &&
				"brandColorHex" in entry &&
				"accentCount" in entry &&
				"timestamp" in entry &&
				typeof (entry as BrandColorHistoryEntry).id === "string" &&
				typeof (entry as BrandColorHistoryEntry).brandColorHex === "string" &&
				isValidHex((entry as BrandColorHistoryEntry).brandColorHex) &&
				isValidAccentCount((entry as BrandColorHistoryEntry).accentCount) &&
				typeof (entry as BrandColorHistoryEntry).timestamp === "string",
		);
	} catch {
		// JSON.parseエラーやlocalStorageエラー
		return [];
	}
}

/**
 * 履歴をクリアする
 */
export function clearBrandColorHistory(): void {
	try {
		localStorage.removeItem(BRAND_COLOR_HISTORY_STORAGE_KEY);
	} catch {
		// localStorageが利用できない場合は無視
	}
}

/**
 * タイムスタンプを表示用フォーマットに変換する
 *
 * - 当日: HH:MM（例: 10:30）
 * - 別日: M/D HH:MM（例: 1/7 18:00）
 *
 * @param isoString ISO 8601形式のタイムスタンプ
 * @returns 表示用フォーマット
 */
export function formatHistoryTimestamp(isoString: string): string {
	try {
		const date = new Date(isoString);

		// Invalid Date チェック
		if (Number.isNaN(date.getTime())) {
			return "-";
		}

		const now = new Date();
		const isToday =
			date.getFullYear() === now.getFullYear() &&
			date.getMonth() === now.getMonth() &&
			date.getDate() === now.getDate();

		const hours = date.getHours();
		const minutes = date.getMinutes().toString().padStart(2, "0");

		if (isToday) {
			return `${hours}:${minutes}`;
		}

		const month = date.getMonth() + 1;
		const day = date.getDate();

		return `${month}/${day} ${hours}:${minutes}`;
	} catch {
		return "-";
	}
}
