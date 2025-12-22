/**
 * ブランドトークンID生成機能
 * brand-{namespace}-{role}-{shade}形式のIDを生成する
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * ブランドトークンID生成オプション
 */
export interface BrandTokenIdOptions {
	/** 名前空間（オプショナル） */
	namespace?: string;
	/** 役割（必須） */
	role: string;
	/** シェード値（デフォルト: 500） */
	shade?: number;
	/** 既存IDセット（重複チェック用） */
	existingIds?: Set<string>;
}

/**
 * 入力文字列をサニタイズする
 * - 小文字化
 * - スペースをハイフンに変換
 * - 非英数字・ハイフン以外を除去
 * - 連続ハイフンを単一ハイフンに
 * - 先頭・末尾のハイフンを除去
 *
 * @param input - サニタイズ対象の文字列
 * @returns サニタイズ済み文字列
 */
function sanitize(input: string): string {
	return input
		.toLowerCase() // 小文字化
		.replace(/\s+/g, "-") // スペースをハイフンに
		.replace(/[^a-z0-9-]/g, "") // 英数字とハイフン以外を除去
		.replace(/-+/g, "-") // 連続ハイフンを単一に
		.replace(/^-|-$/g, ""); // 先頭・末尾のハイフンを除去
}

/**
 * 一意なブランドトークンIDを生成する
 *
 * @param options - ID生成オプション
 * @returns 一意なブランドトークンID
 * @throws roleが空（サニタイズ後含む）の場合
 *
 * @example
 * ```ts
 * // 基本的な使用
 * generateBrandTokenId({ role: "primary" }); // "brand-primary-500"
 *
 * // 名前空間付き
 * generateBrandTokenId({ namespace: "acme", role: "accent", shade: 600 });
 * // "brand-acme-accent-600"
 *
 * // 重複回避
 * generateBrandTokenId({
 *   role: "primary",
 *   existingIds: new Set(["brand-primary-500"])
 * }); // "brand-primary-500-2"
 * ```
 */
export function generateBrandTokenId(options: BrandTokenIdOptions): string {
	const { namespace, role, shade = 500, existingIds } = options;

	// roleのサニタイズとバリデーション
	const sanitizedRole = sanitize(role);
	if (!sanitizedRole) {
		throw new Error("role is required");
	}

	// 名前空間のサニタイズ
	const sanitizedNamespace = namespace ? sanitize(namespace) : "";

	// ベースIDの構築
	const parts = ["brand"];
	if (sanitizedNamespace) {
		parts.push(sanitizedNamespace);
	}
	parts.push(sanitizedRole);
	parts.push(String(shade));

	const baseId = parts.join("-");

	// 重複チェックと一意ID生成
	if (!existingIds || !existingIds.has(baseId)) {
		return baseId;
	}

	// 重複がある場合はサフィックスを付加
	let suffix = 2;
	while (existingIds.has(`${baseId}-${suffix}`)) {
		suffix++;
	}

	return `${baseId}-${suffix}`;
}
