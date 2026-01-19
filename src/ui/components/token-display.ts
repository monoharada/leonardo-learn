/**
 * トークン表示コンポーネント
 *
 * DADSトークンとブランドトークンを視覚的に区別して表示する。
 * DADSトークンは鍵アイコン（参照専用）で保護され、
 * ブランドトークンは編集アイコンで編集可能であることを示す。
 *
 * Requirements: 12.3, 12.4
 *
 * タスク7.2: UIコンポーネントでのトークン表示と保護
 * - DADSトークンには鍵アイコン（参照専用）を表示
 * - ブランドトークンには編集アイコンを表示
 * - DADSトークンの編集コントロールを無効化
 * - 読み取り専用状態を視覚的に区別
 */

import type { BrandToken, ColorToken } from "../../core/tokens/types";
import { isBrandToken, isDadsToken } from "../../core/tokens/types";
import { checkTokenEditability } from "../guards/token-edit-guard";

/**
 * トークン表示オプション
 */
export interface TokenDisplayOptions {
	/** 編集ボタンを表示するか */
	showEditButton?: boolean;
	/** 色入力フィールドを表示するか */
	showColorInput?: boolean;
	/** DADS参照情報を表示するか（ブランドトークンのみ） */
	showDadsReference?: boolean;
	/** 編集ボタンクリック時のコールバック */
	onEdit?: (token: ColorToken) => void;
}

/**
 * HEX色をrgba形式に変換（alpha値付き）
 *
 * @param hex - HEX色コード（#RRGGBB形式）
 * @param alpha - 透明度（0-1）
 * @returns rgba形式の色文字列
 */
const hexToRgba = (hex: string, alpha?: number): string => {
	const normalizedHex = hex.replace("#", "");
	const r = parseInt(normalizedHex.slice(0, 2), 16);
	const g = parseInt(normalizedHex.slice(2, 4), 16);
	const b = parseInt(normalizedHex.slice(4, 6), 16);

	if (alpha !== undefined && alpha < 1) {
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	return hex;
};

/**
 * カラースウォッチ要素を作成する
 *
 * @param hex - HEX色コード
 * @param alpha - 透明度（オプション）
 * @returns スウォッチHTML要素
 */
const createColorSwatch = (hex: string, alpha?: number): HTMLElement => {
	const swatch = document.createElement("div");
	swatch.className = "token-color-swatch";

	const backgroundColor = hexToRgba(hex, alpha);

	swatch.style.cssText = `
		width: 32px;
		height: 32px;
		border-radius: 4px;
		background-color: ${backgroundColor};
		border: 1px solid rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	`;

	return swatch;
};

/**
 * トークンアイコン要素を作成する
 *
 * checkTokenEditabilityからのメッセージを使用して一貫性を確保
 *
 * @param token - カラートークン
 * @returns アイコンHTML要素
 */
const createTokenIcon = (token: ColorToken): HTMLElement => {
	const icon = document.createElement("span");
	icon.className = "token-icon";

	const guard = checkTokenEditability(token);

	if (!guard.canEdit) {
		icon.textContent = "🔒";
		// checkTokenEditabilityのreason/suggestionを使用（Requirements 12.1, 12.2との整合性）
		const reasonText = guard.reason ?? "編集できません";
		const suggestionText = guard.suggestion ? `\n💡 ${guard.suggestion}` : "";
		icon.title = `参照専用: ${reasonText}${suggestionText}`;
	} else {
		icon.textContent = "✏️";
		icon.title = "編集可能: このトークンは編集できます";
	}

	icon.style.cssText = `
		font-size: 16px;
		cursor: help;
	`;

	return icon;
};

/**
 * ステータスラベル要素を作成する
 *
 * @param isReadonly - 読み取り専用かどうか
 * @returns ラベルHTML要素
 */
const createStatusLabel = (isReadonly: boolean): HTMLElement => {
	const label = document.createElement("span");
	label.className = "token-status-label";

	label.textContent = isReadonly ? "参照専用" : "編集可能";
	label.style.cssText = `
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		background-color: ${isReadonly ? "#e9ecef" : "#d4edda"};
		color: ${isReadonly ? "#495057" : "#155724"};
		margin-left: 8px;
	`;

	return label;
};

/**
 * 編集ボタン要素を作成する
 *
 * @param token - カラートークン
 * @param isReadonly - 読み取り専用かどうか
 * @param onEdit - 編集時のコールバック
 * @returns ボタンHTML要素
 */
const createEditButton = (
	token: ColorToken,
	isReadonly: boolean,
	onEdit?: (token: ColorToken) => void,
): HTMLButtonElement => {
	const button = document.createElement("button");
	button.className = "token-edit-button";
	button.textContent = "編集";
	button.type = "button";

	button.disabled = isReadonly;

	if (isReadonly) {
		button.style.cssText = `
			padding: 4px 8px;
			font-size: 12px;
			border: 1px solid #ccc;
			border-radius: 4px;
			background: #f8f9fa;
			cursor: not-allowed;
			opacity: 0.5;
		`;
		// テスト/実装ともにdisabledスタイルを確実化
		button.style.cursor = "not-allowed";
		button.style.opacity = "0.5";
	} else {
		button.style.cssText = `
			padding: 4px 8px;
			font-size: 12px;
			border: 1px solid #007bff;
			border-radius: 4px;
			background: #007bff;
			color: white;
			cursor: pointer;
		`;

		button.addEventListener("click", () => {
			if (onEdit) {
				onEdit(token);
			}
		});
	}

	return button;
};

/**
 * 色入力フィールド要素を作成する
 *
 * @param hex - 初期値のHEX色コード
 * @param isReadonly - 読み取り専用かどうか
 * @returns 入力フィールドHTML要素
 */
const createColorInput = (
	hex: string,
	isReadonly: boolean,
): HTMLInputElement => {
	const input = document.createElement("input");
	input.className = "token-color-input";
	input.type = "text";
	input.value = hex;
	input.readOnly = isReadonly;

	input.style.cssText = `
		width: 80px;
		padding: 4px 8px;
		font-size: 12px;
		font-family: monospace;
		border: 1px solid ${isReadonly ? "#ced4da" : "#007bff"};
		border-radius: 4px;
		background: ${isReadonly ? "#f8f9fa" : "white"};
		${isReadonly ? "cursor: not-allowed;" : ""}
	`;

	return input;
};

/**
 * DADS参照情報要素を作成する（ブランドトークン用）
 *
 * セキュリティ考慮: innerHTMLではなくDOM組み立てを使用
 *
 * @param token - ブランドトークン
 * @returns 参照情報HTML要素
 */
const createDadsReferenceInfo = (token: BrandToken): HTMLElement => {
	const container = document.createElement("div");
	container.className = "token-dads-reference";

	container.style.cssText = `
		font-size: 11px;
		color: #6c757d;
		margin-top: 4px;
		padding: 4px 8px;
		background: #f8f9fa;
		border-radius: 3px;
		display: flex;
		gap: 8px;
	`;

	const ref = token.dadsReference;

	// DOM組み立てを使用（innerHTMLの代わり）
	const tokenIdSpan = document.createElement("span");
	tokenIdSpan.textContent = `DADS参照: ${ref.tokenId}`;
	container.appendChild(tokenIdSpan);

	const deltaESpan = document.createElement("span");
	deltaESpan.textContent = `ΔE: ${ref.deltaE.toFixed(1)}`;
	container.appendChild(deltaESpan);

	const derivationSpan = document.createElement("span");
	derivationSpan.textContent = `派生: ${ref.derivationType}`;
	container.appendChild(derivationSpan);

	return container;
};

/**
 * トークン表示用のHTML要素を生成する
 *
 * @param token - 表示するカラートークン（DadsToken | BrandToken）
 * @param options - 表示オプション
 * @returns トークン表示用HTML要素
 *
 * @example
 * ```ts
 * // DADSトークンの表示
 * const dadsElement = createTokenDisplay(dadsToken);
 * // 鍵アイコン、参照専用ラベル、編集不可スタイル
 *
 * // ブランドトークンの編集可能表示
 * const brandElement = createTokenDisplay(brandToken, {
 *   showEditButton: true,
 *   onEdit: (token) => console.log('Editing', token.id)
 * });
 * // 編集アイコン、編集可能ラベル、編集ボタン有効
 * ```
 */
export function createTokenDisplay(
	token: ColorToken,
	options: TokenDisplayOptions = {},
): HTMLElement {
	const {
		showEditButton = false,
		showColorInput = false,
		showDadsReference = false,
		onEdit,
	} = options;

	const isReadonly = isDadsToken(token);

	// メインコンテナ
	const container = document.createElement("div");
	container.className = `token-display ${isReadonly ? "token-display--readonly" : "token-display--editable"}`;

	// data属性の設定
	container.setAttribute("data-source", token.source);
	container.setAttribute("data-readonly", String(isReadonly));

	// アクセシビリティ属性
	container.setAttribute("aria-readonly", String(isReadonly));
	container.setAttribute("role", "listitem");

	// スタイル設定
	container.style.cssText = `
		display: flex;
		flex-direction: column;
		padding: 12px;
		border-radius: 8px;
		background-color: ${isReadonly ? "rgb(248, 249, 250)" : "white"};
		border: 1px solid ${isReadonly ? "#dee2e6" : "#007bff"};
		margin-bottom: 8px;
	`;

	// ヘッダー行（アイコン、ID、ステータスラベル）
	const headerRow = document.createElement("div");
	headerRow.style.cssText = `
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	`;

	headerRow.appendChild(createTokenIcon(token));

	const idSpan = document.createElement("span");
	idSpan.className = "token-id";
	idSpan.textContent = token.id;
	idSpan.style.cssText = `
		font-weight: 600;
		font-family: monospace;
		font-size: 14px;
	`;
	headerRow.appendChild(idSpan);

	headerRow.appendChild(createStatusLabel(isReadonly));

	container.appendChild(headerRow);

	// コンテンツ行（スウォッチ、HEX値、日本語名）
	const contentRow = document.createElement("div");
	contentRow.style.cssText = `
		display: flex;
		align-items: center;
		gap: 12px;
	`;

	// alpha値の取得
	const alpha = "alpha" in token ? token.alpha : undefined;
	contentRow.appendChild(createColorSwatch(token.hex, alpha));

	const infoContainer = document.createElement("div");
	infoContainer.style.cssText = `
		display: flex;
		flex-direction: column;
		gap: 2px;
	`;

	const hexSpan = document.createElement("span");
	hexSpan.className = "token-hex";
	hexSpan.textContent = token.hex;
	hexSpan.style.cssText = `
		font-family: monospace;
		font-size: 14px;
		color: #333;
	`;
	infoContainer.appendChild(hexSpan);

	// DADSトークンの場合は日本語名を表示
	if (isDadsToken(token)) {
		const nameSpan = document.createElement("span");
		nameSpan.className = "token-name-ja";
		nameSpan.textContent = token.nameJa;
		nameSpan.style.cssText = `
			font-size: 12px;
			color: #6c757d;
		`;
		infoContainer.appendChild(nameSpan);
	}

	contentRow.appendChild(infoContainer);

	// 色入力フィールド（オプション）
	if (showColorInput) {
		contentRow.appendChild(createColorInput(token.hex, isReadonly));
	}

	// 編集ボタン（オプション）
	if (showEditButton) {
		const buttonContainer = document.createElement("div");
		buttonContainer.style.cssText = `margin-left: auto;`;
		buttonContainer.appendChild(createEditButton(token, isReadonly, onEdit));
		contentRow.appendChild(buttonContainer);
	}

	container.appendChild(contentRow);

	// DADS参照情報（ブランドトークンのみ、オプション）
	if (showDadsReference && isBrandToken(token)) {
		container.appendChild(createDadsReferenceInfo(token));
	}

	return container;
}

/**
 * 複数トークンのリスト表示用要素を生成する
 *
 * @param tokens - 表示するトークンの配列
 * @param options - 表示オプション
 * @returns リスト表示用HTML要素
 *
 * @example
 * ```ts
 * const tokens = [dadsToken, brandToken];
 * const listElement = createTokenDisplayList(tokens, {
 *   showEditButton: true,
 *   onEdit: (token) => console.log('Editing', token.id)
 * });
 * document.body.appendChild(listElement);
 * ```
 */
export function createTokenDisplayList(
	tokens: ColorToken[],
	options: TokenDisplayOptions = {},
): HTMLElement {
	const container = document.createElement("div");
	container.className = "token-display-list";
	container.setAttribute("role", "list");

	container.style.cssText = `
		display: flex;
		flex-direction: column;
		gap: 8px;
	`;

	for (const token of tokens) {
		container.appendChild(createTokenDisplay(token, options));
	}

	return container;
}
