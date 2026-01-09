/**
 * CoolorsPaletteDisplay コンポーネント
 *
 * Coolors風のフルブリードカラム表示を実現するUIコンポーネント。
 * 各色を縦カラムで表示し、クリックでカラー詳細モーダルを開く。
 *
 * 高さはCSSで `height: min(50vh, 400px)` として定義。
 *
 * @module @/ui/components/coolors-palette-display
 */

/**
 * CoolorsPaletteDisplayのプロパティ
 */
export interface CoolorsPaletteDisplayProps {
	/** 表示する色の配列（HEX形式） */
	colors: string[];
	/** トークン名の配列（オプション） */
	tokenNames?: string[];
	/** DADSプリミティブトークン名の配列（オプション、例: "green-1200"） */
	primitiveNames?: string[];
	/** カラークリック時のコールバック（詳細モーダル表示用） */
	onColorClick: (hex: string, index: number) => void;
}

/**
 * CoolorsPaletteDisplayコンポーネントを作成する
 *
 * @param props コンポーネントのプロパティ
 * @returns 生成されたHTML要素
 */
export function createCoolorsPaletteDisplay(
	props: CoolorsPaletteDisplayProps,
): HTMLElement {
	const { colors, tokenNames, primitiveNames, onColorClick } = props;

	// コンテナ作成（スタイルはCSSで定義）
	const container = document.createElement("div");
	container.className = "coolors-display";

	// 各色のカラムを作成
	for (let i = 0; i < colors.length; i++) {
		const hex = colors[i];
		if (!hex) continue;

		const column = createColorColumn({
			hex,
			tokenName: tokenNames?.[i],
			primitiveName: primitiveNames?.[i],
			index: i,
			onColorClick,
		});
		container.appendChild(column);
	}

	return container;
}

/**
 * カラーカラムのプロパティ
 */
interface ColorColumnProps {
	hex: string;
	tokenName?: string;
	primitiveName?: string;
	index: number;
	onColorClick: (hex: string, index: number) => void;
}

/**
 * 単一のカラーカラムを作成する
 */
function createColorColumn(props: ColorColumnProps): HTMLElement {
	const { hex, tokenName, primitiveName, index, onColorClick } = props;

	const column = document.createElement("div");
	column.className = "coolors-column";
	column.style.backgroundColor = hex; // 動的な背景色のみインラインで設定

	// ホバー用のdata属性
	column.setAttribute("data-hoverable", "true");

	// アクセシビリティ属性
	column.setAttribute("role", "button");
	column.setAttribute("aria-label", `${hex} の詳細を表示`);
	column.setAttribute("tabindex", "0");

	// テキスト色を背景色に基づいて決定
	const textColor = getContrastTextColor(hex);

	// トークン名（オプション）
	if (tokenName) {
		const tokenLabel = document.createElement("span");
		tokenLabel.className = "coolors-column__token-name";
		tokenLabel.textContent = tokenName;
		tokenLabel.style.color = textColor; // 動的な色のみインラインで設定
		column.appendChild(tokenLabel);
	}

	// プリミティブトークン名（オプション、空文字列でない場合のみ表示）
	if (primitiveName) {
		const primitiveLabel = document.createElement("span");
		primitiveLabel.className = "coolors-column__primitive-name";
		primitiveLabel.textContent = primitiveName;
		primitiveLabel.style.color = textColor; // 動的な色のみインラインで設定
		column.appendChild(primitiveLabel);
	}

	// HEX値表示
	const hexLabel = document.createElement("span");
	hexLabel.className = "coolors-column__hex";
	hexLabel.textContent = hex.toUpperCase();
	hexLabel.style.color = textColor; // 動的な色のみインラインで設定
	column.appendChild(hexLabel);

	// クリックイベント
	column.addEventListener("click", () => {
		onColorClick(hex, index);
	});

	// キーボードイベント（Enter/Space）
	column.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onColorClick(hex, index);
		}
	});

	return column;
}

/**
 * 背景色に基づいてコントラストの高いテキスト色を返す
 *
 * @param hex 背景色のHEX値
 * @returns テキスト色（白または黒）
 */
function getContrastTextColor(hex: string): string {
	// HEXをRGBに変換
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	// 相対輝度を計算（簡易版）
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// 輝度が0.5より大きい場合は黒、それ以外は白
	return luminance > 0.5 ? "#000000" : "#ffffff";
}
