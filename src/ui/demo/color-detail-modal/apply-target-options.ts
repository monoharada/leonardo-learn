import type { ManualApplyTarget, ManualColorSelection } from "../types";

/** ドロップダウンオプションのラベルマッピング */
const APPLY_TARGET_LABELS: Record<ManualApplyTarget, string> = {
	key: "キーカラー",
	secondary: "セカンダリー",
	tertiary: "ターシャリー",
	"accent-1": "アクセント 1",
	"accent-2": "アクセント 2",
	"accent-3": "アクセント 3",
	"accent-4": "アクセント 4",
};

/**
 * 適用先に対応する既存の色を取得する
 *
 * @param selection マニュアル選択状態
 * @param target 適用先
 * @returns 既存の色（HEX）またはnull
 */
function getColorForTarget(
	selection: ManualColorSelection,
	target: ManualApplyTarget,
): string | null {
	switch (target) {
		case "key":
			return selection.keyColor;
		case "secondary":
			return selection.secondaryColor;
		case "tertiary":
			return selection.tertiaryColor;
		case "accent-1":
			return selection.accentColors[0] ?? null;
		case "accent-2":
			return selection.accentColors[1] ?? null;
		case "accent-3":
			return selection.accentColors[2] ?? null;
		case "accent-4":
			return selection.accentColors[3] ?? null;
		default:
			return null;
	}
}

/**
 * 現在の選択状態に基づいて利用可能な適用先を取得する
 *
 * - キー/セカンダリ/ターシャリは常に選択可能
 * - アクセントは連続的に選択可能（accent-1が空ならaccent-2以降は選択不可）
 * - 既に埋まっているスロットは上書き可能
 *
 * @param selection 現在のマニュアル選択状態
 * @returns 利用可能な適用先の配列
 */
function getAvailableApplyTargets(
	selection: ManualColorSelection,
): ManualApplyTarget[] {
	const targets: ManualApplyTarget[] = ["key", "secondary", "tertiary"];

	// 埋まっているアクセントを追加（上書き可能）
	const filledAccents = selection.accentColors
		.map((c, i) =>
			c !== null ? (`accent-${i + 1}` as ManualApplyTarget) : null,
		)
		.filter((t): t is ManualApplyTarget => t !== null);

	targets.push(...filledAccents);

	// 次の空きスロットを追加（連続性を維持）
	const firstEmptyIndex = selection.accentColors.indexOf(null);
	if (firstEmptyIndex !== -1 && firstEmptyIndex < 4) {
		const nextTarget = `accent-${firstEmptyIndex + 1}` as ManualApplyTarget;
		if (!targets.includes(nextTarget)) {
			targets.push(nextTarget);
		}
	}

	return targets;
}

/**
 * オプション要素に既存色のスタイルとスウォッチを適用する
 *
 * Chrome 134+ / Edge 134+ では appearance: base-select により
 * option内に任意のHTML要素（カラースウォッチ）を配置可能
 *
 * @param option オプション要素
 * @param selection マニュアル選択状態
 * @param target 適用先
 */
function applyColorStyleToOption(
	option: HTMLOptionElement,
	selection: ManualColorSelection,
	target: ManualApplyTarget,
): void {
	const existingColor = getColorForTarget(selection, target);
	if (existingColor) {
		// カラースウォッチを作成（Chrome 134+ / Edge 134+）
		const swatch = document.createElement("span");
		swatch.className = "dads-color-swatch";
		swatch.style.backgroundColor = existingColor;

		// オプションの内容をクリアしてスウォッチとテキストを追加
		option.textContent = "";
		option.appendChild(swatch);
		option.appendChild(
			document.createTextNode(
				` ${APPLY_TARGET_LABELS[target]} (${existingColor.toUpperCase()})`,
			),
		);
	}
}

/**
 * ドロップダウンのオプションを動的に生成する
 *
 * @param select ドロップダウン要素
 * @param selection 現在のマニュアル選択状態
 * @param preSelectedTarget 事前選択された適用先
 */
export function populateApplyTargetOptions(
	select: HTMLSelectElement,
	selection: ManualColorSelection,
	preSelectedTarget?: ManualApplyTarget,
): void {
	// 既存のオプションをクリア
	select.innerHTML = "";

	// デフォルトオプションを追加
	const defaultOption = document.createElement("option");
	defaultOption.value = "";
	defaultOption.textContent = "-- 選択してください --";
	select.appendChild(defaultOption);

	// 利用可能な適用先を取得
	const availableTargets = getAvailableApplyTargets(selection);

	// 基本カラー（key/secondary/tertiary）のオプションを追加
	const basicTargets: ManualApplyTarget[] = ["key", "secondary", "tertiary"];
	for (const target of basicTargets) {
		const option = document.createElement("option");
		option.value = target;
		option.textContent = APPLY_TARGET_LABELS[target];
		applyColorStyleToOption(option, selection, target);
		select.appendChild(option);
	}

	// アクセントカラーのオプションを追加（optgroup内）
	const accentTargets = availableTargets.filter((t) => t.startsWith("accent-"));
	if (accentTargets.length > 0) {
		const optgroup = document.createElement("optgroup");
		optgroup.label = "アクセント";

		for (const target of accentTargets) {
			const option = document.createElement("option");
			option.value = target;
			option.textContent = APPLY_TARGET_LABELS[target];
			applyColorStyleToOption(option, selection, target);
			optgroup.appendChild(option);
		}

		select.appendChild(optgroup);
	}

	// 事前選択を適用
	if (preSelectedTarget && availableTargets.includes(preSelectedTarget)) {
		select.value = preSelectedTarget;
	}
}
